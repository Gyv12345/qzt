package mcp

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"slices"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"

	"qzt-go-server/internal/middleware"
	"qzt-go-server/internal/model"
	apisvc "qzt-go-server/internal/module/api/service"
	"qzt-go-server/internal/pkg/datascope"
	"qzt-go-server/internal/repository"
	"qzt-go-server/pkg/xlogger"
)

// server.go 内置 MCP Server(Streamable HTTP transport)。
// 挂载到 gin engine 的 /mcp 路径,用 API Key 认证。
// AI 助手(Claude/Cursor)通过 MCP 协议调用 ERP 功能。

// StartMCP 将 MCP Server 挂载到 gin engine。
// 路径 /mcp,需要 API Key 认证(Authorization: Bearer qzt_xxx)。
// 同时把进程内直调桥接注册进 api/service(P34 AI 悬浮球 tool use):
// internal/mcp 已依赖 api/service,故由本方向注入,避免 import cycle。
func StartMCP(r *gin.Engine) {
	wireChatToolsBridge()

	mcpServer := buildServer()

	// 用 Streamable HTTP transport(单端点 POST + GET)
	// WithDisableLocalhostProtection: Nginx 反代时 Host 是域名不是 localhost,
	// 默认的 DNS 重绑定保护会 403,需关闭
	httpServer := server.NewStreamableHTTPServer(mcpServer,
		server.WithStateLess(true),
		server.WithDisableLocalhostProtection(true),
	)

	// gin 路由:先做 API Key 认证,再代理到 MCP httpServer
	r.Any("/mcp", mcpAuthMiddleware(), func(c *gin.Context) {
		httpServer.ServeHTTP(c.Writer, c.Request)
	})

	xlogger.Infof("MCP Server 已注册: /mcp (Streamable HTTP)")
}

// buildServer 构建带 CRM tools 的 MCP Server。
func buildServer() *server.MCPServer {
	s := server.NewMCPServer(
		"行简 · 一站式企业管理平台",
		"1.0.0",
		server.WithToolCapabilities(true),
		server.WithInstructions("行简企业级管理系统。可通过这些工具管理客户、商机、合同、跟进等 CRM 业务。所有操作需通过 API Key 认证。"),
		// 工具操作级权限控制:工具名→HTTP API 的 Casbin 校验(见 perm_check.go)
		server.WithToolHandlerMiddleware(mcpPermissionMiddleware()),
		// API Key 级工具集过滤:list 可见性与 call 调用双重生效(见 toolsets.go)
		server.WithToolFilter(toolsetFilter),
	)

	// 注册 CRM tools
	registerCustomerTools(s)
	registerLeadTools(s)
	registerOpportunityTools(s)
	registerContractTools(s)
	registerProductTools(s)
	registerContactTools(s)
	registerPaymentTools(s)
	registerFollowupTools(s)
	registerDashboardTools(s)

	// 注册 CRM 自定义字段定义 + 售后工单 tools
	registerCustomFieldTools(s)
	registerTicketTools(s)

	// 注册 CRM 写操作 tools(客户流转/商机/合同/回款/跟进/查重)
	registerCrmWriteTools(s)

	// 注册 CRM 合同模板 tools
	registerContractTemplateTools(s)

	// 注册 CMS tools(文章/分类/标签/单页)
	registerArticleTools(s)
	registerCmsExtraTools(s)

	// 注册审批 tools(流程/待办/实例)
	registerApprovalTools(s)

	// 注册系统配置 tools(存储/OSS、企业微信、站点设置)
	registerConfigTools(s)

	// 注册系统管理 tools(用户/角色/菜单/API/字典)
	registerSystemTools(s)

	// 注册 HRM 只读 tools(部门/员工/职位/考勤/薪资)
	registerHrmTools(s)

	// 注册 PSI 只读 tools(供应商/仓库/采购/销售/库存/出入库)
	registerPsiTools(s)

	// ── 全量补齐:新增模块 tools ──
	// 财务(会计科目/凭证/往来款/发票/报表)
	registerFinanceTools(s)
	// 项目管理(项目/任务)
	registerProjectTools(s)
	// 知识库(分类/文档/版本)
	registerKbTools(s)
	// 网盘(文件/文件夹/用量)
	registerCloudTools(s)
	// 定时任务(任务/执行日志)
	registerEnterpriseTools(s)
	// 自动化工作流(定义/运行/执行记录)
	registerWorkflowTools(s)
	// 公共基础设施(BI 报表/统一日历/附件/文件签名)
	registerApiTools(s)
	// 办公自动化(站内信/公告/日程/工作日志/报销/出差/借款/会议/表单)
	registerOaTools(s)
	// HRM 写操作 + 招聘/绩效只读(部门/岗位/员工/考勤/薪酬/招聘/绩效)
	registerHrmWriteTools(s)
	// PSI 写操作 + 资产/退货只读(仓库/供应商/资产/采购/销售/退货/其他出入库)
	registerPsiWriteTools(s)
	// 营销(渠道账号/线索同步日志/手动同步)
	registerMarketingTools(s)

	return s
}

