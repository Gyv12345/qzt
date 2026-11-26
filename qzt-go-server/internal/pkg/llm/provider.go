package llm

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"sort"
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
	// ToolCalls 供应商返回的工具调用请求（function calling），普通回复为空。
	ToolCalls []ToolCall
	// Reasoning 推理模型的思考过程（reasoning_content），非思考请求为空。
	Reasoning string
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
	// Tools 工具定义（OpenAI function calling），空省略。
	Tools []ToolDef `json:"tools,omitempty"`
	// ToolChoice 工具选择策略（如 auto），空省略（供应商默认 auto）。
	ToolChoice string `json:"tool_choice,omitempty"`
	// EnableSearch 供应商侧联网搜索扩展（DashScope 通义系支持服务端搜索），
	// true 才发送；不支持该字段的供应商可能忽略或报错。
	EnableSearch bool `json:"enable_search,omitempty"`
	// EnableThinking 推理思考模式（DashScope qwen3 系 enable_thinking；仅流式支持——
	// 开启时走内部 SSE 聚合，对外仍非流式）。
	EnableThinking bool `json:"enable_thinking,omitempty"`
	// ReasoningEffort 思考强度（OpenAI o 系语义 low|medium|high；支持该参数的
	// 模型才生效，qwen3 同名透传），空省略。
	ReasoningEffort string `json:"reasoning_effort,omitempty"`
	// StreamOptions 流式选项（stream=true 时携带 include_usage 取最终用量）。
	StreamOptions *openAIStreamOptions `json:"stream_options,omitempty"`
	// Stream 是否流式请求（仅思考模式内部聚合路径使用）。
	Stream bool `json:"stream,omitempty"`
}

// openAIStreamOptions 流式请求选项。
type openAIStreamOptions struct {
	IncludeUsage bool `json:"include_usage"`
}

type openAIChatResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
			// ToolCalls 模型请求的工具调用（function calling），普通回复时缺省。
			ToolCalls []ToolCall `json:"tool_calls"`
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
	// 思考模式仅流式支持(DashScope 约束):内部走 SSE 聚合,对外仍是非流式 rawResult。
	if req.EnableThinking {
		return p.streamAggreg(ctx, req, model)
	}
	payload, err := json.Marshal(openAIChatRequest{
		Model:           model,
		Messages:        req.Messages,
		Temperature:     req.Temperature,
		MaxTokens:       req.MaxTokens,
		Tools:           req.Tools,
		ToolChoice:      req.ToolChoice,
		EnableSearch:    req.EnableSearch,
		EnableThinking:  req.EnableThinking,
		ReasoningEffort: req.ThinkEffort,
		StreamOptions:   nil, // 思考路径由 streamAggreg 自行构造(stream:true+include_usage)
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
		ToolCalls:        out.Choices[0].Message.ToolCalls,
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

// ── 思考模式内部 SSE 聚合 ──
// DashScope qwen3 系思考模式仅支持流式输出:这里以 stream=true 发请求,
// 聚合 delta(reasoning_content/content/tool_calls) 后返回完整 rawResult,
// 对上层(Chat/ai_chat)完全透明——上层仍以非流式语义消费。

// sseChunk 一条流式增量。
type sseChunk struct {
	Choices []struct {
		Delta struct {
			Content   string `json:"content"`
			Reasoning string `json:"reasoning_content"`
			// ToolCalls 流式工具调用增量:id/name 首片携带,arguments 逐片拼接。
			ToolCalls []struct {
				Index    int    `json:"index"`
				ID       string `json:"id"`
				Name     string `json:"name"` // 仅 function.name 的一部分时各家不一,按全量拼接
				Function struct {
					Name      string `json:"name"`
					Arguments string `json:"arguments"`
				} `json:"function"`
			} `json:"tool_calls"`
		} `json:"delta"`
		FinishReason string `json:"finish_reason"`
	} `json:"choices"`
	Usage *struct {
		PromptTokens     int `json:"prompt_tokens"`
		CompletionTokens int `json:"completion_tokens"`
		TotalTokens      int `json:"total_tokens"`
	} `json:"usage"`
}

// streamAggreg 以流式请求聚合出非流式结果(思考模式专用路径)。
func (p *openAICompat) streamAggreg(ctx context.Context, req ChatRequest, model string) (*rawResult, error) {
	payload, err := json.Marshal(openAIChatRequest{
		Model:           model,
		Messages:        req.Messages,
		Temperature:     req.Temperature,
		MaxTokens:       req.MaxTokens,
		Tools:           req.Tools,
		ToolChoice:      req.ToolChoice,
		EnableSearch:    req.EnableSearch,
		EnableThinking:  true,
		ReasoningEffort: req.ThinkEffort,
		Stream:          true,
		StreamOptions:   &openAIStreamOptions{IncludeUsage: true},
	})
	if err != nil {
		return nil, fmt.Errorf("llm: marshal stream request: %w", err)
	}
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, p.baseURL+"/chat/completions", bytes.NewReader(payload))
	if err != nil {
		return nil, fmt.Errorf("llm: build stream request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+p.apiKey)

	httpResp, err := p.client.Do(httpReq)
	if err != nil {
		return nil, retryableError{fmt.Errorf("llm: do stream request: %w", err)}
	}
	defer httpResp.Body.Close()
	if httpResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(httpResp.Body, maxResponseBytes))
		msg := summarizeErrorBody(body)
		if isRetryableStatus(httpResp.StatusCode) {
			return nil, retryableError{&apiError{StatusCode: httpResp.StatusCode, Body: msg}}
		}
		return nil, &apiError{StatusCode: httpResp.StatusCode, Body: msg}
	}

	sc := bufio.NewScanner(httpResp.Body)
	sc.Buffer(make([]byte, 0, 64*1024), maxResponseBytes)
	out := &rawResult{}
	var tcAgg = map[int]*ToolCall{} // index → 聚合中的 tool_call
	for sc.Scan() {
		line := strings.TrimSpace(sc.Text())
		if !strings.HasPrefix(line, "data:") {
			continue
		}
		data := strings.TrimSpace(strings.TrimPrefix(line, "data:"))
		if data == "[DONE]" {
			break
		}
		var ch sseChunk
		if err := json.Unmarshal([]byte(data), &ch); err != nil {
			continue // 非 JSON 行(心跳/注释)跳过
		}
		if ch.Usage != nil {
			out.PromptTokens = ch.Usage.PromptTokens
			out.CompletionTokens = ch.Usage.CompletionTokens
			out.TotalTokens = ch.Usage.TotalTokens
		}
		if len(ch.Choices) == 0 {
			continue
		}
		d := ch.Choices[0].Delta
		out.Content += d.Content
		out.Reasoning += d.Reasoning
		for _, tc := range d.ToolCalls {
			agg, ok := tcAgg[tc.Index]
			if !ok {
				agg = &ToolCall{}
				tcAgg[tc.Index] = agg
			}
			if tc.ID != "" {
				agg.ID = tc.ID
			}
			name := tc.Function.Name
			if name == "" {
				name = tc.Name
			}
			agg.Name += name
			agg.Arguments += tc.Function.Arguments
		}
	}
	if err := sc.Err(); err != nil {
		return nil, retryableError{fmt.Errorf("llm: read stream: %w", err)}
	}
	// index 升序还原 tool_calls
	if len(tcAgg) > 0 {
		idxs := make([]int, 0, len(tcAgg))
		for i := range tcAgg {
			idxs = append(idxs, i)
		}
		sort.Ints(idxs)
		for _, i := range idxs {
			out.ToolCalls = append(out.ToolCalls, *tcAgg[i])
		}
	}
	if out.Content == "" && out.Reasoning == "" && len(out.ToolCalls) == 0 {
		return nil, fmt.Errorf("llm: provider stream returned empty content")
	}
	return out, nil
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
