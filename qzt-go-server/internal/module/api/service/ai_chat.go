package service

import (
	"context"
	"errors"
	"fmt"
	"strings"

	kbsvc "qzt-go-server/internal/module/kb/service"
	"qzt-go-server/internal/pkg/llm"
	"qzt-go-server/internal/pkg/setting"
)

// ai_chat.go — P26 AI 对话页：admin 内置 AI 助手（MCP「AI 业务系统」叙事的前台包装）
// 的最小多轮对话实现。走 internal/pkg/llm 统一网关（feature=ai.chat 记账），
// 总开关 sys_config ai.chat_enabled 控成本，默认关闭。
//
// 定位：对话注入知识库 RAG 召回（P30 知识库向量检索，文档源=文档站内容），
// 业务实时数据仍不在对话能力内（经营数据走「AI 场景」页）；
// 历史不落库，由前端组件态携带，服务端只取最近 20 条防上下文膨胀。

const (
	// AIChatEnabledKey AI 对话总开关的 sys_config 键（admin「参数配置」可控，写后缓存自动刷新）。
	AIChatEnabledKey = "ai.chat_enabled"

	// aiChatFeature LLM 记账功能标识（sys_llm_usage.feature）。
	aiChatFeature = "ai.chat"

	// aiChatMaxMessages 单次请求最多回传的历史消息条数，防上下文无限膨胀烧 token。
	aiChatMaxMessages = 20

	// aiChatRAGMinScore 知识库召回注入的最低余弦相似度(低于此视为无关切片丢弃)。
	aiChatRAGMinScore = 0.3

	// aiChatRAGTopK 每次对话检索的知识库切片数上限。
	aiChatRAGTopK = 5
)

// aiChatRAGPromptPrefix / Suffix 知识库召回块的注入包装(要求引用来源,无关则忽略防编造)。
const (
	aiChatRAGPromptPrefix = "以下是产品知识库中与用户问题可能相关的资料片段:\n\n"
	aiChatRAGPromptSuffix = "\n\n回答时优先依据上述资料作答,并可用【文档标题】标注来源;资料与问题无关时忽略即可,不要编造资料中没有的内容。"
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
	Reply   string   `json:"reply"`
	Sources []string `json:"sources,omitempty"`
}

// AIChatEnabled 报告 AI 对话总开关是否开启（sys_config ai.chat_enabled=1）。
// 默认关闭（配置缺省按关处理），管理员在界面上显式开启后才生效。
func AIChatEnabled(ctx context.Context) bool {
	return setting.Get(ctx, AIChatEnabledKey) == "1"
}

// Chat 一次对话补全：校验并截取最近 20 条消息，注入系统提示词与知识库 RAG 召回后走统一 LLM 网关。
// 返回 reply 与命中的知识库文档标题列表(sources,供前端展示来源)。
func Chat(ctx context.Context, userID uint, msgs []ChatMessage) (string, []string, error) {
	if !AIChatEnabled(ctx) {
		return "", nil, ErrAIChatDisabled
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
		return "", nil, ErrAIChatEmpty
	}
	if len(clean) > aiChatMaxMessages {
		clean = clean[len(clean)-aiChatMaxMessages:]
	}

	// 知识库 RAG 召回(P30 知识库向量检索):取最后一条用户消息检索,命中的切片注入上下文。
	// RAG 关闭/未配置/无命中时静默跳过(检索内部已自吞错误);来源标题随响应返回供前端展示。
	var sources []string
	lastUser := ""
	for i := len(clean) - 1; i >= 0; i-- {
		if clean[i].Role == "user" {
			lastUser = clean[i].Content
			break
		}
	}
	ragBlocks := make([]string, 0, aiChatRAGTopK)
	if lastUser != "" {
		hits, err := kbsvc.NewRAGService().Search(ctx, lastUser, aiChatRAGTopK)
		if err != nil {
			err = nil // 检索失败不阻断对话(内部已记日志)
		}
		seenDocs := make(map[uint]bool, len(hits))
		for _, h := range hits {
			if h.Score < aiChatRAGMinScore {
				continue
			}
			if !seenDocs[h.DocumentID] {
				seenDocs[h.DocumentID] = true
				sources = append(sources, h.DocTitle)
			}
			ragBlocks = append(ragBlocks, fmt.Sprintf("【%s】\n%s", h.DocTitle, h.Content))
		}
	}

	messages := make([]llm.Message, 0, len(clean)+2)
	messages = append(messages, llm.Message{Role: "system", Content: aiChatSystemPrompt})
	if len(ragBlocks) > 0 {
		messages = append(messages, llm.Message{Role: "system", Content: aiChatRAGPromptPrefix + strings.Join(ragBlocks, "\n\n---\n\n") + aiChatRAGPromptSuffix})
	}
	messages = append(messages, clean...)

	resp, err := llm.Chat(ctx, llm.ChatRequest{
		Messages: messages,
		UserID:   userID,
		Feature:  aiChatFeature,
	})
	if err != nil {
		// 未初始化/未配置 API key 统一成对外友好文案；其余透传（限流、供应商错误摘要）。
		if errors.Is(err, llm.ErrNotInitialized) || errors.Is(err, llm.ErrNotConfigured) {
			return "", nil, ErrAINotConfigured
		}
		return "", nil, err
	}
	return resp.Content, sources, nil
}
