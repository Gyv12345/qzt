package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"

	aimodel "qzt-go-server/internal/model/ai"
	"qzt-go-server/internal/pkg/llm"
	"qzt-go-server/internal/pkg/setting"
	"qzt-go-server/internal/repository"
	"qzt-go-server/pkg/xlogger"
)

// ai_chat_tools.go — P34 全局 AI 悬浮球 tool use 工具循环。
//
// 流程：白名单工具集 → llm.Chat(带 Tools) → 模型返回 tool_calls 则逐个经 MCP
// 进程内直调执行 → 结果以 role="tool" 回填续聊 → 循环 ≤4 轮 → 无 tool_calls
// 即最终回复。超过轮次上限后追加提示强制收尾一轮（不带 tools）。
//
// 桥接说明：internal/mcp 已反向依赖本包（tools_api.go 等引用 DashboardService），
// 本包不能再 import internal/mcp（会 import cycle）。因此这里声明函数钩子，
// 由 internal/mcp 在 StartMCP 启动时把 ListChatTools/CallChatTool 注册进来。

const (
	// AIToolsEnabledKey AI 工具调用独立开关的 sys_config 键（缺省/非 "0" 均视为开）。
	AIToolsEnabledKey = "ai.tools_enabled"

	// aiChatMaxToolRounds 工具循环最大轮数（每轮可含多个并行 tool_calls）。
	aiChatMaxToolRounds = 4

	// aiToolResultMaxChars 单个工具结果回填上下文的最大字节数（防上下文爆炸）。
	aiToolResultMaxChars = 4000

	// aiToolArgsSummaryMax / aiToolResultSummaryMax trace 摘要截断长度（字节）。
	aiToolArgsSummaryMax   = 120
	aiToolResultSummaryMax = 100

	// aiChatToolRoundLimitMsg 超轮次上限后注入的收尾提示。
	aiChatToolRoundLimitMsg = "已达工具调用轮次上限，请直接基于以上工具结果回答用户问题。"
)

// ChatToolSpec 供对话模型使用的工具规格（llm.ToolDef 的桥接形态）。
type ChatToolSpec struct {
	Name        string
	Description string
	Parameters  json.RawMessage
}

// 工具网关钩子：由 internal/mcp 启动时注入（见 StartMCP），nil 表示未装配。
var (
	chatToolsLister func(ctx context.Context) []ChatToolSpec
	// chatToolsListerBySet 按模块组列工具(两段式发现第二段)。
	chatToolsListerBySet func(ctx context.Context, key string) []ChatToolSpec
	// chatToolsetsMeta 模块组目录(两段式发现第一段)。
	chatToolsetsMeta func(ctx context.Context) []ChatToolsetGroup
	chatToolInvoker  func(ctx context.Context, userID uint, name, argsJSON string) (string, error)
)

// ChatToolsetGroup 模块级工具组(对话两段式发现第一段的目录项)。
type ChatToolsetGroup struct {
	Key   string `json:"key"`
	Name  string `json:"name"`
	Count int    `json:"count"`
}

// RegisterChatToolBridge 注入 MCP 进程内直调实现（internal/mcp.StartMCP 调用，勿在别处用）。
// listerBySet/meta 为两段式工具发现的桥(未注入时两段式不可用,回退全量)。
func RegisterChatToolBridge(
	lister func(ctx context.Context) []ChatToolSpec,
	invoker func(ctx context.Context, userID uint, name, argsJSON string) (string, error),
) {
	chatToolsLister = lister
	chatToolInvoker = invoker
}

// RegisterChatToolsetBridge 注入模块组目录与按组列工具(两段式发现;internal/mcp.StartMCP 调用)。
func RegisterChatToolsetBridge(
	meta func(ctx context.Context) []ChatToolsetGroup,
	listerBySet func(ctx context.Context, key string) []ChatToolSpec,
) {
	chatToolsetsMeta = meta
	chatToolsListerBySet = listerBySet
}

