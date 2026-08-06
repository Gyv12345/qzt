package middleware

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/app"
	"qzt-go-server/internal/model"
	"qzt-go-server/internal/repository"
	"qzt-go-server/pkg/xauth"
)

// maxBodyCapture 每条审计日志最多捕获的请求/响应字节数，避免大 payload 撑爆内存与行。
const maxBodyCapture = 8 << 10 // 8KB

// writeLogTimeout 限制同步日志写入的最长时间，防止慢库拖垮响应回包。
const writeLogTimeout = 3 * time.Second

// sensitiveKeys 审计捕获时需脱敏的键（值替换为 ***）。
var sensitiveKeys = map[string]struct{}{
	"password":         {},
	"old_password":     {},
	"new_password":     {},
	"confirm_password": {},
	"token":            {},
	"secret":           {},
	"access_token":     {},
	"refresh_token":    {},
}

type apiMeta struct {
	module string
	action string
}

// OperationLog 记录每一次写操作（POST/PUT/DELETE/PATCH）到 sys_operation_log。
// 必须放在 JWTAuth 之后（以获取操作人）、CasbinRBAC 之前（使权限拒绝也被审计）。
// 写库是尽力而为：失败仅记应用日志，绝不影响业务请求。
// 路由 → module/action 元数据在启动时从 sys_api 一次性加载；运行期新增的 API 需重启才能丰富日志。
func OperationLog() gin.HandlerFunc {
	repo := repository.NewOperationLogRepo()
	meta := loadAPIMeta()

	return func(c *gin.Context) {
		if !shouldLog(c.Request.Method) {
			c.Next()
			return
		}

		start := time.Now()
		reqParams := captureRequest(c)

		blw := &bodyLogWriter{ResponseWriter: c.Writer, body: &bytes.Buffer{}}
		c.Writer = blw

		c.Next()

		m := meta[c.Request.Method+" "+c.FullPath()]
		bizCode, bizMsg := parseBizResult(blw.body.Bytes())
		status := c.Writer.Status()

		entry := &model.SysOperationLog{
			TraceID:   getTraceID(c),
			UserID:    GetUserID(c),
			Username:  GetUsername(c),
			RoleCodes: strings.Join(GetRoleCodes(c), ","),
			Module:    m.module,
			Action:    m.action,
			Method:    c.Request.Method,
			Route:     c.FullPath(),
			Path:      c.Request.URL.Path,
			TargetID:  c.Param("id"),
			ReqParams: reqParams,
			RespParams: captureResponse(blw.body.Bytes()),
			Status:    status,
			BizCode:   bizCode,
			Success:   status == http.StatusOK && bizCode == 0,
			ClientIP:  c.ClientIP(),
			UserAgent: c.Request.UserAgent(),
			LatencyMs: time.Since(start).Milliseconds(),
		}
		if !entry.Success {
			entry.ErrorMsg = bizMsg
		}

		// 与请求 context 解耦（后者可能已被取消），并自带超时——日志不能阻塞响应。
		ctx, cancel := context.WithTimeout(context.Background(), writeLogTimeout)
		defer cancel()
		if err := repo.Create(ctx, entry); err != nil {
			app.Log.Errorw("write operation log failed", "path", entry.Path, "err", err)
		}
	}
}

// RecordLogin 显式记录一次认证事件（登录/登出）。登录位于公开路由、无 JWTAuth/OperationLog
// 中间件，且失败登录无已认证用户——故由 auth handler 直接记录。尽力而为。
func RecordLogin(c *gin.Context, action string, userID uint, username string, success bool, errMsg string) {
	entry := &model.SysOperationLog{
		TraceID:  getTraceID(c),
		UserID:   userID,
		Username: username,
		Module:   "认证",
		Action:   action,
		Method:   c.Request.Method,
		Route:    c.FullPath(),
		Path:     c.Request.URL.Path,
		Status:   c.Writer.Status(),
		Success:  success,
		ErrorMsg: errMsg,
		ClientIP: c.ClientIP(),
		UserAgent: c.Request.UserAgent(),
	}
	ctx, cancel := context.WithTimeout(context.Background(), writeLogTimeout)
	defer cancel()
	if err := repository.NewOperationLogRepo().Create(ctx, entry); err != nil {
		app.Log.Errorw("write login log failed", "username", username, "err", err)
	}

	// 同时写入独立登录日志表(sys_login_log)
	loginLog := &model.SysLoginLog{
		UserID:    userID,
		Username:  username,
		Action:    action,
		Success:   success,
		ClientIP:  c.ClientIP(),
		UserAgent: c.Request.UserAgent(),
		ErrorMsg:  errMsg,
	}
	if db := repository.DBFrom(ctx); db != nil {
		if err := db.Create(loginLog).Error; err != nil {
			app.Log.Errorw("write sys_login_log failed", "username", username, "err", err)
		}
	}
}

