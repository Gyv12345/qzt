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

// Message 一条对话消息。Role 为 OpenAI 语义：system/user/assistant/tool。
//
// tool use 协议序列化（结构 tag 保证，无需自定义 MarshalJSON）：
//   - assistant 消息携带 ToolCalls 时，Content 为空串由 omitempty 省略
//     （OpenAI 协议允许省略 content，各供应商普遍兼容）；
//   - role="tool" 消息必带 ToolCallID（tool_call_id）且 Content 为结果文本（必填）。
type Message struct {
	Role    string `json:"role"`
	Content string `json:"content,omitempty"`
	// ToolCallID role="tool" 消息对应的 tool_call_id（序列化为 tool_call_id）。
	ToolCallID string `json:"tool_call_id,omitempty"`
	// ToolCalls assistant 消息携带的工具调用请求列表（序列化为 tool_calls）。
	ToolCalls []ToolCall `json:"tool_calls,omitempty"`
}

// ToolCall 一次工具调用请求（assistant 返回的 tool_calls 元素）。
// Arguments 是 JSON 字符串（OpenAI 协议原样），由调用方反序列化成参数对象。
type ToolCall struct {
	ID        string `json:"id"`
	Type      string `json:"type,omitempty"`
	Name      string `json:"name"`
	Arguments string `json:"arguments"`
}

// toolCallWire ToolCall 的 OpenAI 协议线格式（tool_calls[].function 嵌套）。
type toolCallWire struct {
	ID       string `json:"id"`
	Type     string `json:"type"`
	Function struct {
		Name      string `json:"name"`
		Arguments string `json:"arguments"`
	} `json:"function"`
}

// MarshalJSON 序列化为 OpenAI 协议形状：{"id","type":"function","function":{"name","arguments"}}。
func (t ToolCall) MarshalJSON() ([]byte, error) {
	w := toolCallWire{ID: t.ID, Type: "function"}
	w.Function.Name = t.Name
	w.Function.Arguments = t.Arguments
	return json.Marshal(w)
}

// UnmarshalJSON 从 OpenAI 协议形状反序列化。
func (t *ToolCall) UnmarshalJSON(b []byte) error {
	var w toolCallWire
	if err := json.Unmarshal(b, &w); err != nil {
		return err
	}
	t.ID, t.Type, t.Name, t.Arguments = w.ID, w.Type, w.Function.Name, w.Function.Arguments
	return nil
}

// ToolDef 一个工具的 OpenAI function 定义（ChatRequest.Tools 元素）。
// Parameters 是 JSON Schema 的 RawMessage（原样透传给供应商，不改写）。
type ToolDef struct {
	Name        string
	Description string
	Parameters  json.RawMessage
}

// toolDefWire ToolDef 的 OpenAI 协议线格式（type+function 嵌套）。
type toolDefWire struct {
	Type     string `json:"type"`
	Function struct {
		Name        string          `json:"name"`
		Description string          `json:"description,omitempty"`
		Parameters  json.RawMessage `json:"parameters,omitempty"`
	} `json:"function"`
}

// MarshalJSON 序列化为 OpenAI 协议形状：{"type":"function","function":{...}}。
// Parameters 为空时补一个空 object schema，避免供应商因缺 parameters 报参数错误。
func (t ToolDef) MarshalJSON() ([]byte, error) {
	w := toolDefWire{Type: "function"}
	w.Function.Name = t.Name
	w.Function.Description = t.Description
	if len(t.Parameters) > 0 {
		w.Function.Parameters = t.Parameters
	} else {
		w.Function.Parameters = json.RawMessage(`{"type":"object","properties":{}}`)
	}
	return json.Marshal(w)
}

// UnmarshalJSON 从 OpenAI 协议形状反序列化（测试 mock 回读线格式用）。
func (t *ToolDef) UnmarshalJSON(b []byte) error {
	var w toolDefWire
	if err := json.Unmarshal(b, &w); err != nil {
		return err
	}
	t.Name = w.Function.Name
	t.Description = w.Function.Description
	t.Parameters = w.Function.Parameters
	return nil
}

// ChatRequest 一次对话补全请求。Model 留空用网关默认模型；
// UserID/Feature 不发给供应商，只用于记账定位「谁、哪个功能」在用。
type ChatRequest struct {
	Messages    []Message
	Model       string
	Temperature *float64
	MaxTokens   int
	// Tools 工具定义列表（OpenAI function calling）。非空时请求跳过响应缓存
	//（cacheKey 未含 tools，避免错误命中），且供应商可能返回 tool_calls。
	Tools []ToolDef
	// ToolChoice 工具选择策略（如 "auto"），空则不发送（供应商默认 auto）。
	ToolChoice string
	// EnableSearch 供应商侧联网搜索（DashScope 通义系 enable_search 扩展字段，
	// 服务端搜索后并入上下文；其他供应商可能忽略或报错，由调用方按模型能力决定）。
	EnableSearch bool
	// EnableThinking 思考模式（推理模型 reasoning_content；内部走流式聚合）。
	EnableThinking bool
	// ThinkEffort 思考强度（low|medium|high，支持该参数的模型才生效），空=供应商默认。
	ThinkEffort string
	// UserID 发起用户 ID，记账用；0 表示系统定时任务。
	UserID uint
	// Feature 功能标识，如 geo.monitor / assessment.report，记账用。
	Feature string
}

// ChatResponse 对话补全结果。Content 与 ToolCalls 互斥出现：带工具的请求若模型
// 决定调用工具，Content 可能为空而 ToolCalls 非空，由调用方执行工具后回填 tool 消息续聊。
type ChatResponse struct {
	Content          string
	Model            string
	PromptTokens     int
	CompletionTokens int
	TotalTokens      int
	ToolCalls        []ToolCall
	// Reasoning 思考过程文本（EnableThinking 时推理模型返回），非思考请求为空。
	Reasoning string
	FromCache bool
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
	// 带 Tools/思考模式的请求跳过响应缓存：cacheKey 未含 tools/thinking（不同工具集
	// 或思考开关同 prompt 会错命中），工具轮与思考过程本就不宜缓存复用。
	hasTools := len(req.Tools) > 0
	noCache := hasTools || req.EnableThinking

	// 1) 响应缓存：命中直接返回，不消耗供应商额度与限流配额。
	if c.opts.Cache != nil && !noCache {
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
		ToolCalls:        raw.ToolCalls,
		Reasoning:        raw.Reasoning,
	}

	// 4) 写缓存（带 Tools/思考的请求不写，见上）。
	if c.opts.Cache != nil && !noCache {
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