// AIToolsEnabled 报告 AI 工具调用开关是否开启（sys_config ai.tools_enabled，默认开）。
func AIToolsEnabled(ctx context.Context) bool {
	return setting.Get(ctx, AIToolsEnabledKey) != "0"
}

// AIToolTrace 一次工具执行的轨迹记录（随响应 tool_trace 返回，前端可展示调用过程）。
type AIToolTrace struct {
	Tool          string `json:"tool"`
	ArgsSummary   string `json:"args_summary"`
	ResultSummary string `json:"result_summary"`
	OK            bool   `json:"ok"`
	Ms            int64  `json:"ms"`
}

// ErrAIToolGateway MCP 工具网关未装配的对外文案。
var ErrAIToolGateway = errors.New("AI 工具网关未就绪，请稍后重试或联系管理员")

// ChatWithTools 带工具循环的对话补全（ai.tools_enabled=1 时由 Chat 分流进来）。
// 复用 Chat 的消息清洗/RAG 结果；Model 空用网关默认档案。
func ChatWithTools(ctx context.Context, userID uint, req AIChatRequest) (AIChatResponse, error) {
	if !AIChatEnabled(ctx) {
		return AIChatResponse{}, ErrAIChatDisabled
	}
	clean, ragBlocks, sources, err := aiChatPrepare(ctx, req.Messages, req.useKB())
	if err != nil {
		return AIChatResponse{}, err
	}
	return chatWithTools(ctx, userID, req, clean, ragBlocks, sources)
}

