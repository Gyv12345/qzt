package service

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	kbsvc "qzt-go-server/internal/module/kb/service"
	"qzt-go-server/internal/pkg/llm"
	"qzt-go-server/internal/pkg/setting"
)

// ai_chat.go — P26 AI 对话页：admin 内置 AI 助手（MCP「AI 业务系统」叙事的前台包装）
// 的最小多轮对话实现。走 internal/pkg/llm 统一网关（feature=ai.chat 记账），
// 总开关 sys_config ai.chat_enabled 控成本，默认关闭。
//
// P34 全局 AI 悬浮球升级：ai.tools_enabled=1（默认开）时走 ChatWithTools 的
// 工具循环（MCP 白名单只读工具），业务数据查询进入对话能力；=0 走原纯对话路径。
//
// 定位：对话注入知识库 RAG 召回（P30 知识库向量检索，文档源=文档站内容）；
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

// aiChatToolSystemPrompt 工具模式系统提示词：两段式工具发现(模块目录→按需加载→调用)。
// 末段为图表协议(Generative UI)：用户要图表/趋势/环比时,先调工具拿数,再以 ```chart
// 代码块输出结构化图表规格,前端解析后用 ECharts 渲染(见 admin AiFloatChat parseChartBlocks)。
const aiChatToolSystemPrompt = "你是行简一体化管理平台的 AI 助手。回答简洁、专业，用中文。" +
	"你可以操作这套企业管理系统的全部业务(客户/线索/商机/合同/回款/审批/OA/人事/进销存/财务/项目/知识库/网盘/营销/商城/官网/自动化工作流/系统管理等,查询与操作均可)。" +
	"工具采用两段式发现:先调 list_toolsets 了解模块分组,再调 load_toolset 加载最匹配模块组的工具,加载后即可直接调用组内业务工具;" +
	"常见模块(crm/dashboard/oa/project)可直接凭名称 load,不必每次先 list。" +
	"选组示例:问系统用户/登录账号→system 组(而非 hrm 组,那是员工档案);问回款/收入趋势→dashboard 组;问请假审批进度→approval 组;问库存→psi 组。" +
	"写操作(创建/更新/删除/发布)须用户明确表达意图才执行,执行前可简述将做什么。" +
	"用户问业务数据时先加载对应模块再调用工具,基于结果回答；工具未覆盖的问题引导用户使用系统对应模块。" +
	"\n\n当用户需要图表/趋势/对比/环比等可视化时：先调用工具获取数据，然后在回复中用 ```chart 代码块输出图表数据，" +
	"代码块内容为严格 JSON(不要加注释和其他文字)，格式：" +
	`{"type":"bar","title":"标题","categories":["类目1","类目2"],"series":[{"name":"系列名","data":[1,2]}]}。` +
	"type 可选 bar/line/pie；pie 用 categories 做名称、series[0].data 做数值；" +
	"环比/对比类问题把两组数据分别放两个 series 或按时期展开 categories；" +
	"代码块之外用一两句话简述结论。仅当用户明确要图表/趋势/对比时才输出 chart 块，普通问答不要输出。"

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
	// Model 可选模型标识（sys_ai_model.model，如 deepseek-chat），空用网关默认档案。
	Model string `json:"model"`
	// UseKB 是否注入知识库 RAG 召回；nil/true=默认注入，false=纯模型回答。
	UseKB *bool `json:"use_kb"`
	// EnableSearch 是否让模型联网搜索（DashScope 通义系 enable_search 服务端搜索；
	// 其他供应商对该扩展字段的处理不保证——不支持的模型开启后可能报错，前端已提示）。
	EnableSearch *bool `json:"enable_search"`
	// Think 是否开启思考模式（推理模型 reasoning_content；DashScope 仅流式支持，
	// 后端内部 SSE 聚合对外仍非流式；不支持该参数的模型开启后可能报错）。
	Think *bool `json:"think"`
	// ThinkEffort 思考强度 low|medium|high（支持 reasoning_effort 的模型才生效）。
	ThinkEffort string `json:"think_effort"`
}

// think 是否开启思考模式（nil 视为关）。
func (r *AIChatRequest) think() bool {
	return r.Think != nil && *r.Think
}

// useKB 是否启用知识库召回（nil 视为开）。
func (r *AIChatRequest) useKB() bool {
	return r.UseKB == nil || *r.UseKB
}

// enableSearch 是否联网搜索（nil 视为关）。
func (r *AIChatRequest) enableSearch() bool {
	return r.EnableSearch != nil && *r.EnableSearch
}

// AIChatResponse AI 对话响应。
type AIChatResponse struct {
	Reply     string        `json:"reply"`
	Sources   []string      `json:"sources,omitempty"`
	ToolTrace []AIToolTrace `json:"tool_trace,omitempty"`
	// Reasoning 思考过程文本（请求 think=true 且模型支持时返回）。
	Reasoning string `json:"reasoning,omitempty"`
}

