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
)

// Provider 模型供应商抽象。新增供应商实现该接口即可；当前 OpenAI 兼容实现已覆盖
// DeepSeek / 通义 DashScope 兼容模式 / 自建 OpenAI 兼容网关等主流形态。
type Provider interface {
	Name() string
	ChatCompletion(ctx context.Context, req ChatRequest, model string) (*rawResult, error)
}

// rawResult 供应商原始返回（网关内部形态，对外收敛为 ChatResponse）。
type rawResult struct {
	Content          string
	PromptTokens     int
	CompletionTokens int
	TotalTokens      int
}

// retryableError 标记可重试错误（429/5xx/网络层失败），重试循环据此分类。
type retryableError struct{ err error }

func (e retryableError) Error() string { return e.err.Error() }

func (e retryableError) Unwrap() error { return e.err }

func isRetryable(err error) bool {
	var re retryableError
	return errors.As(err, &re)
}

// apiError 供应商返回的非 2xx。Body 已提炼为错误摘要（不含 prompt），可安全落日志。
type apiError struct {
	StatusCode int
	Body       string
}

func (e *apiError) Error() string {
	return fmt.Sprintf("provider http %d: %s", e.StatusCode, e.Body)
}

// maxResponseBytes 响应体读取上限（1MB），防异常响应撑爆内存；正常 LLM 回复远小于此。
const maxResponseBytes = 1 << 20

// openAICompat OpenAI chat completions 兼容供应商。
// baseURL 填根地址（如 https://api.deepseek.com 或
// https://dashscope.aliyuncs.com/compatible-mode/v1），本实现固定拼 /chat/completions。
type openAICompat struct {
	name    string
	baseURL string
	apiKey  string
	client  *http.Client
}

func newOpenAICompat(name, baseURL, apiKey string, timeout time.Duration) *openAICompat {
	return &openAICompat{
		name:    name,
		baseURL: strings.TrimRight(baseURL, "/"),
		apiKey:  apiKey,
		client:  &http.Client{Timeout: timeout},
	}
}

func (p *openAICompat) Name() string { return p.name }

type openAIChatRequest struct {
	Model       string    `json:"model"`
	Messages    []Message `json:"messages"`
	Temperature *float64  `json:"temperature,omitempty"`
	MaxTokens   int       `json:"max_tokens,omitempty"`
}

type openAIChatResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
	Usage struct {
		PromptTokens     int `json:"prompt_tokens"`
		CompletionTokens int `json:"completion_tokens"`
		TotalTokens      int `json:"total_tokens"`
	} `json:"usage"`
}

type openAIErrorBody struct {
	Error struct {
		Message string `json:"message"`
		Type    string `json:"type"`
		Code    string `json:"code"`
	} `json:"error"`
}

func (p *openAICompat) ChatCompletion(ctx context.Context, req ChatRequest, model string) (*rawResult, error) {
	payload, err := json.Marshal(openAIChatRequest{
		Model:       model,
		Messages:    req.Messages,
		Temperature: req.Temperature,
		MaxTokens:   req.MaxTokens,
	})
	if err != nil {
		return nil, fmt.Errorf("llm: marshal request: %w", err)
	}
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, p.baseURL+"/chat/completions", bytes.NewReader(payload))
	if err != nil {
		return nil, fmt.Errorf("llm: build request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+p.apiKey)

	httpResp, err := p.client.Do(httpReq)
	if err != nil {
		// 网络层失败/超时按可重试处理
		return nil, retryableError{fmt.Errorf("llm: do request: %w", err)}
	}
	defer httpResp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(httpResp.Body, maxResponseBytes))
	if err != nil {
		return nil, retryableError{fmt.Errorf("llm: read response: %w", err)}
	}

	if httpResp.StatusCode != http.StatusOK {
		msg := summarizeErrorBody(body)
		if isRetryableStatus(httpResp.StatusCode) {
			return nil, retryableError{&apiError{StatusCode: httpResp.StatusCode, Body: msg}}
		}
		return nil, &apiError{StatusCode: httpResp.StatusCode, Body: msg}
	}

	var out openAIChatResponse
	if err := json.Unmarshal(body, &out); err != nil {
		return nil, fmt.Errorf("llm: decode response: %w", err)
	}
	if len(out.Choices) == 0 {
		return nil, fmt.Errorf("llm: provider returned empty choices")
	}
	return &rawResult{
		Content:          out.Choices[0].Message.Content,
		PromptTokens:     out.Usage.PromptTokens,
		CompletionTokens: out.Usage.CompletionTokens,
		TotalTokens:      out.Usage.TotalTokens,
	}, nil
}

// isRetryableStatus 429（供应商限流）与 5xx（临时故障）可重试；
// 其余 4xx 是请求本身的问题，重试无意义。
func isRetryableStatus(code int) bool {
	return code == http.StatusTooManyRequests || code >= 500
}

// summarizeErrorBody 提取 OpenAI 风格的 error.message；解析失败则截断原文。
func summarizeErrorBody(body []byte) string {
	var eb openAIErrorBody
	if err := json.Unmarshal(body, &eb); err == nil && eb.Error.Message != "" {
		return truncate(eb.Error.Message, 200)
	}
	return truncate(string(body), 200)
}

// truncate 按字节截断，回退到 UTF-8 字符边界，避免切碎多字节中文。
func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	for i := n; i > n-4 && i > 0; i-- {
		if s[i]&0xC0 != 0x80 {
			return s[:i]
		}
	}
	return s[:n]
}
