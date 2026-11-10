package douyin

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"strings"
	"testing"
)

// testSecret 单测假密钥（httptest 本地桩，无真实凭据；支持环境变量覆盖）。
func testSecret() string {
	if s := os.Getenv("DOUYIN_TEST_SECRET"); s != "" {
		return s
	}
	return "unit-test-dummy-secret"
}

func TestAuthorizeURL(t *testing.T) {
	cfg := Config{ClientKey: "key-abc", RedirectURI: "https://admin.example.com/marketing/geo"}
	cfg.ClientSecret = testSecret()
	c := NewClient(cfg)

	raw := c.AuthorizeURL("st-1")
	u, err := url.Parse(raw)
	if err != nil {
		t.Fatalf("授权地址解析失败: %v", err)
	}
	q := u.Query()
	if u.Scheme != "https" || u.Host != "open.douyin.com" || u.Path != "/platform/oauth/connect/" {
		t.Fatalf("授权地址域/路径异常: %s", raw)
	}
	if q.Get("client_key") != "key-abc" || q.Get("response_type") != "code" {
		t.Fatalf("授权参数缺失: %v", q)
	}
	if !strings.Contains(q.Get("scope"), "video.create") {
		t.Fatalf("scope 应含 video.create: %v", q)
	}
	if q.Get("state") != "st-1" {
		t.Fatalf("state 丢失: %v", q)
	}
}

func TestExchangeToken(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/oauth/access_token/" {
			t.Errorf("意外路径: %s", r.URL.Path)
		}
		if r.URL.Query().Get("grant_type") != "authorization_code" || r.URL.Query().Get("code") != "c-1" {
			t.Errorf("授权参数异常: %v", r.URL.Query())
		}
		_, _ = w.Write([]byte(`{"data":{"access_token":"at-1","open_id":"open-1","expires_in":86400,"refresh_token":"rt-1","refresh_expires_in":2592000,"scope":["video.create"]},"message":"success"}`))
	}))
	defer srv.Close()

	cfg := Config{ClientKey: "k", RedirectURI: "https://x.example.com/cb"}
	cfg.ClientSecret = testSecret()
	c := NewClient(cfg)
	// 测试桩替换授权域名
	c.oauthBase = srv.URL

	tok, err := c.ExchangeToken(context.Background(), "c-1")
	if err != nil {
		t.Fatalf("ExchangeToken 失败: %v", err)
	}
	if tok.AccessToken != "at-1" || tok.OpenID != "open-1" || tok.RefreshToken != "rt-1" {
		t.Fatalf("令牌字段异常: %+v", tok)
	}
	if tok.Scope != "video.create" {
		t.Fatalf("scope 拼接异常: %q", tok.Scope)
	}
}

func TestUploadAndCreate(t *testing.T) {
	var gotUploadID string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.Method == http.MethodPost && strings.HasSuffix(r.URL.Path, "/video/upload/"):
			if r.URL.Query().Get("open_id") != "open-1" {
				t.Errorf("open_id 缺失: %v", r.URL.Query())
			}
			if err := r.ParseMultipartForm(1 << 20); err != nil {
				t.Errorf("multipart 解析失败: %v", err)
			}
			_, _ = io.ReadAll(r.Body)
			gotUploadID = "up-1"
			_, _ = w.Write([]byte(`{"data":{"video":{"upload_id":"up-1"},"error_code":0},"message":"success"}`))
		case r.Method == http.MethodPost && strings.HasSuffix(r.URL.Path, "/video/create/"):
			_, _ = w.Write([]byte(`{"data":{"item_id":"item-9","error_code":0},"message":"success"}`))
		default:
			t.Errorf("意外请求: %s %s", r.Method, r.URL.Path)
		}
	}))
	defer srv.Close()

	cfg := Config{ClientKey: "k"}
	cfg.ClientSecret = testSecret()
	c := NewClient(cfg)
	c.apiBase = srv.URL
	c.oauthBase = srv.URL

	uploadID, err := c.UploadVideo(context.Background(), "at-1", "open-1", "v.mp4", []byte("fake-video"))
	if err != nil {
		t.Fatalf("UploadVideo 失败: %v", err)
	}
	if uploadID != "up-1" || gotUploadID != "up-1" {
		t.Fatalf("upload_id 异常: %q", uploadID)
	}

	itemID, err := c.CreateVideo(context.Background(), "at-1", "open-1", uploadID, "#开源 #CRM")
	if err != nil {
		t.Fatalf("CreateVideo 失败: %v", err)
	}
	if itemID != "item-9" {
		t.Fatalf("item_id 异常: %q", itemID)
	}
}

func TestUploadErrorCode(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(`{"data":{"error_code":2190004,"description":"video too large"},"message":"error"}`))
	}))
	defer srv.Close()

	cfg := Config{ClientKey: "k"}
	cfg.ClientSecret = testSecret()
	c := NewClient(cfg)
	c.apiBase = srv.URL
	if _, err := c.UploadVideo(context.Background(), "at", "open", "v.mp4", []byte("x")); err == nil {
		t.Fatal("业务错误码应返回错误")
	}
}
