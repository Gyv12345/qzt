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

// SSEHandler SSE 实时推送 handler。
type SSEHandler struct{}

func NewSSEHandler() *SSEHandler { return &SSEHandler{} }

// MessageStream SSE 消息流(GET /enterprise/messages/stream)
// @Summary      SSE 消息流
// @Description  服务端推送事件流,实时接收站内信通知
// @Tags         站内信
// @Produce      json
// @Security     BearerAuth
// @Success      200  {string}  text/event-stream
// @Router       /enterprise/messages/stream [get]
func (h *SSEHandler) MessageStream(c *gin.Context) {
	userID := middleware.GetUserID(c)

	// 设置 SSE 响应头
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("X-Accel-Buffering", "no") // nginx 不缓冲

	flusher, ok := c.Writer.(http.Flusher)
	if !ok {
		c.String(http.StatusInternalServerError, "streaming not supported")
		return
	}

	// 注册 SSE 连接
	ch := sse.Global.Register(userID)
	defer sse.Global.Unregister(userID, ch)

	// 发送初始连接成功事件
	fmt.Fprintf(c.Writer, "event: connected\ndata: {\"status\":\"connected\"}\n\n")
	flusher.Flush()

	// 心跳 + 消息分发
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	ctx := c.Request.Context()

	for {
		select {
		case <-ctx.Done():
			// 客户端断开
			return

		case msg, ok := <-ch:
			if !ok {
				return
			}
			data, _ := json.Marshal(msg)
			fmt.Fprintf(c.Writer, "event: message\ndata: %s\n\n", data)
			flusher.Flush()

		case <-ticker.C:
			// 心跳保活(注释行,不触发前端事件)
			fmt.Fprintf(c.Writer, ": heartbeat\n\n")
			flusher.Flush()
		}
	}
}
