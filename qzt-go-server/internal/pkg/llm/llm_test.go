package llm

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"
)

// testAPIKey 单测假密钥（非真实凭据），用拼接构造避免源码出现字面量凭据。
var testAPIKey = strings.Join([]string{"unit", "test", "fake"}, "-")

// memStore 内存缓存实现（测响应缓存命中路径）。
type memStore struct {
	mu sync.RWMutex
	m  map[string]string
}

func newMemStore() *memStore { return &memStore{m: map[string]string{}} }

func (s *memStore) Get(key string) (string, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	v, ok := s.m[key]
	return v, ok
}

func (s *memStore) Set(key, value string, _ time.Duration) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.m[key] = value
}

// sliceRecorder 内存记账器，捕获全部记账条目供断言。
type sliceRecorder struct {
	mu     sync.Mutex
	usages []Usage
}

func (r *sliceRecorder) Record(_ context.Context, u Usage) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.usages = append(r.usages, u)
}

func (r *sliceRecorder) all() []Usage {
	r.mu.Lock()
	defer r.mu.Unlock()
	return append([]Usage(nil), r.usages...)
}

// mockServer OpenAI 兼容 mock 供应商：记录收到的请求体，按脚本逐次回放响应。
type mockServer struct {
	srv    *httptest.Server
	mu     sync.Mutex
	calls  int
	bodies []openAIChatRequest
	script []mockResp // 按调用次序回放；超出后复用最后一个
}

type mockResp struct {
	status int
	body   string
}

func newMockServer(script ...mockResp) *mockServer {
	m := &mockServer{script: script}
	m.srv = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		m.mu.Lock()
		i := m.calls
		m.calls++
		var req openAIChatRequest
		_ = json.NewDecoder(r.Body).Decode(&req)
		m.bodies = append(m.bodies, req)
		resp := m.script[min(i, len(m.script)-1)]
		m.mu.Unlock()
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(resp.status)
		_, _ = w.Write([]byte(resp.body))
	}))
	return m
}

func (m *mockServer) count() int {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.calls
}

func (m *mockServer) lastBody() openAIChatRequest {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.bodies[len(m.bodies)-1]
}

func (m *mockServer) close() { m.srv.Close() }

// resetGateway 恢复全局网关为未装配状态，避免测试间串扰。
func resetGateway() {
	mu.Lock()
	if gw != nil && gw.limiter != nil {
		gw.limiter.Close()
	}
	gw = nil
	mu.Unlock()
}

func openAIOK(content string, prompt, completion int) string {
	b, _ := json.Marshal(map[string]any{
		"choices": []map[string]any{
			{"message": map[string]any{"content": content}},
		},
		"usage": map[string]any{
			"prompt_tokens":     prompt,
			"completion_tokens": completion,
			"total_tokens":      prompt + completion,
		},
	})
	return string(b)
}

func testRequest() ChatRequest {
	return ChatRequest{
		Messages: []Message{{Role: "user", Content: "hi"}},
		UserID:   42,
		Feature:  "unit.test",
	}
}

func TestChatSuccess(t *testing.T) {
	ms := newMockServer(mockResp{status: 200, body: openAIOK("你好，世界", 3, 8)})
	defer ms.close()
	rec := &sliceRecorder{}
	Init(Options{
		BaseURL: ms.srv.URL, APIKey: testAPIKey, Model: "test-model",
		Timeout: 2 * time.Second, Recorder: rec,
	})
	defer resetGateway()

	resp, err := Chat(context.Background(), testRequest())
	if err != nil {
		t.Fatalf("Chat: %v", err)
	}
	if resp.Content != "你好，世界" || resp.Model != "test-model" {
		t.Fatalf("unexpected resp: %+v", resp)
	}
	if resp.PromptTokens != 3 || resp.CompletionTokens != 8 || resp.TotalTokens != 11 {
		t.Fatalf("unexpected usage: %+v", resp)
	}

	us := rec.all()
	if len(us) != 1 {
		t.Fatalf("want 1 usage, got %d", len(us))
	}
	u := us[0]
	if u.UserID != 42 || u.Feature != "unit.test" || u.Status != "ok" ||
		u.Model != "test-model" || u.Provider != "openai-compat" || u.TotalTokens != 11 {
		t.Fatalf("unexpected usage: %+v", u)
	}

	body := ms.lastBody()
	if body.Model != "test-model" || len(body.Messages) != 1 || body.Messages[0].Content != "hi" {
		t.Fatalf("unexpected request body: %+v", body)
	}
}

func TestChatNotInitialized(t *testing.T) {
	resetGateway()
	if _, err := Chat(context.Background(), testRequest()); !errors.Is(err, ErrNotInitialized) {
		t.Fatalf("want ErrNotInitialized, got %v", err)
	}
}

func TestChatNotConfigured(t *testing.T) {
	Init(Options{BaseURL: "http://127.0.0.1:1", APIKey: "", Recorder: &sliceRecorder{}})
	defer resetGateway()
	if Enabled() {
		t.Fatal("Enabled should be false without api key")
	}
	if _, err := Chat(context.Background(), testRequest()); !errors.Is(err, ErrNotConfigured) {
		t.Fatalf("want ErrNotConfigured, got %v", err)
	}
}

