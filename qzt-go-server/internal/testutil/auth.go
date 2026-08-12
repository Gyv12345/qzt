//go:build integration

package testutil

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"testing"
)

// Envelope 统一响应信封结构。
type Envelope struct {
	Code      int             `json:"code"`
	Msg       string          `json:"msg"`
	Data      json.RawMessage `json:"data"`
	Timestamp int64           `json:"timestamp"`
}

// LoginResp 登录响应 data 结构。
type LoginResp struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	AccessExpire int64  `json:"access_expire"`
	UserID       uint   `json:"user_id"`
	Username     string `json:"username"`
	Nickname     string `json:"nickname"`
}

// AdminToken 登录 admin/admin123 拿 access_token(进程内缓存,避免重复登录)。
// 超管账号绕过 Casbin RBAC,适合 CRUD 全流程测试。
var (
	adminTokenOnce bool
	adminToken     string
)

// LoginAdmin 登录 admin/admin123,返回 access_token。
func LoginAdmin(t *testing.T, baseURL string) string {
	t.Helper()
	if adminTokenOnce {
		return adminToken
	}
	body := map[string]string{"username": "admin", "password": "admin123"}
	resp := DoJSON(t, baseURL, http.MethodPost, "/system/auth/login", "", body)
	env := AssertOK(t, resp)
	var lr LoginResp
	if err := json.Unmarshal(env.Data, &lr); err != nil {
		t.Fatalf("解析登录响应失败: %v, raw: %s", err, string(env.Data))
	}
	if lr.AccessToken == "" {
		t.Fatalf("登录返回空 token, raw: %s", string(env.Data))
	}
	adminToken = lr.AccessToken
	adminTokenOnce = true
	return adminToken
}

// DoJSON 发送 JSON 请求并返回响应信封。
//   - token 为空则不带 Authorization header(用于公开接口)
//   - body 为 nil 则发空 body(GET 场景)
func DoJSON(t *testing.T, baseURL, method, path, token string, body any) *Envelope {
	t.Helper()
	var bodyReader io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			t.Fatalf("序列化请求体失败: %v", err)
		}
		bodyReader = bytes.NewReader(b)
	}
	req, err := http.NewRequest(method, baseURL+path, bodyReader)
	if err != nil {
		t.Fatalf("构造请求失败: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("请求 %s %s 失败: %v", method, path, err)
	}
	defer resp.Body.Close()
	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("读取响应失败: %v", err)
	}
	var env Envelope
	if err := json.Unmarshal(raw, &env); err != nil {
		t.Fatalf("解析响应信封失败(path=%s, http=%d): %v, raw: %s", path, resp.StatusCode, err, truncate(raw, 500))
	}
	// 把 http status 暂存到 envelope.Msg 前缀(调试用),失败断言会用到
	if resp.StatusCode != 200 {
		t.Fatalf("HTTP 状态码异常(path=%s): got %d, body: %s", path, resp.StatusCode, truncate(raw, 500))
	}
	return &env
}

// DoRaw 发送请求返回原始 HTTP 响应(用于断言非 200 场景,如 404/401)。
// 调用方负责关闭 resp.Body。
func DoRaw(t *testing.T, baseURL, method, path, token string) *http.Response {
	t.Helper()
	req, err := http.NewRequest(method, baseURL+path, nil)
	if err != nil {
		t.Fatalf("构造请求失败: %v", err)
	}
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("请求 %s %s 失败: %v", method, path, err)
	}
	return resp
}

func truncate(b []byte, n int) string {
	if len(b) <= n {
		return string(b)
	}
	return string(b[:n]) + "...(truncated)"
}