// chatWithTools 工具循环主体（两段式工具发现）。
// 第一段:模型只见 2 个轻量目录工具(list_toolsets/load_toolset),按用户请求加载
// 对应模块组;第二段:加载后该组全部工具 schema 注入下一轮,模型直接发起真正的
// 业务工具调用。340+ 工具全量可达,而单轮上下文占用从 45K tokens 降到 5K 级。
func chatWithTools(ctx context.Context, userID uint, req AIChatRequest, clean []llm.Message, ragBlocks, sources []string) (AIChatResponse, error) {
	if chatToolInvoker == nil || chatToolsetsMeta == nil || chatToolsListerBySet == nil {
		return AIChatResponse{}, ErrAIToolGateway
	}

	// 已加载的模块组(两段式第二段的工具来源,跨轮次累积)。
	loaded := make(map[string]bool, 4)
	buildTools := func() []llm.ToolDef {
		defs := make([]llm.ToolDef, 0, 16)
		defs = append(defs, chatMetaToolDefs()...)
		keys := make([]string, 0, len(loaded))
		for k := range loaded {
			keys = append(keys, k)
		}
		sort.Strings(keys) // 组装顺序稳定
		for _, k := range keys {
			for _, spec := range chatToolsListerBySet(ctx, k) {
				defs = append(defs, llm.ToolDef{Name: spec.Name, Description: spec.Description, Parameters: spec.Parameters})
			}
		}
		return defs
	}

	messages := aiChatMessages(aiChatToolSystemPrompt, ragBlocks, clean)
	// 联网开启时给模型开口子:允许结合搜索信息回答通用/时效性问题(否则工具 prompt 的
	// 「聚焦系统业务」约束会让模型拒答外部话题,搜索结果也不会被引用)。
	if req.enableSearch() {
		messages[0].Content += "\n用户已开启联网搜索:涉及时效性/外部信息的问题,可结合联网检索结果回答,并注明信息来自网络检索。"
	}
	trace := make([]AIToolTrace, 0, aiChatMaxToolRounds)
	currentTools := buildTools()

	for round := 0; round < aiChatMaxToolRounds; round++ {
		resp, err := llm.Chat(ctx, llm.ChatRequest{
			Messages:   messages,
			Model:      req.Model,
			Tools:      currentTools,
			ToolChoice: "auto",
			UserID:     userID,
			Feature:    aiChatFeature,
		})
		if err != nil {
			return AIChatResponse{}, mapLLMChatError(err)
		}

		// 模型未再请求工具：即最终回复。
		if len(resp.ToolCalls) == 0 {
			return AIChatResponse{Reply: resp.Content, Sources: sources, Reasoning: resp.Reasoning, ToolTrace: trace}, nil
		}

		// 回填 assistant 消息（携带 tool_calls），再逐个执行并回填 tool 消息。
		messages = append(messages, llm.Message{Role: "assistant", Content: resp.Content, ToolCalls: resp.ToolCalls})
		reload := false
		for _, tc := range resp.ToolCalls {
			var resultText string
			var ms int64
			var callErr error
			switch tc.Name {
			case "list_toolsets":
				start := time.Now()
				resultText = chatListToolsets(ctx)
				ms = time.Since(start).Milliseconds()
				callErr = nil
			case "load_toolset":
				start := time.Now()
				var args struct {
					Key string `json:"key"`
				}
				_ = json.Unmarshal([]byte(tc.Arguments), &args)
				specs := chatToolsListerBySet(ctx, args.Key)
				if len(specs) == 0 {
					resultText = "工具组 " + args.Key + " 不存在或为空,可用组请先调 list_toolsets"
					callErr = errors.New(resultText)
				} else {
					loaded[args.Key] = true
					reload = true
					names := make([]string, 0, len(specs))
					for _, s := range specs {
						names = append(names, s.Name)
					}
					resultText = fmt.Sprintf("已加载 %s 组 %d 个工具,下一轮起可直接调用: %s", args.Key, len(specs), strings.Join(names, ", "))
					callErr = nil
				}
				ms = time.Since(start).Milliseconds()
			default:
				resultText, ms, callErr = invokeChatTool(ctx, userID, tc.Name, tc.Arguments)
			}
			resultText = aiTruncate(resultText, aiToolResultMaxChars)
			trace = append(trace, AIToolTrace{
				Tool:          tc.Name,
				ArgsSummary:   aiTruncate(tc.Arguments, aiToolArgsSummaryMax),
				ResultSummary: aiTruncate(resultText, aiToolResultSummaryMax),
				OK:            callErr == nil,
				Ms:            ms,
			})
			messages = append(messages, llm.Message{Role: "tool", Content: resultText, ToolCallID: tc.ID})
		}
		if reload {
			currentTools = buildTools() // 新加载组的工具下一轮注入
		}
	}

	// 超过轮次上限：注入收尾提示后强制收尾一轮（保留已加载工具,模型仍可调用）。
	messages = append(messages, llm.Message{Role: "system", Content: aiChatToolRoundLimitMsg})
	resp, err := llm.Chat(ctx, llm.ChatRequest{
		Messages:       messages,
		Model:          req.Model,
		Tools:          currentTools,
		EnableSearch:   req.enableSearch(),
		EnableThinking: req.think(),
		ThinkEffort:    req.ThinkEffort,
		UserID:         userID,
		Feature:        aiChatFeature,
	})
	if err != nil {
		return AIChatResponse{}, mapLLMChatError(err)
	}
	return AIChatResponse{Reply: resp.Content, Sources: sources, Reasoning: resp.Reasoning, ToolTrace: trace}, nil
}

// chatMetaToolDefs 两段式发现的第一段:2 个轻量目录工具(本地拦截执行,不进 MCP)。
func chatMetaToolDefs() []llm.ToolDef {
	emptyObj := json.RawMessage(`{"type":"object","properties":{}}`)
	keyProp := json.RawMessage(`{"type":"object","properties":{"key":{"type":"string","description":"模块组 key,来自 list_toolsets"}},"required":["key"]}`)
	return []llm.ToolDef{
		{Name: "list_toolsets", Description: "列出全部业务模块工具组(模块名/工具数)。不确定该用哪个模块的工具时先调用它。", Parameters: emptyObj},
		{Name: "load_toolset", Description: "加载某模块组的全部工具;加载成功后下一轮即可直接调用该组内工具(如 load_toolset('crm') 后可调 crm_customer_list 等)。按用户请求选择最匹配的模块组。", Parameters: keyProp},
	}
}

