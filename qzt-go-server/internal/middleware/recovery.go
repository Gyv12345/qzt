package middleware

import (
	"errors"
	"fmt"
	"net"
	"net/http/httputil"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	e "qzt-go-server/pkg/xerror"
	"qzt-go-server/pkg/xlogger"
	"qzt-go-server/pkg/xresponse"
	"qzt-go-server/pkg/xtrace"
)

// Recovery 捕获 handler 链中的 panic，返回标准化 500 响应并记录堆栈。
// 对 broken pipe / connection reset 这类连接已中断的错误，只记日志不写响应
// （此时写响应会再次 panic）。
func Recovery() gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if r := recover(); r != nil {
				var err error
				switch v := r.(type) {
				case error:
					err = v
				default:
					err = fmt.Errorf("panic: %v", v)
				}

				// 检测 broken pipe 类错误（支持错误链）
				var brokenPipe bool
				var ne *net.OpError
				var se *os.SyscallError
				if errors.As(err, &ne) && errors.As(ne.Err, &se) {
					msg := strings.ToLower(se.Error())
					brokenPipe = strings.Contains(msg, "broken pipe") ||
						strings.Contains(msg, "connection reset by peer")
				}

				// 记录请求详情（不 dump body，避免敏感信息落日志）
				httpRequest, _ := httputil.DumpRequest(c.Request, false)

				logFields := []zap.Field{
					zap.Error(err),
					zap.String("method", c.Request.Method),
					zap.String("path", c.Request.URL.Path),
					zap.String("query", c.Request.URL.RawQuery),
					zap.String("ip", c.ClientIP()),
					zap.String("trace_id", xtrace.GetTraceID(c.Request.Context())),
					zap.String("user_agent", c.Request.UserAgent()),
					zap.ByteString("request", httpRequest),
				}

				if brokenPipe {
					xlogger.Error("[Broken Connection] " + c.Request.URL.Path, logFields...)
					_ = c.Error(err) // 标记错误但不写响应
					c.Abort()
					return
				}

				logFields = append(logFields, zap.Stack("stack"))
				xlogger.Error("[Recovery from panic]", logFields...)
				xresponse.FailByError(c, e.HttpInternalServerError)
				c.Abort()
			}
		}()
		c.Next()
	}
}