// isAPIKeyExpired 与 REST API Key 的过期语义一致：零值表示永不过期。
func isAPIKeyExpired(apiKey *model.SysApiKey, now time.Time) bool {
	expiresAt := time.Time(apiKey.ExpiresAt)
	return !expiresAt.IsZero() && now.After(expiresAt)
}

// mcpAuthMiddleware MCP 请求的 API Key 认证中间件。
// 从 Authorization header 提取 API Key,校验后写入 context。
func mcpAuthMiddleware() gin.HandlerFunc {
	apiKeyRepo := repository.NewApiKeyRepo()
	userRepo := repository.NewUserRepo()

	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "缺少认证信息"})
			c.Abort()
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "认证格式错误"})
			c.Abort()
			return
		}

		tokenString := parts[1]
		if !strings.HasPrefix(tokenString, model.ApiKeyPrefix) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "MCP 仅支持 API Key 认证(qzt_ 前缀)"})
			c.Abort()
			return
		}

		keyHash := repository.HashKey(tokenString)
		apiKey, err := apiKeyRepo.GetByHash(c.Request.Context(), keyHash)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "API Key 无效"})
			c.Abort()
			return
		}

		if isAPIKeyExpired(apiKey, time.Now()) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "API Key 已过期"})
			c.Abort()
			return
		}

		user, err := userRepo.GetByID(c.Request.Context(), apiKey.UserID)

		if err != nil || user.Status != 1 {
			c.JSON(http.StatusForbidden, gin.H{"error": "API Key 关联的用户已禁用"})
			c.Abort()
			return
		}

		roleCodes := make([]string, 0, len(user.Roles))
		for _, r := range user.Roles {
			roleCodes = append(roleCodes, r.Code)
		}
		// 演示账号禁止走 MCP(公开演示环境不开放生产数据读写入口)
		if slices.Contains(roleCodes, model.DemoRoleCode) {
			c.JSON(http.StatusForbidden, gin.H{"error": "演示账号不支持 MCP 调用,请使用正式账号"})
			c.Abort()
			return
		}

		// 仅在全部认证检查通过后记录使用,过期/禁用/demo 拒绝不计为成功使用。
		go apiKeyRepo.UpdateLastUsed(context.Background(), apiKey.ID, c.ClientIP())

		// 写入 context key(与 Auth 中间件相同,tool handler 可通过 middleware 取值)

		c.Set(middleware.CtxUserIDKey, user.ID)
		c.Set(middleware.CtxUsernameKey, user.Username)
		c.Set(middleware.CtxRoleCodesKey, roleCodes)
		middleware.InjectDataScope(c, user)
		// 额外把 roleCodes / toolsets 写入 request context,供 MCP 工具权限中间件
		// (mcpPermissionMiddleware)与工具集过滤(toolsetFilter)读取
		// (mcpAuthMiddleware 写 gin context,但 MCP 工具 handler 拿到的是 request context)
		reqCtx := context.WithValue(c.Request.Context(), mcpRoleCodesKey, roleCodes)
		reqCtx = context.WithValue(reqCtx, mcpUserIDKey, user.ID)
		reqCtx = context.WithValue(reqCtx, mcpToolsetsKey, ParseToolsets(apiKey.Toolsets))
		c.Request = c.Request.WithContext(reqCtx)

		c.Next()
	}
}

