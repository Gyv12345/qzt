package service

import (
	"context"
	"sync"

	"github.com/gorilla/websocket"

	"qzt-go-server/internal/repository"
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

// SaveSnapshot 保存文档快照到 DB(内容 + 版本历史)。
func SaveSnapshot(ctx context.Context, docID uint, editorID uint, content string) error {
	db := repository.DBFrom(ctx)

	// 更新文档内容
	if err := db.Table("kb_document").Where("id = ?", docID).
		Updates(map[string]any{
			"content":        content,
			"last_editor_id": editorID,
			"updated_at":     "NOW()",
		}).Error; err != nil {
		return err
	}

	// 创建版本历史
	var maxVer int
	db.Table("kb_version").Where("document_id = ?", docID).Select("COALESCE(MAX(version_number), 0)").Scan(&maxVer)
	return db.Table("kb_version").Create(map[string]any{
		"document_id":    docID,
		"content":        content,
		"editor_id":      editorID,
		"version_number": maxVer + 1,
		"created_at":     "NOW()",
	}).Error
}
