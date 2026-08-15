package middleware

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"mime"
	"net/http"
	"net/url"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/tidwall/gjson"
	"github.com/tidwall/sjson"
	"go.uber.org/zap"

	"qzt-go-server/config"
	"qzt-go-server/pkg/xauth"
	"qzt-go-server/pkg/xcolor"
	"qzt-go-server/pkg/xenv"
	"qzt-go-server/pkg/xlogger"
	"qzt-go-server/pkg/xresponse"
	"qzt-go-server/pkg/xtrace"
)

const (
	maxLogBodyBytes = 16 << 10 // 16KB，请求/响应体日志最大记录大小
	truncateSuffix  = "... [truncated]"
	timeFmtWithMS   = "2006-01-02 15:04:05.000"
)

// 一级敏感字段名：脱敏时把顶层与 data. 下的这些键替换为 ****。
var sensitiveRoots = []string{
	"password", "pwd", "token", "secret", "access_token", "refresh_token",
	"data.access_token", "data.refresh_token",
}

// 数组内脱敏路径（* 通配任意下标），如 data.list.*.operator_id。
var arrayFieldMasks = []string{}

// sensitiveQueryKeys URL query 里的凭据类参数名:日志记录时值替换为 ****。
// (KB 协同 WebSocket 的 token、本地私有下载的签名 t 都走 query,不脱敏会整串落日志。)
var sensitiveQueryKeys = []string{"token", "access_token", "refresh_token", "t"}

// maskQuery 脱敏 URL query 中的凭据参数;无命中时原样返回(保持可读性)。
func maskQuery(rawQuery string) string {
	if rawQuery == "" {
		return rawQuery
	}
	values, err := url.ParseQuery(rawQuery)
	if err != nil {
		return "[unparsable]"
	}
	changed := false
	for _, k := range sensitiveQueryKeys {
		if values.Has(k) {
			values.Set(k, "****")
			changed = true
		}
	}
	if !changed {
		return rawQuery
	}
	return values.Encode()
}

// fastMask 对 JSON body 做敏感字段脱敏，返回新字节切片。
func fastMask(raw []byte) []byte {
	if len(raw) == 0 {
		return raw
	}
	data := raw

	// 1. 脱敏一级字段 & data. 下的一级字段
	for _, key := range sensitiveRoots {
		if gjson.GetBytes(data, key).Exists() {
			if masked, err := sjson.SetBytes(data, key, "****"); err != nil {
				xlogger.ErrorfCtx(context.Background(), "请求参数脱敏失败: %v", err)
			} else {
				data = masked
			}
		}
		prefixed := "data." + key
		if gjson.GetBytes(data, prefixed).Exists() {
			if masked, err := sjson.SetBytes(data, prefixed, "****"); err != nil {
				xlogger.ErrorfCtx(context.Background(), "请求参数脱敏失败: %v", err)
			} else {
				data = masked
			}
		}
	}

	// 2. 脱敏数组内的字段，路径格式：prefix.*.field
	for _, path := range arrayFieldMasks {
		if !containsStar(path) {
			continue
		}
		idx := indexByte(path, '*')
		// 拆分 prefix 与 field
		prefixPart := path[:idx]
		prefixPart = trimSuffix(prefixPart, ".")
		field := path[idx+2:] // 跳过 "*."

		arr := gjson.GetBytes(data, prefixPart)
		if !arr.Exists() || !arr.IsArray() {
			continue
		}
		for i := range arr.Array() {
			fullPath := fmt.Sprintf("%s.%d.%s", prefixPart, i, field)
			if gjson.GetBytes(data, fullPath).Exists() {
				if masked, err := sjson.SetBytes(data, fullPath, "****"); err != nil {
					xlogger.ErrorfCtx(context.Background(), "请求参数脱敏失败: %v", err)
				} else {
					data = masked
				}
			}
		}
	}
	return data
}

func containsStar(s string) bool {
	for i := 0; i < len(s)-1; i++ {
		if s[i] == '*' && s[i+1] == '.' {
			return true
		}
	}
	return false
}

func indexByte(s string, b byte) int {
	for i := 0; i < len(s); i++ {
		if s[i] == b {
			return i
		}
	}
	return -1
}

func trimSuffix(s, suffix string) string {
	if len(s) >= len(suffix) && s[len(s)-len(suffix):] == suffix {
		return s[:len(s)-len(suffix)]
	}
	return s
}

func truncateBody(data []byte) []byte {
	if len(data) <= maxLogBodyBytes {
		return data
	}
	return append(data[:maxLogBodyBytes], []byte(truncateSuffix)...)
}