// ── 辅助函数 ──

// resultText 把任意数据序列化为 JSON 文本返回给 AI。
func resultText(data any) (*mcp.CallToolResult, error) {
	b, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("序列化失败: %v", err)), nil
	}
	return mcp.NewToolResultText(string(b)), nil
}

// resultError 返回错误文本给 AI。
func resultError(msg string) (*mcp.CallToolResult, error) {
	return mcp.NewToolResultError(msg), nil
}

// ── 进程内直调（P34 全局 AI 悬浮球 tool use） ──
//
// 与 /mcp HTTP 端口共用同一套 buildServer() 工具注册与权限中间件，但绕过
// mcpAuthMiddleware（那是 HTTP 层 API Key 认证），由调用方直接把 userID/roles
// 注入 request context 后进程内 HandleMessage，供 ai 模块 ChatWithTools 的
// 工具循环调用。单例并发安全：mcp-go MCPServer 并发处理安全，工具实现内部各自取 DB。

var (
	chatMCPOnce   sync.Once
	chatMCPServer *server.MCPServer
)

// chatServer 惰性构建进程内 MCP Server 单例（与 /mcp HTTP 端口同一套工具注册）。
func chatServer() *server.MCPServer {
	chatMCPOnce.Do(func() { chatMCPServer = buildServer() })
	return chatMCPServer
}

// chatRequestContext 在调用方 ctx 基础上注入身份与工具集上下文。
// mcpToolsetsKey 注入空数组=不过滤工具集（白名单在 ai service 层另行收窄）。
func chatRequestContext(ctx context.Context, userID uint, roleCodes []string) context.Context {
	ctx = context.WithValue(ctx, mcpUserIDKey, userID)
	ctx = context.WithValue(ctx, mcpRoleCodesKey, roleCodes)
	ctx = context.WithValue(ctx, mcpToolsetsKey, []string(nil))
	return ctx
}

// ListChatTools 列出进程内 MCP Server 的全部工具（不按工具集过滤）。
// 供 ai service 构造 llm.ToolDef 白名单用；MCP 层异常时返回 nil。
func ListChatTools(ctx context.Context) []mcp.Tool {
	resp := chatServer().HandleMessage(
		chatRequestContext(ctx, 0, nil),
		json.RawMessage(`{"jsonrpc":"2.0","id":1,"method":"tools/list"}`),
	)
	r, ok := resp.(mcp.JSONRPCResponse)
	if !ok {
		return nil
	}
	// mcp-go v0.57 HandleMessage 返回值类型 Result(非指针),两种形态都兼容。
	ltr, ok := r.Result.(*mcp.ListToolsResult)
	if !ok {
		if v, ok2 := r.Result.(mcp.ListToolsResult); ok2 {
			return v.Tools
		}
		return nil
	}
	return ltr.Tools
}

// wireChatToolsBridge 把进程内直调实现注册进 api/service 的工具钩子
// (P34 AI 悬浮球 tool use)。mcp.Tool 的 InputSchema 序列化为 JSON Schema 原样透传。
// 另注入两段式工具发现桥(ChatToolsets/ListChatToolsBySet)。
func wireChatToolsBridge() {
	specOf := func(t mcp.Tool) apisvc.ChatToolSpec {
		schema, err := json.Marshal(t.InputSchema)
		if err != nil {
			return apisvc.ChatToolSpec{}
		}
		return apisvc.ChatToolSpec{Name: t.Name, Description: t.Description, Parameters: schema}
	}
	apisvc.RegisterChatToolBridge(
		func(ctx context.Context) []apisvc.ChatToolSpec {
			tools := ListChatTools(ctx)
			specs := make([]apisvc.ChatToolSpec, 0, len(tools))
			for _, t := range tools {
				specs = append(specs, specOf(t))
			}
			return specs
		},
		CallChatTool,
	)
	apisvc.RegisterChatToolsetBridge(
		func(ctx context.Context) []apisvc.ChatToolsetGroup {
			metas := ChatToolsets(ctx)
			groups := make([]apisvc.ChatToolsetGroup, 0, len(metas))
			for _, m := range metas {
				groups = append(groups, apisvc.ChatToolsetGroup{Key: m.Key, Name: m.Name, Count: m.Count})
			}
			return groups
		},
		func(ctx context.Context, key string) []apisvc.ChatToolSpec {
			tools := ListChatToolsBySet(ctx, key)
			specs := make([]apisvc.ChatToolSpec, 0, len(tools))
			for _, t := range tools {
				specs = append(specs, specOf(t))
			}
			return specs
		},
	)
}

