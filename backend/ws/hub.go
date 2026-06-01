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

type Hub struct {
	secret string
	mu     sync.Mutex
	conns  map[string]*websocket.Conn
	queues map[string]*printQueue
}

func NewHub(secret string) *Hub {
	return &Hub{
		secret: secret,
		conns:  make(map[string]*websocket.Conn),
		queues: make(map[string]*printQueue),
	}
}

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

func (h *Hub) sendJob(conn *websocket.Conn, job *PrintJob) {
	data, _ := json.Marshal(outMessage{Type: "print_job", Payload: job})
	if err := conn.WriteMessage(websocket.TextMessage, data); err != nil {
		log.Printf("ws send error: %v", err)
	}
}

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
