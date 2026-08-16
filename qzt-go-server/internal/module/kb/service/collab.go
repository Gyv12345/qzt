package service

import (
	"context"
	"sync"

	"github.com/gorilla/websocket"

	kbrepo "qzt-go-server/internal/repository/kb"
	"qzt-go-server/pkg/xlogger"
)

// CollabHub 文档协同编辑 WebSocket 连接管理器。
// 每个文档一个"房间",房间内的连接互相广播 Yjs update。
type CollabHub struct {
	mu     sync.RWMutex
	rooms  map[uint]map[*websocket.Conn]bool // docID → 连接集合
}

// GlobalCollab 全局协同 Hub。
var GlobalCollab = &CollabHub{rooms: make(map[uint]map[*websocket.Conn]bool)}

// Join 加入文档房间。
func (h *CollabHub) Join(docID uint, conn *websocket.Conn) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.rooms[docID] == nil {
		h.rooms[docID] = make(map[*websocket.Conn]bool)
	}
	h.rooms[docID][conn] = true
}

// Leave 离开文档房间。
func (h *CollabHub) Leave(docID uint, conn *websocket.Conn) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if room, ok := h.rooms[docID]; ok {
		delete(room, conn)
		if len(room) == 0 {
			delete(h.rooms, docID)
		}
	}
}

// Broadcast 向文档房间内除 sender 外的所有连接广播消息。
func (h *CollabHub) Broadcast(docID uint, sender *websocket.Conn, msgType int, data []byte) {
	h.mu.RLock()
	room := h.rooms[docID]
	conns := make([]*websocket.Conn, 0, len(room))
	for conn := range room {
		if conn != sender {
			conns = append(conns, conn)
		}
	}
	h.mu.RUnlock()

	for _, conn := range conns {
		if err := conn.WriteMessage(msgType, data); err != nil {
			xlogger.ErrorfCtx(context.Background(), "kb collab broadcast error: %v", err)
		}
	}
}

// SaveSnapshot 保存文档快照到 DB(内容 + 版本历史,收口在 repository/kb)。
func SaveSnapshot(ctx context.Context, docID uint, editorID uint, content string) error {
	return kbrepo.NewDocumentRepo().SaveSnapshot(ctx, docID, editorID, content)
}
