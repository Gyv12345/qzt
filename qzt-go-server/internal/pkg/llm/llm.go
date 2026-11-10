// Package llm 统一 LLM 网关：所有 AI 功能（GEO 监测、AI 测评、工单助手等）唯一的
// 模型调用入口。协议对齐 OpenAI chat completions——DeepSeek 官方 API、通义 DashScope
// 兼容模式、任意自建 OpenAI 兼容网关，切换 base_url 即可换供应商。
//
// 能力：超时/重试（仅 429/5xx/网络错误）、进程级 QPS 限流（xlimiter 令牌桶）、
// 响应缓存（相同请求命中则不消耗供应商额度）、按用户+功能的 token 记账
// （sys_llm_usage，为商业化计费预留）。
//
// 约束：Service 层调用，Handler 不直接 import；API key 只进 gitignored 的 .env
// （yaml 里 ${LLM_API_KEY:-} 占位）；日志只记 model/用量/耗时等元数据，不落 prompt 明文。
package llm

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"sync"
	"time"

	"qzt-go-server/config"
	"qzt-go-server/internal/model"
	"qzt-go-server/internal/pkg/cache"
	"qzt-go-server/internal/repository"
	"qzt-go-server/pkg/xlimiter"
	"qzt-go-server/pkg/xlogger"
)

// Message 一条对话消息。Role 为 OpenAI 语义：system/user/assistant。
type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// ChatRequest 一次对话补全请求。Model 留空用网关默认模型；
// UserID/Feature 不发给供应商，只用于记账定位「谁、哪个功能」在用。
type ChatRequest struct {
	Messages    []Message
	Model       string
	Temperature *float64
	MaxTokens   int
	// UserID 发起用户 ID，记账用；0 表示系统定时任务。
	UserID uint
	// Feature 功能标识，如 geo.monitor / assessment.report，记账用。
	Feature string
}

// ChatResponse 对话补全结果。
type ChatResponse struct {
	Content          string
	Model            string
	PromptTokens     int
	CompletionTokens int
	TotalTokens      int
	FromCache        bool
}

// Usage 一次调用的记账条目（成功与失败都记，失败不落 prompt）。
type Usage struct {
	UserID           uint
	Feature          string
	Provider         string
	Model            string
	PromptTokens     int
	CompletionTokens int
	TotalTokens      int
	FromCache        bool
	LatencyMs        int64
	Status           string // ok / error
	ErrMsg           string
}

// UsageRecorder 记账后端。默认写 MySQL（sys_llm_usage），测试可注入内存实现。
type UsageRecorder interface {
	Record(ctx context.Context, u Usage)
}

// CacheStore 响应缓存依赖的最小接口（由 internal/pkg/cache.Store 适配）。
type CacheStore interface {
	Get(key string) (string, bool)
	Set(key, value string, ttl time.Duration)
}

// Options 网关装配选项；由 OptionsFromConfig 从 config.Get().LLM 生成。
type Options struct {
	BaseURL    string
	APIKey     string
	Model      string
	Timeout    time.Duration
	MaxRetries int
	// RPM 进程级每分钟最大请求数（令牌桶），0 不限流。
	RPM int
	// CacheTTL 相同请求的响应缓存 TTL，0 关闭。
	CacheTTL time.Duration
	// Recorder 记账后端，nil 用默认 MySQL 实现。
	Recorder UsageRecorder
	// Cache 响应缓存后端，nil 且 CacheTTL>0 时自动适配 internal/pkg/cache 全局 store。
	Cache CacheStore
}

var (
	// ErrNotInitialized 网关未装配（启动未调 Init）。
	ErrNotInitialized = errors.New("llm: gateway not initialized")
	// ErrNotConfigured 已装配但未配置 API key（.env 的 LLM_API_KEY 为空）。
	ErrNotConfigured = errors.New("llm: api key not configured, set LLM_API_KEY in .env")
	// ErrRateLimited 触发进程级限流。
	ErrRateLimited = errors.New("llm: rate limited, try later")

	mu sync.RWMutex
	gw *Client
)

// Client 可独立使用的 LLM 客户端。多数场景用包级 Chat（走 Init 装配的默认实例）；
// 需要多供应商并存的场景（如 GEO 监测对多个 AI 平台各自提问）用 NewClient 建独立实例。
type Client struct {
	opts     Options
	provider Provider
	limiter  *xlimiter.BucketLimiter // RPM>0 时非 nil
}