// AIChatEnabled 报告 AI 对话总开关是否开启（sys_config ai.chat_enabled=1）。
// 默认关闭（配置缺省按关处理），管理员在界面上显式开启后才生效。
func AIChatEnabled(ctx context.Context) bool {
	return setting.Get(ctx, AIChatEnabledKey) == "1"
}

// Chat 一次对话补全：校验并截取最近 20 条消息，注入系统提示词与知识库 RAG 召回后
// 走统一 LLM 网关。ai.tools_enabled=1 时升级为 ChatWithTools 工具循环，
// =0 走原纯对话路径（Model 照样透传）。
func Chat(ctx context.Context, userID uint, req AIChatRequest) (AIChatResponse, error) {
	if !AIChatEnabled(ctx) {
		return AIChatResponse{}, ErrAIChatDisabled
	}

	clean, ragBlocks, sources, err := aiChatPrepare(ctx, req.Messages, req.useKB())
	if err != nil {
		return AIChatResponse{}, err
	}

	if AIToolsEnabled(ctx) {
		return chatWithTools(ctx, userID, req, clean, ragBlocks, sources)
	}

	messages := aiChatMessages(aiChatSystemPrompt, ragBlocks, clean)
	// 联网开启时开口子(同工具模式):允许结合检索结果回答时效性问题。
	if req.enableSearch() {
		messages[0].Content += "\n用户已开启联网搜索:涉及时效性/外部信息的问题,可结合联网检索结果回答,并注明信息来自网络检索。"
	}
	resp, err := llm.Chat(ctx, llm.ChatRequest{
		Messages:       messages,
		Model:          req.Model,
		EnableSearch:   req.enableSearch(),
		EnableThinking: req.think(),
		ThinkEffort:    req.ThinkEffort,
		UserID:         userID,
		Feature:        aiChatFeature,
	})
	if err != nil {
		return AIChatResponse{}, mapLLMChatError(err)
	}
	return AIChatResponse{Reply: resp.Content, Sources: sources, Reasoning: resp.Reasoning}, nil
}

// aiChatPrepare 公共预处理：消息清洗（去空/只留 user+assistant）→ 截取最近 20 条 →
// 知识库 RAG 召回。返回清洗后的消息、RAG 召回块与来源标题列表。
func aiChatPrepare(ctx context.Context, msgs []ChatMessage, useKB bool) (clean []llm.Message, ragBlocks, sources []string, err error) {
	clean = make([]llm.Message, 0, len(msgs))
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
		return nil, nil, nil, ErrAIChatEmpty
	}
	if len(clean) > aiChatMaxMessages {
		clean = clean[len(clean)-aiChatMaxMessages:]
	}

	// 知识库 RAG 召回(P30 知识库向量检索):取最后一条用户消息检索,命中的切片注入上下文。
	// useKB=false 时完全跳过(悬浮球「知识库」开关);RAG 关闭/未配置/无命中时静默跳过
	// (检索内部已自吞错误);来源标题随响应返回供前端展示。
	lastUser := ""
	for i := len(clean) - 1; i >= 0; i-- {
		if clean[i].Role == "user" {
			lastUser = clean[i].Content
			break
		}
	}
	ragBlocks = make([]string, 0, aiChatRAGTopK)
	if useKB && lastUser != "" {
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
	return clean, ragBlocks, sources, nil
}

// aiChatMessages 组装最终消息序列：系统提示词 + RAG 召回块 + 清洗后的历史消息。
func aiChatMessages(systemPrompt string, ragBlocks []string, clean []llm.Message) []llm.Message {
	messages := make([]llm.Message, 0, len(clean)+2)
	// 注入当前日期:模型训练截止后不知道今天几号,「明天/下周」等相对日期全靠这里对齐
	// (否则模型按训练基准幻觉出 2024 年的日期)。
	today := time.Now()
	weekday := []string{"日", "一", "二", "三", "四", "五", "六"}[int(today.Weekday())]
	datePrefix := "今天是 " + today.Format("2006-01-02") + " (星期" + weekday + ")。\n\n"
	messages = append(messages, llm.Message{Role: "system", Content: datePrefix + systemPrompt})
	if len(ragBlocks) > 0 {
		messages = append(messages, llm.Message{Role: "system", Content: aiChatRAGPromptPrefix + strings.Join(ragBlocks, "\n\n---\n\n") + aiChatRAGPromptSuffix})
	}
	messages = append(messages, clean...)
	return messages
}

// mapLLMChatError LLM 网关错误 → 对外文案（未初始化/未配置 API key 统一成友好提示；
// 其余透传：限流、供应商错误摘要）。
func mapLLMChatError(err error) error {
	if errors.Is(err, llm.ErrNotInitialized) || errors.Is(err, llm.ErrNotConfigured) {
		return ErrAINotConfigured
	}
	return err
}
