package middleware

import (
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"qzt-go-server/pkg/xauth"
	"qzt-go-server/pkg/xtrace"
)

// Trace 为每个请求生成/透传 trace_id，写入 gin context、request context 与响应头。
// 优先级：客户端透传的 X-Trace-Id 头 > 自动生成（去掉连字符的 UUID）。
// trace_id 贯穿日志与操作审计，便于跨请求/跨模块关联问题。
func Trace() gin.HandlerFunc {
	return func(c *gin.Context) {
		var traceID string
		if tid := c.GetHeader(xauth.XTraceIDHeader); tid != "" {
			traceID = tid
		} else {
			traceID = strings.ReplaceAll(uuid.New().String(), "-", "")
		}

		c.Set(xauth.XTraceId, traceID)
		if c.Writer.Header().Get(xauth.XTraceIDHeader) == "" {
			c.Writer.Header().Set(xauth.XTraceIDHeader, traceID)
		}
		// 同时写入标准 context，使 service/repository 通过 ctx 取到 trace_id
		c.Request = c.Request.WithContext(xtrace.NewContextWithTrace(c.Request.Context(), traceID))

		c.Next()
	}
}
