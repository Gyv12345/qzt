// Package vision 视觉模型最小客户端(千问 qwen-vl 系列视觉问答,发票 OCR 用)。
//
// 复用「AI 模型」当前生效档案的 api_key(该 key 就是 DashScope 的 key),端点固定
// DashScope OpenAI 兼容模式 compatible-mode——qwen-vl 系列只在 DashScope 上提供,
// 档案的 base_url 若指向其他供应商也不影响:本客户端 key 取档案、端点用 DashScope
// 固定常量(写死并在此注释说明,避免为同一把 key 引入第二个可配置端点)。
//
// 出网安全:调用前对固定端点做 llm.ValidatePublicBaseURL 校验(常量本身是公网地址,
// 校验是为防常量被误改后把含业务图片的请求引到内网)。
//
// 约束:Service 层调用,Handler 不直接 import;api_key 不落日志。
package vision

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"qzt-go-server/internal/pkg/llm"
)

// DashScopeCompatibleBaseURL DashScope OpenAI 兼容模式根地址(qwen-vl 专用固定端点)。
// 说明:复用的 ai_model 档案 api_key 即 DashScope 的 key,故端点固定此处而非跟随
// 档案 base_url(档案可能指向 DeepSeek 等文本供应商,其端点不接受图片输入)。
const DashScopeCompatibleBaseURL = "https://dashscope.aliyuncs.com/compatible-mode/v1"

// DefaultModel 默认视觉模型(sys_config finance.ocr_model 未配置时)。
const DefaultModel = "qwen-vl-plus"

// maxResponseBytes 响应体读取上限(1MB)。
const maxResponseBytes = 1 << 20

// ContentPart 多模态消息内容分片(OpenAI 兼容格式)。
// 文本分片用 Text 字段;图片分片用 ImageURL 字段(image_url.url 为 base64 data URL)。
type ContentPart struct {
	Type     string    `json:"type"` // "text" / "image_url"
	Text     string    `json:"text,omitempty"`
	ImageURL *ImageURL `json:"image_url,omitempty"`
}

// ImageURL 图片引用(data:image/jpeg;base64,... 形态)。
type ImageURL struct {
	URL string `json:"url"`
}

// VisionMessage 一条多模态消息。纯文本消息可直接填 Content;多模态消息填 Parts。
type VisionMessage struct {
	Role    string        `json:"role"` // system / user
	Content string        `json:"content,omitempty"`
	Parts   []ContentPart `json:"-"`
}

// MarshalJSON Content 与 Parts 互斥:有 Parts 序列化为分片数组,否则为纯文本。
func (m VisionMessage) MarshalJSON() ([]byte, error) {
	if len(m.Parts) > 0 {
		return json.Marshal(struct {
			Role    string        `json:"role"`
			Content []ContentPart `json:"content"`
		}{Role: m.Role, Content: m.Parts})
	}
	return json.Marshal(struct {
		Role    string `json:"role"`
		Content string `json:"content"`
	}{Role: m.Role, Content: m.Content})
}

// VisionChatRequest 一次视觉对话请求。
type VisionChatRequest struct {
	System   string // 系统提示词
	Parts    []ContentPart
	Model    string // 留空用 DefaultModel
	MaxTokens int
	Timeout  time.Duration
}

// VisionChatResponse 视觉对话结果。
type VisionChatResponse struct {
	Content          string
	Model            string
	PromptTokens     int
	CompletionTokens int
	TotalTokens      int
}

type visionChatRequest struct {
	Model    string          `json:"model"`
	Messages []VisionMessage `json:"messages"`
	MaxTokens int            `json:"max_tokens,omitempty"`
}

type visionChatResponse struct {
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

type visionErrorBody struct {
	Error struct {
		Message string `json:"message"`
		Code    string `json:"code"`
	} `json:"error"`
}

// VisionChat 发起一次视觉对话(阻塞单次调用,不缓存不限流不记账——发票 OCR
// 单图成本可控,额度由调用方(每用户每日计数)控制)。
// apiKey 从「AI 模型」生效档案读取(服务层传入),不校验则直接失败。
func VisionChat(ctx context.Context, apiKey string, req VisionChatRequest) (*VisionChatResponse, error) {
	if apiKey == "" {
		return nil, fmt.Errorf("vision: api key 未配置(请在后台「AI 模型」配置通义千问档案)")
	}
	if err := llm.ValidatePublicBaseURL(DashScopeCompatibleBaseURL); err != nil {
		return nil, fmt.Errorf("vision: 端点校验失败: %v", err)
	}
	model := req.Model
	if model == "" {
		model = DefaultModel
	}
	timeout := req.Timeout
	if timeout <= 0 {
		timeout = 60 * time.Second
	}
	payload, err := json.Marshal(visionChatRequest{
		Model: model,
		Messages: []VisionMessage{
			{Role: "system", Content: req.System},
			{Role: "user", Parts: req.Parts},
		},
		MaxTokens: req.MaxTokens,
	})
	if err != nil {
		return nil, fmt.Errorf("vision: marshal request: %w", err)
	}
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost,
		DashScopeCompatibleBaseURL+"/chat/completions", bytes.NewReader(payload))
	if err != nil {
		return nil, fmt.Errorf("vision: build request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+apiKey)

	client := &http.Client{Timeout: timeout}
	httpResp, err := client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("vision: do request: %w", err)
	}
	defer httpResp.Body.Close()
	body, err := io.ReadAll(io.LimitReader(httpResp.Body, maxResponseBytes))
	if err != nil {
		return nil, fmt.Errorf("vision: read response: %w", err)
	}
	if httpResp.StatusCode != http.StatusOK {
		msg := summarizeVisionError(body)
		return nil, fmt.Errorf("vision: provider http %d: %s", httpResp.StatusCode, msg)
	}
	var out visionChatResponse
	if err := json.Unmarshal(body, &out); err != nil {
		return nil, fmt.Errorf("vision: decode response: %w", err)
	}
	if len(out.Choices) == 0 {
		return nil, fmt.Errorf("vision: provider returned empty choices")
	}
	return &VisionChatResponse{
		Content:          out.Choices[0].Message.Content,
		Model:            model,
		PromptTokens:     out.Usage.PromptTokens,
		CompletionTokens: out.Usage.CompletionTokens,
		TotalTokens:      out.Usage.TotalTokens,
	}, nil
}

// summarizeVisionError 提取 DashScope 风格 error.message;解析失败则截断原文。
func summarizeVisionError(body []byte) string {
	var eb visionErrorBody
	if err := json.Unmarshal(body, &eb); err == nil && eb.Error.Message != "" {
		return truncate(eb.Error.Message, 200)
	}
	return truncate(string(body), 200)
}

// truncate 按字节截断并回退到 UTF-8 字符边界。
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

// BuildImagePart 由 MIME 类型与 base64 内容构造图片分片(data URL 形态)。
func BuildImagePart(mimeType, base64Data string) ContentPart {
	return ContentPart{
		Type:     "image_url",
		ImageURL: &ImageURL{URL: "data:" + mimeType + ";base64," + base64Data},
	}
}

// BuildTextPart 构造文本分片。
func BuildTextPart(text string) ContentPart {
	return ContentPart{Type: "text", Text: text}
}
