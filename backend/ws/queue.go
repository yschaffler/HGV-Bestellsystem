package ws

import (
	"sync"
	"time"
)

type OrderItem struct {
	Name     string  `json:"name"`
	Quantity int     `json:"quantity"`
	Price    float64 `json:"price"`
	Note     string  `json:"note,omitempty"`
}

type PrintJob struct {
	OrderID    int         `json:"order_id"`
	JobType    string      `json:"job_type"` // "RECHNUNG" or "STORNO"
	Table      int         `json:"table"`
	WaiterName string      `json:"waiter_name,omitempty"`
	Items      []OrderItem `json:"items"`
	Note       string      `json:"note,omitempty"`
	EnqueuedAt time.Time   `json:"enqueued_at"`
}

type printQueue struct {
	mu      sync.Mutex
	pending []*PrintJob
	nextID  int
}

func newPrintQueue() *printQueue {
	return &printQueue{nextID: 1}
}

func (q *printQueue) Add(job *PrintJob) {
	q.mu.Lock()
	defer q.mu.Unlock()
	if job.OrderID == 0 {
		job.OrderID = q.nextID
		q.nextID++
	}
	if job.EnqueuedAt.IsZero() {
		job.EnqueuedAt = time.Now()
	}
	q.pending = append(q.pending, job)
}

func (q *printQueue) Pending() []*PrintJob {
	q.mu.Lock()
	defer q.mu.Unlock()
	result := make([]*PrintJob, len(q.pending))
	copy(result, q.pending)
	return result
}

func (q *printQueue) Ack(orderID int) {
	q.mu.Lock()
	defer q.mu.Unlock()
	for i, job := range q.pending {
		if job.OrderID == orderID {
			q.pending = append(q.pending[:i], q.pending[i+1:]...)
			return
		}
	}
}

func (q *printQueue) Delete(orderID int) bool {
	q.mu.Lock()
	defer q.mu.Unlock()
	for i, job := range q.pending {
		if job.OrderID == orderID {
			q.pending = append(q.pending[:i], q.pending[i+1:]...)
			return true
		}
	}
	return false
}

func (q *printQueue) Find(orderID int) *PrintJob {
	q.mu.Lock()
	defer q.mu.Unlock()
	for _, job := range q.pending {
		if job.OrderID == orderID {
			return job
		}
	}
	return nil
}