// NewClient 装配一个独立客户端（自带超时/重试/限流/缓存/记账）。
// APIKey 为空也允许创建——Chat 会返回 ErrNotConfigured，调用方可用 Enabled() 预判。
func NewClient(o Options) *Client {
	if o.Timeout <= 0 {
		o.Timeout = 60 * time.Second
	}
	if o.Model == "" {
		o.Model = "deepseek-chat"
	}
	if o.Recorder == nil {
		o.Recorder = dbRecorder{}
	}
	if o.Cache == nil && o.CacheTTL > 0 {
		o.Cache = adaptCache(cache.GetStore())
	}
	c := &Client{opts: o, provider: newOpenAICompat("openai-compat", o.BaseURL, o.APIKey, o.Timeout)}
	if o.RPM > 0 {
		burst := o.RPM / 10
		if burst < 1 {
			burst = 1
		}
		c.limiter, _ = xlimiter.NewTokenBucket("llm", xlimiter.BucketEvery(time.Minute/time.Duration(o.RPM)), burst)
	}
	return c
}

// Init 装配默认客户端（main.go 启动时调用）。重复调用先关闭旧限流器再整体替换。
func Init(o Options) {
	mu.Lock()
	defer mu.Unlock()
	if old := gw; old != nil && old.limiter != nil {
		old.limiter.Close()
	}
	gw = NewClient(o)
}

// Default 返回 Init 装配的默认客户端；未装配时返回 nil。
func Default() *Client {
	mu.RLock()
	defer mu.RUnlock()
	return gw
}

// OptionsFromConfig 从全局配置生成装配选项。
func OptionsFromConfig(c config.LLMConfig) Options {
	return Options{
		BaseURL:    c.BaseURL,
		APIKey:     c.APIKey,
		Model:      c.Model,
		Timeout:    c.Timeout,
		MaxRetries: c.MaxRetries,
		RPM:        c.RPM,
		CacheTTL:   c.CacheTTL,
	}
}

// Enabled 报告客户端是否已配置可用（Service 层可据此决定走 AI 还是降级路径）。
func (c *Client) Enabled() bool {
	return c != nil && c.opts.APIKey != ""
}

// Chat 发起一次对话补全（阻塞：缓存 → 限流 → 调用重试 → 写缓存 → 记账）。
func (c *Client) Chat(ctx context.Context, req ChatRequest) (ChatResponse, error) {
	if c == nil {
		return ChatResponse{}, ErrNotInitialized
	}
	if c.opts.APIKey == "" {
		return ChatResponse{}, ErrNotConfigured
	}
	if len(req.Messages) == 0 {
		return ChatResponse{}, errors.New("llm: messages is empty")
	}
	model := req.Model
	if model == "" {
		model = c.opts.Model
	}

	start := time.Now()

	// 1) 响应缓存：命中直接返回，不消耗供应商额度与限流配额。
	if c.opts.Cache != nil {
		if resp, ok := cacheLookup(c.opts.Cache, model, req); ok {
			resp.FromCache = true
			c.record(ctx, req, model, resp, true, 0, nil)
			return resp, nil
		}
	}

	// 2) 进程级限流。
	if c.limiter != nil {
		if err := c.limiter.Wait(ctx); err != nil {
			c.record(ctx, req, model, ChatResponse{}, false, 0, err)
			return ChatResponse{}, fmt.Errorf("%w: %v", ErrRateLimited, err)
		}
	}

	// 3) 调用（带重试）。
	raw, err := c.callWithRetry(ctx, req, model)
	latency := time.Since(start).Milliseconds()
	if err != nil {
		c.record(ctx, req, model, ChatResponse{}, false, latency, err)
		return ChatResponse{}, err
	}

	resp := ChatResponse{
		Content:          raw.Content,
		Model:            model,
		PromptTokens:     raw.PromptTokens,
		CompletionTokens: raw.CompletionTokens,
		TotalTokens:      raw.TotalTokens,
	}

	// 4) 写缓存。
	if c.opts.Cache != nil {
		cacheStore(c.opts.Cache, model, req, resp, c.opts.CacheTTL)
	}

	c.record(ctx, req, model, resp, false, latency, nil)
	xlogger.InfofCtx(ctx, "llm: chat ok feature=%s user=%d model=%s tokens=%d latency=%dms",
		req.Feature, req.UserID, model, resp.TotalTokens, latency)
	return resp, nil
}

// Enabled 报告默认客户端是否已配置可用。
func Enabled() bool {
	return Default().Enabled()
}

// Chat 走默认客户端发起一次对话补全。
func Chat(ctx context.Context, req ChatRequest) (ChatResponse, error) {
	c := Default()
	if c == nil {
		return ChatResponse{}, ErrNotInitialized
	}
	return c.Chat(ctx, req)
}

