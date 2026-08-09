// Package sse 提供进程内用户级 SSE 连接管理。
//
// 设计:每个用户可以有多个 SSE 连接(多标签页),消息通过 buffered channel
// 非阻塞推送。适用于单进程部署;多实例时需迁移到 Redis Pub/Sub。
package sse

import (
	"sync"

	"qzt-go-server/pkg/xlogger"
)

// Message SSE 推送的消息体。
type Message struct {
	Event string `json:"event"` // 事件类型(message/notice)
	Title string `json:"title"`
	Body  string `json:"body"`
	Path  string `json:"path"` // 点击跳转路径
}

// Hub 用户级 SSE 连接管理器(全局单例)。
type Hub struct {
	mu     sync.RWMutex
	users  map[uint][]chan Message // userID → 该用户的所有连接 channel
}

// Global 全局 Hub 实例。
var Global = &Hub{users: make(map[uint][]chan Message)}

// Register 注册一个用户的 SSE 连接,返回接收 channel。
// 调用方需在连接断开时调用 Unregister 清理。
func (h *Hub) Register(userID uint) chan Message {
	ch := make(chan Message, 16)
	h.mu.Lock()
	h.users[userID] = append(h.users[userID], ch)
	h.mu.Unlock()
	return ch
}

// Unregister 注销一个连接。
func (h *Hub) Unregister(userID uint, ch chan Message) {
	h.mu.Lock()
	defer h.mu.Unlock()
	channels := h.users[userID]
	for i, c := range channels {
		if c == ch {
			h.users[userID] = append(channels[:i], channels[i+1:]...)
			close(c)
			break
		}
	}
	if len(h.users[userID]) == 0 {
		delete(h.users, userID)
	}
}

// Push 向某用户的所有连接推送消息(非阻塞)。
func (h *Hub) Push(userID uint, msg Message) {
	h.mu.RLock()
	channels := h.users[userID]
	h.mu.RUnlock()

	for _, ch := range channels {
		select {
		case ch <- msg:
		default:
			// channel 满了(客户端慢),丢弃这条消息避免阻塞
			xlogger.InfofCtx(nil, "SSE channel full, dropping message for user %d", userID)
		}
	}
}
