// Package llm — embedding.go 向量嵌入客户端（P17 知识库 RAG）。
//
// OpenAI 兼容 /embeddings 协议，独立于 Chat 的配置节（embedding 供应商常与 chat
// 不同家）。复用 provider.go 的错误分类（apiError/retryableError）与 truncate，
// 重试语义与 Chat 一致：仅 429/5xx/网络错误重试。调用频率低（文档保存时批量
// 向量化 + 生成前查询向量化），不做进程级限流；记账复用 UsageRecorder
// （sys_llm_usage，feature=kb.rag.embed），无响应缓存（向量体大缓存收益低）。
package llm

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"qzt-go-server/config"
	"qzt-go-server/pkg/xlogger"
)

// maxEmbedBatch 单次 /embeddings 请求的文本条数上限。通义 text-embedding-v3
// 批量上限 10，取其保守值；超出部分客户端内部自动分批。
const maxEmbedBatch = 10

// EmbeddingOptions 嵌入客户端装配选项。
type EmbeddingOptions struct {
	BaseURL    string
	APIKey     string
	Model      string
	Timeout    time.Duration
	MaxRetries int
	// Recorder 记账后端，nil 用默认 MySQL 实现（sys_llm_usage）。
	Recorder UsageRecorder
}

// EmbeddingRequest 一次批量嵌入请求。UserID/Feature 只用于记账定位，不发供应商。
type EmbeddingRequest struct {
	Texts   []string
	UserID  uint
	Feature string
}

// EmbeddingResponse 批量嵌入结果。Vectors 与请求 Texts 一一对应。
type EmbeddingResponse struct {
	Vectors      [][]float64
	Model        string
	PromptTokens int
	TotalTokens  int
	LatencyMs    int64
}

// EmbeddingClient 向量嵌入客户端。零值不可用，经 InitEmbedding 装配包级单例。
type EmbeddingClient struct {
	opts     EmbeddingOptions
	provider *openAIEmbed
	recorder UsageRecorder
}

// embGW 包级嵌入客户端单例（InitEmbedding 装配）。
var embGW *EmbeddingClient

// InitEmbedding 装配包级嵌入客户端（main.go 启动时调用）；APIKey 为空也允许装配——
// Embeddings 会返回 ErrNotConfigured，调用方可用 EmbeddingEnabled() 预判。
func InitEmbedding(o EmbeddingOptions) {
	if o.Timeout <= 0 {
		o.Timeout = 30 * time.Second
	}
	if o.Recorder == nil {
		o.Recorder = dbRecorder{}
	}
	embGW = &EmbeddingClient{
		opts:     o,
		provider: newOpenAIEmbed(o.BaseURL, o.APIKey, o.Timeout),
		recorder: o.Recorder,
	}
}

// EmbeddingConfigToOptions 从配置节生成装配选项。
func EmbeddingConfigToOptions(c config.EmbeddingConfig) EmbeddingOptions {
	return EmbeddingOptions{
		BaseURL:    c.BaseURL,
		APIKey:     c.APIKey,
		Model:      c.Model,
		Timeout:    c.Timeout,
		MaxRetries: c.MaxRetries,
	}
}

// EmbeddingEnabled 报告嵌入客户端是否已配置可用（Service 层可据此走降级路径）。
func EmbeddingEnabled() bool {
	return embGW != nil && embGW.opts.APIKey != ""
}

// Embeddings 包级函数：走包级嵌入客户端发起一次批量嵌入。
func Embeddings(ctx context.Context, req EmbeddingRequest) (EmbeddingResponse, error) {
	if embGW == nil {
		return EmbeddingResponse{}, ErrNotInitialized
	}
	return embGW.Embeddings(ctx, req)
}

// Embeddings 批量嵌入：超 maxEmbedBatch 自动分批串行调用，任一批失败即整体失败；
// 返回向量与请求文本按原序一一对应。
func (c *EmbeddingClient) Embeddings(ctx context.Context, req EmbeddingRequest) (EmbeddingResponse, error) {
	if c == nil {
		return EmbeddingResponse{}, ErrNotInitialized
	}
	if c.opts.APIKey == "" {
		return EmbeddingResponse{}, ErrNotConfigured
	}
	if len(req.Texts) == 0 {
		return EmbeddingResponse{}, errors.New("llm: embedding texts is empty")
	}

	start := time.Now()
	all := make([][]float64, 0, len(req.Texts))
	promptTokens, totalTokens := 0, 0
	for i := 0; i < len(req.Texts); i += maxEmbedBatch {
		end := i + maxEmbedBatch
		if end > len(req.Texts) {
			end = len(req.Texts)
		}
		vecs, pt, tt, err := c.embedBatch(ctx, req.Texts[i:end])
		if err != nil {
			c.record(ctx, req, c.opts.Model, 0, 0, time.Since(start).Milliseconds(), err)
			return EmbeddingResponse{}, err
		}
		all = append(all, vecs...)
		promptTokens += pt
		totalTokens += tt
	}

	latency := time.Since(start).Milliseconds()
	c.record(ctx, req, c.opts.Model, promptTokens, totalTokens, latency, nil)
	xlogger.InfofCtx(ctx, "llm: embedding ok feature=%s user=%d model=%s texts=%d tokens=%d latency=%dms",
		req.Feature, req.UserID, c.opts.Model, len(req.Texts), totalTokens, latency)
	return EmbeddingResponse{
		Vectors:      all,
		Model:        c.opts.Model,
		PromptTokens: promptTokens,
		TotalTokens:  totalTokens,
		LatencyMs:    latency,
	}, nil
}