// getTraceID 从 gin context 取 trace_id（Trace 中间件以 xauth.XTraceId 写入）。
func getTraceID(c *gin.Context) string {
	v, ok := c.Get(string(xauth.XTraceId))
	if !ok {
		return ""
	}
	s, _ := v.(string)
	return s
}

func shouldLog(method string) bool {
	switch method {
	case http.MethodPost, http.MethodPut, http.MethodDelete, http.MethodPatch:
		return true
	default:
		return false
	}
}

// captureRequest 读取（截断的）请求体并恢复供 handler 使用，返回脱敏后的
// JSON 字符串 {"query":..., "body":...}。仅捕获 JSON / urlencoded 体（跳过文件上传）。
func captureRequest(c *gin.Context) string {
	var bodyStr string
	ct := c.ContentType()
	if c.Request.Body != nil && (strings.Contains(ct, "application/json") || strings.Contains(ct, "x-www-form-urlencoded")) {
		buf, _ := io.ReadAll(io.LimitReader(c.Request.Body, maxBodyCapture))
		// 恢复：已捕获前缀 + 未读剩余，保证 handler 仍能看到完整 body（即使超过捕获上限）。
		c.Request.Body = io.NopCloser(io.MultiReader(bytes.NewReader(buf), c.Request.Body))
		if strings.Contains(ct, "application/json") {
			bodyStr = redactJSON(buf)
		} else {
			bodyStr = string(buf)
		}
	}

	out := make(map[string]string, 2)
	if q := c.Request.URL.RawQuery; q != "" {
		out["query"] = q
	}
	if bodyStr != "" {
		out["body"] = bodyStr
	}
	if len(out) == 0 {
		return ""
	}
	b, _ := json.Marshal(out)
	return string(b)
}

func captureResponse(respBody []byte) string {
	if len(respBody) == 0 {
		return ""
	}

	out := make(map[string]string, 2)
	if len(respBody) > maxBodyCapture {
		out["body"] = "响应内容超过 8KB，已跳过完整记录"
		out["truncated"] = "true"
	} else {
		out["body"] = redactJSON(respBody)
	}
	b, _ := json.Marshal(out)
	return string(b)
}

// redactJSON 对 JSON 对象中的敏感键脱敏。解析失败时原样返回（已由调用方截断）。
func redactJSON(raw []byte) string {
	if len(raw) == 0 {
		return ""
	}
	var v interface{}
	if err := json.Unmarshal(raw, &v); err != nil {
		return string(raw)
	}
	redactValue(v)
	b, err := json.Marshal(v)
	if err != nil {
		return string(raw)
	}
	return string(b)
}

func redactValue(v interface{}) {
	switch t := v.(type) {
	case map[string]interface{}:
		for k := range t {
			if _, ok := sensitiveKeys[strings.ToLower(k)]; ok {
				t[k] = "***"
			} else {
				redactValue(t[k])
			}
		}
	case []interface{}:
		for _, item := range t {
			redactValue(item)
		}
	}
}

// parseBizResult 从响应体解析统一响应信封 {code,msg,data,timestamp}，判定成功/失败。
// 非2000或非本格式时返回 (0,"")。
func parseBizResult(respBody []byte) (int, string) {
	if len(respBody) == 0 {
		return 0, ""
	}
	var r struct {
		Code int    `json:"code"`
		Msg  string `json:"msg"`
	}
	if err := json.Unmarshal(respBody, &r); err != nil {
		return 0, ""
	}
	return r.Code, r.Msg
}

func loadAPIMeta() map[string]apiMeta {
	m := make(map[string]apiMeta)
	apis, err := repository.NewApiRepo().ListAll(context.Background())
	if err != nil {
		app.Log.Warnw("operation log: load api meta failed", "err", err)
		return m
	}
	for _, a := range apis {
		m[a.Method+" "+a.Path] = apiMeta{module: a.Group, action: a.Description}
	}
	return m
}

type bodyLogWriter struct {
	gin.ResponseWriter
	body *bytes.Buffer
}

func (w *bodyLogWriter) Write(b []byte) (int, error) {
	w.capture(b)
	return w.ResponseWriter.Write(b)
}

func (w *bodyLogWriter) WriteString(s string) (int, error) {
	w.capture([]byte(s))
	return w.ResponseWriter.WriteString(s)
}

func (w *bodyLogWriter) capture(b []byte) {
	remaining := maxBodyCapture + 1 - w.body.Len()
	if remaining <= 0 {
		return
	}
	if len(b) > remaining {
		b = b[:remaining]
	}
	w.body.Write(b)
}
