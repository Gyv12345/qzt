package llmclient

// llmclient.go OpenAI 兼容接口的 LLM 客户端。
// 支持 DeepSeek / 通义千问 / OpenAI / 任何兼容 /v1/chat/completions 的服务商。
// 配置从 sys_config (setting.Get) 热读取,改配置后立即生效无需重启。

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"qzt-go-server/internal/pkg/setting"
	"qzt-go-server/pkg/xlogger"
)

// Message OpenAI chat 消息格式。
type Message struct {
	Role    string `json:"role"`    // system / user / assistant
	Content string `json:"content"`
}

// Options LLM 调用选项(可选,覆盖全局配置)。
type Options struct {
	Model       string  // 指定模型(空=用全局 ai.model)
	Temperature float64 // 温度(0 表示用全局配置)
	MaxTokens   int     // 最大 token(0 表示用全局配置)
}

// config 缓存单次调用所需的配置(每次从 setting 现读)。
type llmConfig struct {
	BaseURL     string
	APIKey      string
	Model       string
	Temperature float64
	MaxTokens   int
}

var httpClient = &http.Client{Timeout: 90 * time.Second} // LLM 响应慢,90s 超时

// loadConfig 从 sys_config 读取 LLM 连接配置(每次调用现读,热配置)。
func loadConfig(ctx context.Context) (llmConfig, error) {
	cfg := llmConfig{
		BaseURL: strings.TrimSuffix(setting.Get(ctx, "ai.base_url"), "/"),
		APIKey:  setting.Get(ctx, "ai.api_key"),
		Model:   setting.Get(ctx, "ai.model"),
	}
	if cfg.BaseURL == "" {
		cfg.BaseURL = "https://api.deepseek.com/v1"
	}
	if cfg.Model == "" {
		cfg.Model = "deepseek-chat"
	}
	if v := setting.Get(ctx, "ai.temperature"); v != "" {
		fmt.Sscanf(v, "%f", &cfg.Temperature)
	} else {
		cfg.Temperature = 0.7
	}
	if v := setting.Get(ctx, "ai.max_tokens"); v != "" {
		fmt.Sscanf(v, "%d", &cfg.MaxTokens)
	} else {
		cfg.MaxTokens = 2000
	}
	if cfg.APIKey == "" {
		return cfg, fmt.Errorf("AI 未配置: 请在系统配置里填写 ai.api_key")
	}
	return cfg, nil
}

// ChatComplete 调用 OpenAI 兼容的 /chat/completions 接口,返回助手回复文本。
// messages 至少含一条;opts 可覆盖全局模型/温度/max_tokens。
func ChatComplete(ctx context.Context, messages []Message, opts Options) (string, error) {
	cfg, err := loadConfig(ctx)
	if err != nil {
		return "", err
	}

	model := opts.Model
	if model == "" {
		model = cfg.Model
	}
	temp := cfg.Temperature
	if opts.Temperature > 0 {
		temp = opts.Temperature
	}
	maxTokens := cfg.MaxTokens
	if opts.MaxTokens > 0 {
		maxTokens = opts.MaxTokens
	}

	// 构造请求体(与 OpenAI API 完全兼容)
	reqBody := map[string]interface{}{
		"model":       model,
		"messages":    messages,
		"temperature": temp,
		"max_tokens":  maxTokens,
	}
	bodyJSON, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("序列化请求失败: %w", err)
	}

	url := cfg.BaseURL + "/chat/completions"
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(bodyJSON))
	if err != nil {
		return "", fmt.Errorf("创建请求失败: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+cfg.APIKey)

	xlogger.InfofCtx(ctx, "LLM 调用: model=%s, msgs=%d, url=%s", model, len(messages), url)

	resp, err := httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("LLM 请求失败: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("读取响应失败: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("LLM 返回错误 %d: %s", resp.StatusCode, string(respBody))
	}

	// 解析 OpenAI 响应格式
	var result struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
		Error *struct {
			Message string `json:"message"`
			Type    string `json:"type"`
		} `json:"error,omitempty"`
	}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return "", fmt.Errorf("解析响应失败: %w", err)
	}
	if result.Error != nil {
		return "", fmt.Errorf("LLM 错误: %s", result.Error.Message)
	}
	if len(result.Choices) == 0 {
		return "", fmt.Errorf("LLM 返回空结果")
	}

	return result.Choices[0].Message.Content, nil
}

// IsEnabled 检查 AI 功能是否启用。
func IsEnabled(ctx context.Context) bool {
	v := setting.Get(ctx, "ai.enabled")
	return v == "" || v == "true" || v == "1" // 默认启用(空=启用)
}