// embedBatch 单批调用（带重试，语义同 Chat：仅 429/5xx/网络错误重试，
// 指数退避 200ms×2^n）。
func (c *EmbeddingClient) embedBatch(ctx context.Context, batch []string) ([][]float64, int, int, error) {
	var lastErr error
	for attempt := 0; attempt <= c.opts.MaxRetries; attempt++ {
		if attempt > 0 {
			backoff := time.Duration(1<<uint(attempt-1)) * 200 * time.Millisecond
			select {
			case <-ctx.Done():
				return nil, 0, 0, ctx.Err()
			case <-time.After(backoff):
			}
		}
		vecs, pt, tt, err := c.provider.Embeddings(ctx, c.opts.Model, batch)
		if err == nil {
			return vecs, pt, tt, nil
		}
		lastErr = err
		if !isRetryable(err) {
			return nil, 0, 0, err
		}
		xlogger.InfofCtx(ctx, "llm: embedding attempt %d/%d failed, will retry: %v",
			attempt+1, c.opts.MaxRetries+1, err)
	}
	return nil, 0, 0, lastErr
}

// ── OpenAI 兼容 /embeddings 供应商实现 ──

// openAIEmbed OpenAI 兼容 embeddings 供应商（固定拼 {baseURL}/embeddings）。
// baseURL 填根地址（如 https://dashscope.aliyuncs.com/compatible-mode/v1）。
type openAIEmbed struct {
	baseURL string
	apiKey  string
	client  *http.Client
}

func newOpenAIEmbed(baseURL, apiKey string, timeout time.Duration) *openAIEmbed {
	return &openAIEmbed{
		baseURL: strings.TrimRight(baseURL, "/"),
		apiKey:  apiKey,
		client:  &http.Client{Timeout: timeout},
	}
}

type openAIEmbedRequest struct {
	Model string   `json:"model"`
	Input []string `json:"input"`
}

type openAIEmbedResponse struct {
	Data []struct {
		Embedding []float64 `json:"embedding"`
		Index     int       `json:"index"`
	} `json:"data"`
	Usage struct {
		PromptTokens int `json:"prompt_tokens"`
		TotalTokens  int `json:"total_tokens"`
	} `json:"usage"`
}

// Embeddings 单批 HTTP 调用（不带重试——重试在 EmbeddingClient 层循环处理）。
// 按 index 回填向量（供应商可能乱序返回），条数不符即报错。
func (p *openAIEmbed) Embeddings(ctx context.Context, model string, texts []string) ([][]float64, int, int, error) {
	payload, err := json.Marshal(openAIEmbedRequest{Model: model, Input: texts})
	if err != nil {
		return nil, 0, 0, fmt.Errorf("llm: marshal request: %w", err)
	}
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, p.baseURL+"/embeddings", bytes.NewReader(payload))
	if err != nil {
		return nil, 0, 0, fmt.Errorf("llm: build request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+p.apiKey)

	httpResp, err := p.client.Do(httpReq)
	if err != nil {
		// 网络层失败/超时按可重试处理
		return nil, 0, 0, retryableError{fmt.Errorf("llm: do request: %w", err)}
	}
	defer httpResp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(httpResp.Body, maxResponseBytes))
	if err != nil {
		return nil, 0, 0, retryableError{fmt.Errorf("llm: read response: %w", err)}
	}

	if httpResp.StatusCode != http.StatusOK {
		msg := summarizeErrorBody(body)
		if isRetryableStatus(httpResp.StatusCode) {
			return nil, 0, 0, retryableError{&apiError{StatusCode: httpResp.StatusCode, Body: msg}}
		}
		return nil, 0, 0, &apiError{StatusCode: httpResp.StatusCode, Body: msg}
	}

	var out openAIEmbedResponse
	if err := json.Unmarshal(body, &out); err != nil {
		return nil, 0, 0, fmt.Errorf("llm: decode response: %w", err)
	}
	if len(out.Data) != len(texts) {
		return nil, 0, 0, fmt.Errorf("llm: provider returned %d vectors for %d texts", len(out.Data), len(texts))
	}
	// 按 index 回填，防供应商乱序返回。
	vecs := make([][]float64, len(texts))
	for _, d := range out.Data {
		if d.Index >= 0 && d.Index < len(vecs) && vecs[d.Index] == nil {
			vecs[d.Index] = d.Embedding
		}
	}
	for i, v := range vecs {
		if v == nil {
			return nil, 0, 0, fmt.Errorf("llm: provider missing vector at index %d", i)
		}
	}
	return vecs, out.Usage.PromptTokens, out.Usage.TotalTokens, nil
}

// record 嵌入记账：成功与失败都落；embeddings 无 completion 概念记 0，
// 失败只落错误摘要，不落文本内容（与 Chat 的 record 同口径）。
func (c *EmbeddingClient) record(ctx context.Context, req EmbeddingRequest, model string,
	promptTokens, totalTokens int, latencyMs int64, callErr error) {
	u := Usage{
		UserID:           req.UserID,
		Feature:          req.Feature,
		Provider:         "embedding",
		Model:            model,
		PromptTokens:     promptTokens,
		CompletionTokens: 0,
		TotalTokens:      totalTokens,
		FromCache:        false,
		LatencyMs:        latencyMs,
		Status:           "ok",
	}
	if callErr != nil {
		u.Status = "error"
		u.ErrMsg = truncate(callErr.Error(), 250)
	}
	c.recorder.Record(ctx, u)
}