// callWithRetry 对可重试错误（429/5xx/网络错误）指数退避重试；4xx 直接返回。
func (c *Client) callWithRetry(ctx context.Context, req ChatRequest, model string) (*rawResult, error) {
	var lastErr error
	for attempt := 0; attempt <= c.opts.MaxRetries; attempt++ {
		if attempt > 0 {
			backoff := time.Duration(1<<uint(attempt-1)) * 200 * time.Millisecond
			select {
			case <-ctx.Done():
				return nil, ctx.Err()
			case <-time.After(backoff):
			}
		}
		raw, err := c.provider.ChatCompletion(ctx, req, model)
		if err == nil {
			return raw, nil
		}
		lastErr = err
		if !isRetryable(err) {
			return nil, err
		}
		xlogger.InfofCtx(ctx, "llm: attempt %d/%d failed, will retry: %v", attempt+1, c.opts.MaxRetries+1, err)
	}
	return nil, lastErr
}

// record 记账：成功与失败都落；记账失败仅日志，不影响业务结果。
// ErrMsg 截断且只含供应商错误摘要，不含 prompt。
func (c *Client) record(ctx context.Context, req ChatRequest, model string, resp ChatResponse, fromCache bool, latencyMs int64, callErr error) {
	u := Usage{
		UserID:           req.UserID,
		Feature:          req.Feature,
		Provider:         c.provider.Name(),
		Model:            model,
		PromptTokens:     resp.PromptTokens,
		CompletionTokens: resp.CompletionTokens,
		TotalTokens:      resp.TotalTokens,
		FromCache:        fromCache,
		LatencyMs:        latencyMs,
		Status:           "ok",
	}
	if callErr != nil {
		u.Status = "error"
		u.ErrMsg = truncate(callErr.Error(), 250)
	}
	c.opts.Recorder.Record(ctx, u)
}

// ── 响应缓存 ──

// cacheKey 对影响输出的请求参数做规范化后哈希；UserID/Feature 不参与（不影响输出）。
func cacheKey(model string, req ChatRequest) string {
	b, _ := json.Marshal(struct {
		Model       string    `json:"model"`
		Messages    []Message `json:"messages"`
		Temperature *float64  `json:"temperature,omitempty"`
		MaxTokens   int       `json:"max_tokens,omitempty"`
	}{Model: model, Messages: req.Messages, Temperature: req.Temperature, MaxTokens: req.MaxTokens})
	sum := sha256.Sum256(b)
	return "llm:resp:" + hex.EncodeToString(sum[:])
}

func cacheLookup(store CacheStore, model string, req ChatRequest) (ChatResponse, bool) {
	v, ok := store.Get(cacheKey(model, req))
	if !ok {
		return ChatResponse{}, false
	}
	var resp ChatResponse
	if err := json.Unmarshal([]byte(v), &resp); err != nil {
		return ChatResponse{}, false
	}
	return resp, true
}

func cacheStore(store CacheStore, model string, req ChatRequest, resp ChatResponse, ttl time.Duration) {
	b, err := json.Marshal(resp)
	if err != nil {
		return
	}
	store.Set(cacheKey(model, req), string(b), ttl)
}

// adaptCache 把 internal/pkg/cache 全局 store 适配为 CacheStore；
// 任一错误按未命中处理，Redis 不可用时缓存整体降级关闭。
type cacheAdapter struct{ store cache.Store }

func adaptCache(s cache.Store) CacheStore {
	if s == nil {
		return nil
	}
	return cacheAdapter{store: s}
}

func (a cacheAdapter) Get(key string) (string, bool) {
	v, err := a.store.Get(key)
	if err != nil || v == "" {
		return "", false
	}
	return v, true
}

func (a cacheAdapter) Set(key, value string, ttl time.Duration) {
	_ = a.store.Set(key, value, ttl)
}

// ── 默认记账后端 ──

// dbRecorder 默认记账实现：写 sys_llm_usage。表由 docs/sql/llm_usage.sql 建，
// 未执行 SQL 时仅记错误日志，不阻断业务调用。
type dbRecorder struct{}

func (dbRecorder) Record(ctx context.Context, u Usage) {
	m := &model.SysLLMUsage{
		UserID:           u.UserID,
		Feature:          u.Feature,
		Provider:         u.Provider,
		Model:            u.Model,
		PromptTokens:     u.PromptTokens,
		CompletionTokens: u.CompletionTokens,
		TotalTokens:      u.TotalTokens,
		FromCache:        u.FromCache,
		LatencyMs:        u.LatencyMs,
		Status:           u.Status,
		ErrMsg:           u.ErrMsg,
	}
	if err := repository.NewLLMUsageRepo().Create(ctx, m); err != nil {
		xlogger.ErrorfCtx(ctx, "llm: record usage failed: %v", err)
	}
}