// chatListToolsets 目录工具结果:16 组 key/名称/工具数。
func chatListToolsets(ctx context.Context) string {
	groups := chatToolsetsMeta(ctx)
	b, _ := json.Marshal(groups)
	return string(b)
}

// ── 工具调用审计 ──

// logToolCallAudit 工具调用审计落表(ai_tool_call_log);写失败仅记日志不阻断对话。
// 成功与失败都落,失败时结果摘要即错误文案。
func logToolCallAudit(ctx context.Context, userID uint, tool, argsSummary, resultSummary string, ok bool, ms int64) {
	rec := aimodel.AiToolCallLog{
		UserID:        userID,
		Tool:          aiTruncate(tool, 100),
		ArgsSummary:   aiTruncate(argsSummary, 200),
		ResultSummary: aiTruncate(resultSummary, 200),
		OK:            0,
		Ms:            ms,
		Scene:         "float_chat",
	}
	if ok {
		rec.OK = 1
	}
	if err := repository.DBFrom(ctx).Create(&rec).Error; err != nil {
		xlogger.ErrorfCtx(ctx, "ai: 工具审计落表失败 user=%d tool=%s err=%v", userID, tool, err)
	}
}

// invokeChatTool 执行单个工具并计时；失败时把错误文案当作结果文本回填给模型。
func invokeChatTool(ctx context.Context, userID uint, name, argsJSON string) (result string, ms int64, err error) {
	start := time.Now()
	result, err = chatToolInvoker(ctx, userID, name, argsJSON)
	ms = time.Since(start).Milliseconds()
	if err != nil {
		xlogger.InfofCtx(ctx, "ai: chat tool failed user=%d tool=%s ms=%d err=%v", userID, name, ms, err)
		result = fmt.Sprintf("工具 %s 执行失败: %v", name, err)
		err = errors.New(result) // 对外错误与回填文本一致
		logToolCallAudit(ctx, userID, name, argsJSON, result, false, ms)
		return result, ms, err
	}
	logToolCallAudit(ctx, userID, name, argsJSON, result, true, ms)
	return result, ms, nil
}

// aiTruncate 按字节截断，回退到 UTF-8 字符边界（多字节中文不切碎）。
func aiTruncate(s string, n int) string {
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

// ── /api/ai/models 模型档案端点 ──

// AIModelInfo 对外暴露的模型档案（不含 base_url/api_key 等敏感字段）。
type AIModelInfo struct {
	ID        uint   `json:"id"`
	Name      string `json:"name"`
	Model     string `json:"model"`
	IsDefault bool   `json:"is_default"`
}

// AIModelsResponse GET /api/ai/models 响应。
type AIModelsResponse struct {
	// Enabled AI 对话总开关（ai.chat_enabled）。
	Enabled bool `json:"enabled"`
	// ToolsEnabled 工具调用开关（ai.tools_enabled）。
	ToolsEnabled bool `json:"tools_enabled"`
	// Models 启用中的模型档案（Enabled=1），生效档案排前。
	Models []AIModelInfo `json:"models"`
}

// AIModels 列出可用 AI 模型档案（ai_model 表 Enabled=1；repo 直查，
// api/service 直接引 repository 是既有例外口径，同 calendar.go）。
func AIModels(ctx context.Context) (*AIModelsResponse, error) {
	list, err := repository.NewAIModelRepo().List(ctx, &repository.QueryOptions{
		Where: map[string]any{"enabled": 1},
		Order: []string{"is_default DESC", "id ASC"},
	})
	if err != nil {
		return nil, err
	}
	models := make([]AIModelInfo, 0, len(list))
	for _, m := range list {
		models = append(models, AIModelInfo{
			ID:        m.ID,
			Name:      m.Name,
			Model:     m.Model,
			IsDefault: m.IsDefault == 1,
		})
	}
	return &AIModelsResponse{
		Enabled:      AIChatEnabled(ctx),
		ToolsEnabled: AIToolsEnabled(ctx),
		Models:       models,
	}, nil
}