// CallChatTool 以指定用户身份进程内调用一个 MCP 工具。
// 返回工具结果的文本内容（CallToolResult 的 TextContent 拼接）；工具返回错误
// 文本（isError=true）或 MCP 层 JSON-RPC 错误时 error 非 nil。
// demo 角色在入口直接拒绝（同 MCP HTTP 口径）。
func CallChatTool(ctx context.Context, userID uint, name, argsJSON string) (string, error) {
	user, err := repository.NewUserRepo().GetByID(ctx, userID)
	if err != nil || user == nil || user.Status != 1 {
		return "", fmt.Errorf("当前用户不存在或已禁用，无法调用工具")
	}
	roleCodes := make([]string, 0, len(user.Roles))
	for _, r := range user.Roles {
		roleCodes = append(roleCodes, r.Code)
	}
	// 演示账号禁止走 MCP 工具（与 mcpAuthMiddleware 同口径）
	if slices.Contains(roleCodes, model.DemoRoleCode) {
		return "", errors.New("演示账号不支持工具调用，请使用正式账号")
	}

	// 数据权限注入：与 mcpAuthMiddleware→InjectDataScope 同款（部分工具经
	// datascope.GetScope 读 request context），scope 取多角色最宽松口径。
	scope := datascope.EffectiveScope(user.Roles)
	var deptID uint
	if user.DeptID != nil {
		deptID = *user.DeptID
	}
	callCtx := chatRequestContext(ctx, userID, roleCodes)
	callCtx = context.WithValue(callCtx, datascope.CtxDeptIDKey, deptID)
	callCtx = context.WithValue(callCtx, datascope.CtxDataScopeKey, scope)
	callCtx = context.WithValue(callCtx, datascope.CtxUserIDKey, userID)
	callCtx = datascope.WithCache(callCtx)

	// 构造 tools/call JSON-RPC 报文；argsJSON 为空按空参数对象处理。
	args := json.RawMessage(argsJSON)
	if len(args) == 0 {
		args = json.RawMessage(`{}`)
	}
	payload, err := json.Marshal(map[string]any{
		"jsonrpc": "2.0",
		"id":      1,
		"method":  "tools/call",
		"params": map[string]any{
			"name":      name,
			"arguments": args,
		},
	})
	if err != nil {
		return "", fmt.Errorf("构造工具调用请求失败: %w", err)
	}
	resp := chatServer().HandleMessage(callCtx, payload)

	r, ok := resp.(mcp.JSONRPCResponse)
	if !ok {
		if re, isErr := resp.(mcp.JSONRPCError); isErr {
			return "", fmt.Errorf("工具 %s 调用失败: %s", name, re.Error.Message)
		}
		return "", fmt.Errorf("工具 %s 调用响应类型异常", name)
	}
	result, ok := r.Result.(*mcp.CallToolResult)
	if !ok {
		// mcp-go v0.57 HandleMessage 返回值类型 Result(非指针),两种形态都兼容。
		if v, ok2 := r.Result.(mcp.CallToolResult); ok2 {
			result = &v
		} else {
			return "", fmt.Errorf("工具 %s 调用响应类型异常", name)
		}
	}

	texts := make([]string, 0, len(result.Content))
	for _, c := range result.Content {
		if tc, isText := c.(mcp.TextContent); isText {
			texts = append(texts, tc.Text)
		}
	}
	text := strings.Join(texts, "\n")
	if result.IsError {
		if text == "" {
			text = fmt.Sprintf("工具 %s 执行失败", name)
		}
		return "", errors.New(text)
	}
	return text, nil
}
