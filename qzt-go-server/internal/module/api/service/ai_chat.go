package service

import (
	"context"
	"errors"
	"strings"

	"qzt-go-server/internal/pkg/llm"
	"qzt-go-server/internal/pkg/setting"
)

// ai_chat.go — P26 AI 对话页：admin 内置 AI 助手（MCP「AI 业务系统」叙事的前台包装）
// 的最小多轮对话实现。走 internal/pkg/llm 统一网关（feature=ai.chat 记账），
// 总开关 sys_config ai.chat_enabled 控成本，默认关闭。
//
// 定位：不查任何业务数据（AI 无法直接访问库），纯前台对话；
// 历史不落库，由前端组件态携带，服务端只取最近 20 条防上下文膨胀。

const (
	// AIChatEnabledKey AI 对话总开关的 sys_config 键（admin「参数配置」可控，写后缓存自动刷新）。
	AIChatEnabledKey = "ai.chat_enabled"

	// aiChatFeature LLM 记账功能标识（sys_llm_usage.feature）。
	aiChatFeature = "ai.chat"

	// aiChatMaxMessages 单次请求最多回传的历史消息条数，防上下文无限膨胀烧 token。
	aiChatMaxMessages = 20
)

// aiChatSystemPrompt 系统提示词：前台包装定位，业务数据问题引导用户用对应模块。
const aiChatSystemPrompt = "你是行简一体化管理平台的 AI 助手。回答简洁、专业，用中文。" +
	"你无法直接查询企业业务数据，涉及业务数据的问题请引导用户使用系统对应模块。"

// ErrAIChatDisabled AI 对话总开关关闭（默认关）。
var ErrAIChatDisabled = errors.New("AI 助手未开启，请在 系统管理 → 参数配置 中开启")

// ErrAIChatEmpty messages 校验失败。
var ErrAIChatEmpty = errors.New("messages 至少需要 1 条有效消息（role 为 user/assistant 且 content 非空）")

// ErrAINotConfigured LLM 网关未配置 API key 的对外文案。
var ErrAINotConfigured = errors.New("AI 模型未配置，请联系管理员配置 LLM_API_KEY")

// ChatMessage 一条对话消息（OpenAI 语义的 user/assistant，不收 system——由服务端统一注入）。
type ChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// AIChatRequest AI 对话请求。
type AIChatRequest struct {
	Messages []ChatMessage `json:"messages"`
}

// AIChatResponse AI 对话响应。
type AIChatResponse struct {
	Reply string `json:"reply"`
}

// AIChatEnabled 报告 AI 对话总开关是否开启（sys_config ai.chat_enabled=1）。
// 默认关闭（配置缺省按关处理），管理员在界面上显式开启后才生效。
func AIChatEnabled(ctx context.Context) bool {
	return setting.Get(ctx, AIChatEnabledKey) == "1"
}

// Chat 一次对话补全：校验并截取最近 20 条消息，注入系统提示词后走统一 LLM 网关。
func Chat(ctx context.Context, userID uint, msgs []ChatMessage) (string, error) {
	if !AIChatEnabled(ctx) {
		return "", ErrAIChatDisabled
	}

	clean := make([]llm.Message, 0, len(msgs))
	for _, m := range msgs {
		content := strings.TrimSpace(m.Content)
		if content == "" {
			continue
		}
		role := strings.TrimSpace(m.Role)
		if role != "user" && role != "assistant" {
			continue
		}
		clean = append(clean, llm.Message{Role: role, Content: content})
	}
	if len(clean) == 0 {
		return "", ErrAIChatEmpty
	}
	if len(clean) > aiChatMaxMessages {
		clean = clean[len(clean)-aiChatMaxMessages:]
	}

	messages := make([]llm.Message, 0, len(clean)+1)
	messages = append(messages, llm.Message{Role: "system", Content: aiChatSystemPrompt})
	messages = append(messages, clean...)

	resp, err := llm.Chat(ctx, llm.ChatRequest{
		Messages: messages,
		UserID:   userID,
		Feature:  aiChatFeature,
	})
	if err != nil {
		// 未初始化/未配置 API key 统一成对外友好文案；其余透传（限流、供应商错误摘要）。
		if errors.Is(err, llm.ErrNotInitialized) || errors.Is(err, llm.ErrNotConfigured) {
			return "", ErrAINotConfigured
		}
		return "", err
	}
	return resp.Content, nil
}
