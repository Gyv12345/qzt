package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/middleware"
	"qzt-go-server/internal/pkg/sse"
)

// sse.go OA SSE 实时推送 handler(从 enterprise 迁移)。

type SSEHandler struct{}

func NewSSEHandler() *SSEHandler { return &SSEHandler{} }

// MessageStream SSE 消息流(GET /oa/messages/stream)
// @Summary      SSE 消息流
// @Tags         OA-站内信
// @Produce      json
// @Security     BearerAuth
// @Success      200  {string}  text/event-stream
// @Router       /oa/messages/stream [get]
func (h *SSEHandler) MessageStream(c *gin.Context) {
	userID := middleware.GetUserID(c)

	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("X-Accel-Buffering", "no")

	flusher, ok := c.Writer.(http.Flusher)
	if !ok {
		c.String(http.StatusInternalServerError, "streaming not supported")
		return
	}

	ch := sse.Global.Register(userID)
	defer sse.Global.Unregister(userID, ch)

	fmt.Fprintf(c.Writer, "event: connected\ndata: {\"status\":\"connected\"}\n\n")
	flusher.Flush()

	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	ctx := c.Request.Context()

	for {
		select {
		case <-ctx.Done():
			return
		case msg, ok := <-ch:
			if !ok {
				return
			}
			data, _ := json.Marshal(msg)
			fmt.Fprintf(c.Writer, "event: message\ndata: %s\n\n", data)
			flusher.Flush()
		case <-ticker.C:
			fmt.Fprintf(c.Writer, ": heartbeat\n\n")
			flusher.Flush()
		}
	}
}