// responseWriter 包装 gin.ResponseWriter，额外拷贝一份响应体用于日志。
type responseWriter struct {
	gin.ResponseWriter
	body *bytes.Buffer
}

func (w *responseWriter) Write(b []byte) (int, error) {
	_, _ = w.body.Write(b)
	return w.ResponseWriter.Write(b)
}

// Logger 请求日志中间件：控制台打印一行请求摘要；若开启访问日志文件，
// 则把脱敏后的请求/响应体写入 access 日志（Warn 级别）。
func Logger() gin.HandlerFunc {
	return func(c *gin.Context) {
		cfg := config.Get()
		startTime := time.Now()
		path := c.Request.URL.Path
		query := maskQuery(c.Request.URL.RawQuery)
		method := c.Request.Method
		traceID := xtrace.GetTraceID(c.Request.Context())

		// 注入 IP / UserAgent 到 gin context 与 request context，供 GetUserContext 取用
		c.Set(xauth.XIp, c.ClientIP())
		c.Set(xauth.XUserAgent, c.Request.UserAgent())
		ctx := context.WithValue(c.Request.Context(), xauth.XIp, c.ClientIP())
		ctx = context.WithValue(ctx, xauth.XUserAgent, c.Request.UserAgent())
		c.Request = c.Request.WithContext(ctx)

		if path == "/favicon.ico" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		var reqBody []byte
		var writer *responseWriter

		if cfg.Application.EnableAccessLog {
			allowedCT := map[string]bool{
				"application/json":                  true,
				"application/x-www-form-urlencoded": true,
				"text/plain":                        true,
				"text/xml":                          true,
			}
			ct := c.ContentType()
			mimeType, _, _ := mime.ParseMediaType(ct)
			if !allowedCT[mimeType] {
				reqBody = []byte(fmt.Sprintf("{\"msg\": \"[skip request type: %s]\"}", mimeType))
			} else {
				reqBody, _ = io.ReadAll(c.Request.Body)
				c.Request.Body = io.NopCloser(bytes.NewBuffer(reqBody))
			}
			writer = &responseWriter{ResponseWriter: c.Writer, body: bytes.NewBuffer(nil)}
			c.Writer = writer
		}

		c.Next()

		cost := time.Since(startTime)
		bizCode := c.GetInt(xresponse.BizCode)
		bizMsg := c.GetString(xresponse.BizMsg)

		if cfg.Application.EnableAccessLog {
			maskedReq := truncateBody(fastMask(reqBody))
			var maskedRes []byte
			if writer != nil {
				ct := c.Writer.Header().Get("Content-Type")
				mimeType, _, _ := mime.ParseMediaType(ct)
				if len(mimeType) > 0 && !isLoggableMIME(mimeType) {
					maskedRes = []byte(fmt.Sprintf("{\"msg\": \"[skip response type: %s]\"}", mimeType))
				} else {
					maskedRes = truncateBody(fastMask(writer.body.Bytes()))
				}
			}
			xlogger.Access(bizMsg,
				zap.Int("status", c.Writer.Status()),
				zap.Int("biz_code", bizCode),
				zap.String("method", method),
				zap.String("path", path),
				zap.String("query", query),
				zap.String("request_body", string(maskedReq)),
				zap.String("ip", c.ClientIP()),
				zap.Duration("cost", cost),
				zap.String("res", string(maskedRes)),
				zap.String("trace_id", traceID),
				zap.String("user_agent", c.Request.UserAgent()),
				zap.String("errors", c.Errors.ByType(gin.ErrorTypePrivate).String()),
				zap.String("start_time", startTime.Format(timeFmtWithMS)),
			)
		}

		// 非生产环境控制台输出请求摘要
		if !xenv.Prod() {
			fmt.Printf("%s %s %20s | status %3s | biz code %6s | %8v | %5s  %#v | %12s | %s\n",
				xcolor.GreenFont(fmt.Sprintf("[%s:%s]", cfg.Application.Server.Name, cfg.Application.Server.Version)),
				xcolor.YellowFont("[access] |"),
				startTime.Format(timeFmtWithMS),
				xcolor.StatusCodeColor(c.Writer.Status()),
				xcolor.BizCodeColor(bizCode),
				cost,
				xcolor.MethodColor(method),
				c.Request.URL.RequestURI(),
				c.ClientIP(),
				bizMsg,
			)
		}
	}
}

func isLoggableMIME(mimeType string) bool {
	switch mimeType {
	case "application/json", "application/x-www-form-urlencoded", "text/plain", "text/xml":
		return true
	}
	return false
}