func TestChatEmptyMessages(t *testing.T) {
	Init(Options{BaseURL: "http://127.0.0.1:1", APIKey: testAPIKey, Recorder: &sliceRecorder{}})
	defer resetGateway()
	if _, err := Chat(context.Background(), ChatRequest{}); err == nil {
		t.Fatal("want error for empty messages")
	}
}

func TestChatRetryOn5xx(t *testing.T) {
	ms := newMockServer(
		mockResp{status: 502, body: `{"error":{"message":"bad gateway"}}`},
		mockResp{status: 200, body: openAIOK("ok", 1, 1)},
	)
	defer ms.close()
	rec := &sliceRecorder{}
	Init(Options{
		BaseURL: ms.srv.URL, APIKey: testAPIKey, Model: "m",
		Timeout: 2 * time.Second, MaxRetries: 2, Recorder: rec,
	})
	defer resetGateway()

	resp, err := Chat(context.Background(), testRequest())
	if err != nil {
		t.Fatalf("Chat after retry: %v", err)
	}
	if resp.Content != "ok" {
		t.Fatalf("unexpected content: %q", resp.Content)
	}
	if got := ms.count(); got != 2 {
		t.Fatalf("want 2 calls, got %d", got)
	}
}

func TestChatNoRetryOn4xx(t *testing.T) {
	ms := newMockServer(mockResp{status: 400, body: `{"error":{"message":"invalid request"}}`})
	defer ms.close()
	rec := &sliceRecorder{}
	Init(Options{
		BaseURL: ms.srv.URL, APIKey: testAPIKey, Model: "m",
		Timeout: 2 * time.Second, MaxRetries: 3, Recorder: rec,
	})
	defer resetGateway()

	_, err := Chat(context.Background(), testRequest())
	if err == nil {
		t.Fatal("want error on 400")
	}
	if got := ms.count(); got != 1 {
		t.Fatalf("4xx must not retry, want 1 call, got %d", got)
	}
	us := rec.all()
	if len(us) != 1 || us[0].Status != "error" || us[0].ErrMsg == "" {
		t.Fatalf("want error usage recorded, got %+v", us)
	}
}

func TestChatCacheHit(t *testing.T) {
	ms := newMockServer(mockResp{status: 200, body: openAIOK("cached", 2, 3)})
	defer ms.close()
	store := newMemStore()
	rec := &sliceRecorder{}
	Init(Options{
		BaseURL: ms.srv.URL, APIKey: testAPIKey, Model: "m",
		Timeout: 2 * time.Second, CacheTTL: time.Minute,
		Cache: store, Recorder: rec,
	})
	defer resetGateway()

	first, err := Chat(context.Background(), testRequest())
	if err != nil {
		t.Fatalf("first Chat: %v", err)
	}
	if first.FromCache {
		t.Fatal("first call must not be from cache")
	}
	second, err := Chat(context.Background(), testRequest())
	if err != nil {
		t.Fatalf("second Chat: %v", err)
	}
	if !second.FromCache {
		t.Fatal("second call should hit cache")
	}
	if second.Content != first.Content || second.TotalTokens != first.TotalTokens {
		t.Fatalf("cached resp mismatch: %+v vs %+v", second, first)
	}
	if got := ms.count(); got != 1 {
		t.Fatalf("cache hit must not call provider, want 1 call, got %d", got)
	}
	us := rec.all()
	if len(us) != 2 || !us[1].FromCache {
		t.Fatalf("want 2 usages with second from_cache, got %+v", us)
	}
}

func TestChatRateLimited(t *testing.T) {
	ms := newMockServer(mockResp{status: 200, body: openAIOK("ok", 1, 1)})
	defer ms.close()
	rec := &sliceRecorder{}
	// RPM=1 → 每分钟 1 个令牌、桶容量 1：首次消耗完，第二次必须被限流。
	Init(Options{
		BaseURL: ms.srv.URL, APIKey: testAPIKey, Model: "m",
		Timeout: 2 * time.Second, RPM: 1, Recorder: rec,
	})
	defer resetGateway()

	if _, err := Chat(context.Background(), testRequest()); err != nil {
		t.Fatalf("first Chat: %v", err)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
	defer cancel()
	_, err := Chat(ctx, testRequest())
	if !errors.Is(err, ErrRateLimited) {
		t.Fatalf("want ErrRateLimited, got %v", err)
	}
	us := rec.all()
	if len(us) != 2 || us[1].Status != "error" {
		t.Fatalf("want rate-limit error usage recorded, got %+v", us)
	}
}

func TestTruncate(t *testing.T) {
	long := "提词失败：供应商返回了一段非常长的中文错误信息"
	got := truncate(long, 10)
	if len(got) > 10 {
		t.Fatalf("truncate overflow: %d bytes", len(got))
	}
	if got != long[:len(got)] {
		t.Fatal("truncate changed prefix")
	}
	if truncate("short", 10) != "short" {
		t.Fatal("short string must be unchanged")
	}
}
