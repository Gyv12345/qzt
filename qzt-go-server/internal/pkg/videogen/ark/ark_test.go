package ark

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
)

// testAPIKey 单测假密钥（httptest 本地桩，无真实凭据；支持环境变量覆盖）。
func testAPIKey() string {
	if k := os.Getenv("VIDEOGEN_TEST_API_KEY"); k != "" {
		return k
	}
	return "unit-test-dummy-key"
}

func TestBuildTaskContent(t *testing.T) {
	got := BuildTaskContent("城市夜景延时摄影", "720p", 5, "16:9")
	want := "城市夜景延时摄影 --resolution 720p --duration 5 --ratio 16:9 --fps 24 --watermark false"
	if got != want {
		t.Fatalf("BuildTaskContent = %q, want %q", got, want)
	}
}

func TestSubmitAndPoll(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer "+testAPIKey() {
			t.Errorf("缺少 Bearer 鉴权头")
		}
		switch {
		case r.Method == http.MethodPost && strings.HasSuffix(r.URL.Path, "/contents/generations/tasks"):
			body, _ := io.ReadAll(r.Body)
			if !strings.Contains(string(body), "--resolution 720p") {
				t.Errorf("请求体缺少 Seedance 指令: %s", body)
			}
			_, _ = w.Write([]byte(`{"id":"cgt-123"}`))
		case r.Method == http.MethodGet && strings.Contains(r.URL.Path, "cgt-123"):
			_, _ = w.Write([]byte(`{"id":"cgt-123","status":"succeeded","content":{"video_url":"https://cdn.example.com/v.mp4"}}`))
		default:
			t.Errorf("意外请求: %s %s", r.Method, r.URL.Path)
			_, _ = w.Write([]byte(`{"error":{"code":"NotFound","message":"no route"}}`))
		}
	}))
	defer srv.Close()

	cfg := Config{BaseURL: srv.URL, Model: "doubao-seedance-1-0-lite-t2v-250428"}
	cfg.APIKey = testAPIKey()
	c := NewClient(cfg)

	taskID, err := c.Submit(context.Background(), "城市夜景延时摄影")
	if err != nil {
		t.Fatalf("Submit 失败: %v", err)
	}
	if taskID != "cgt-123" {
		t.Fatalf("taskID = %q", taskID)
	}

	st, err := c.Poll(context.Background(), taskID)
	if err != nil {
		t.Fatalf("Poll 失败: %v", err)
	}
	if st.State != "succeeded" || st.VideoURL != "https://cdn.example.com/v.mp4" {
		t.Fatalf("状态异常: %+v", st)
	}
	if !st.Done() {
		t.Fatalf("succeeded 应为终态")
	}
}

func TestPollFailed(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(`{"id":"cgt-x","status":"failed","error":{"code":"InternalServiceError","message":"生成失败"}}`))
	}))
	defer srv.Close()

	cfg := Config{BaseURL: srv.URL, Model: "m"}
	cfg.APIKey = testAPIKey()
	c := NewClient(cfg)
	st, err := c.Poll(context.Background(), "cgt-x")
	if err != nil {
		t.Fatalf("Poll 失败: %v", err)
	}
	if st.State != "failed" || st.Error == "" || !st.Done() {
		t.Fatalf("失败态异常: %+v", st)
	}
}

func TestSubmitHTTPError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
		_, _ = w.Write([]byte(`{"error":{"code":"AuthenticationError","message":"invalid key"}}`))
	}))
	defer srv.Close()

	cfg := Config{BaseURL: srv.URL, Model: "m"}
	cfg.APIKey = testAPIKey()
	c := NewClient(cfg)
	if _, err := c.Submit(context.Background(), "x"); err == nil {
		t.Fatal("401 应返回错误")
	} else if !strings.Contains(err.Error(), "401") {
		t.Fatalf("错误信息应含状态码: %v", err)
	}
}

func TestPollUnknownStatus(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(`{"id":"cgt-y","status":"weird"}`))
	}))
	defer srv.Close()

	cfg := Config{BaseURL: srv.URL, Model: "m"}
	cfg.APIKey = testAPIKey()
	c := NewClient(cfg)
	st, err := c.Poll(context.Background(), "cgt-y")
	if err != nil {
		t.Fatalf("Poll 失败: %v", err)
	}
	if st.State != "failed" {
		t.Fatalf("未知状态应归为 failed: %+v", st)
	}
}
