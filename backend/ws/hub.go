package ws

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

type outMessage struct {
	Type    string    `json:"type"`
	Payload *PrintJob `json:"payload"`
}

type ackMessage struct {
	Type    string `json:"type"`
	OrderID int    `json:"order_id"`
}

// QueueInfo represents the state of a single printer's queue.
type QueueInfo struct {
	Bar       string      `json:"bar"`
	Connected bool        `json:"connected"`
	Jobs      []*PrintJob `json:"jobs"`
}

//A hub is used to send the individual printer jobs to the corresponding printer via websockets
type Hub struct {
	secret string
	mu     sync.Mutex
	conns  map[string]*websocket.Conn
	queues map[string]*printQueue
}

//creates a new hub with a specified secret
func NewHub(secret string) *Hub {
	return &Hub{
		secret: secret,
		conns:  make(map[string]*websocket.Conn),
		queues: make(map[string]*printQueue),
	}
}

//returns the queue corresponding to the bar specified in the parameter
func (h *Hub) getQueue(bar string) *printQueue {
	if q, ok := h.queues[bar]; ok {
		return q
	}
	q := newPrintQueue()
	h.queues[bar] = q
	return q
}

// EnqueueAndSend adds a job to the bar's queue and sends it immediately if the
// client is connected. It is safe to call from multiple goroutines.
func (h *Hub) EnqueueAndSend(bar string, job *PrintJob) {
	h.mu.Lock()
	q := h.getQueue(bar)
	q.Add(job)
	conn := h.conns[bar]
	h.mu.Unlock()

	if conn != nil {
		h.sendJob(conn, job)
	}
}

//sends the printer job via the connection specified in the parameters
func (h *Hub) sendJob(conn *websocket.Conn, job *PrintJob) {
	data, _ := json.Marshal(outMessage{Type: "print_job", Payload: job})
	if err := conn.WriteMessage(websocket.TextMessage, data); err != nil {
		log.Printf("ws send error: %v", err)
	}
}

// GetAllQueueStatus returns the status of all known printer queues.
func (h *Hub) GetAllQueueStatus() []QueueInfo {
	h.mu.Lock()
	defer h.mu.Unlock()

	seen := make(map[string]bool)
	var result []QueueInfo

	for bar, q := range h.queues {
		seen[bar] = true
		jobs := q.Pending()
		if jobs == nil {
			jobs = []*PrintJob{}
		}
		result = append(result, QueueInfo{
			Bar:       bar,
			Connected: h.conns[bar] != nil,
			Jobs:      jobs,
		})
	}
	// Include connected bars that have no queued jobs yet
	for bar := range h.conns {
		if !seen[bar] {
			result = append(result, QueueInfo{
				Bar:       bar,
				Connected: true,
				Jobs:      []*PrintJob{},
			})
		}
	}
	return result
}

// DeleteJob removes a pending job from a bar's queue without printing it.
func (h *Hub) DeleteJob(bar string, orderID int) bool {
	h.mu.Lock()
	q := h.queues[bar]
	h.mu.Unlock()
	if q == nil {
		return false
	}
	return q.Delete(orderID)
}

// ResendJob re-sends an existing pending job to the bar client if connected.
// Returns false if the job was not found or bar is not connected.
func (h *Hub) ResendJob(bar string, orderID int) bool {
	h.mu.Lock()
	q := h.queues[bar]
	conn := h.conns[bar]
	h.mu.Unlock()
	if q == nil || conn == nil {
		return false
	}
	job := q.Find(orderID)
	if job == nil {
		return false
	}
	h.sendJob(conn, job)
	return true
}

// StaleQueues returns bars that have jobs older than the given threshold and
// whose printer client is currently not connected.
func (h *Hub) StaleQueues(threshold time.Duration) []QueueInfo {
	h.mu.Lock()
	defer h.mu.Unlock()

	var result []QueueInfo
	now := time.Now()
	for bar, q := range h.queues {
		if h.conns[bar] != nil {
			continue
		}
		jobs := q.Pending()
		if len(jobs) == 0 {
			continue
		}
		oldest := jobs[0].EnqueuedAt
		for _, j := range jobs[1:] {
			if j.EnqueuedAt.Before(oldest) {
				oldest = j.EnqueuedAt
			}
		}
		if now.Sub(oldest) >= threshold {
			cp := make([]*PrintJob, len(jobs))
			copy(cp, jobs)
			result = append(result, QueueInfo{
				Bar:       bar,
				Connected: false,
				Jobs:      cp,
			})
		}
	}
	return result
}

//this function is responsible for listening for and then upgrading the incoming http request to a websocket connection
func (h *Hub) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.URL.Query().Get("secret") != h.secret {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	bar := r.URL.Query().Get("bar")
	if bar == "" {
		http.Error(w, "missing bar parameter", http.StatusBadRequest)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("ws upgrade error: %v", err)
		return
	}
	log.Printf("printer client connected: bar=%q", bar)

	h.mu.Lock()
	if old, ok := h.conns[bar]; ok {
		old.WriteMessage(websocket.CloseMessage,
			websocket.FormatCloseMessage(websocket.CloseNormalClosure, "replaced"))
		old.Close()
	}
	h.conns[bar] = conn
	pending := h.getQueue(bar).Pending()
	h.mu.Unlock()

	for _, job := range pending {
		h.sendJob(conn, job)
	}

	conn.SetReadDeadline(time.Now().Add(70 * time.Second))
	conn.SetPongHandler(func(string) error {
		conn.SetReadDeadline(time.Now().Add(70 * time.Second))
		return nil
	})

	go h.pingLoop(bar, conn)

	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			break
		}
		var ack ackMessage
		if err := json.Unmarshal(msg, &ack); err == nil && ack.Type == "ack" {
			h.mu.Lock()
			q := h.getQueue(bar)
			h.mu.Unlock()
			q.Ack(ack.OrderID)
			log.Printf("ack received: bar=%q order_id=%d", bar, ack.OrderID)
		}
	}

	h.mu.Lock()
	if h.conns[bar] == conn {
		delete(h.conns, bar)
	}
	h.mu.Unlock()
	conn.Close()
	log.Printf("printer client disconnected: bar=%q", bar)
}

//periodically sends a packet to a connected bar to make sure its still alive
func (h *Hub) pingLoop(bar string, conn *websocket.Conn) {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()
	for range ticker.C {
		h.mu.Lock()
		active := h.conns[bar] == conn
		h.mu.Unlock()
		if !active {
			return
		}
		if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
			return
		}
	}
}
