package mcp

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"

	"qzt-go-server/internal/middleware"
	"qzt-go-server/internal/model"
	"qzt-go-server/internal/repository"
	"qzt-go-server/pkg/xlogger"
)

// server.go 内置 MCP Server(Streamable HTTP transport)。
// 挂载到 gin engine 的 /mcp 路径,用 API Key 认证。
// AI 助手(Claude/Cursor)通过 MCP 协议调用 ERP 功能。

// StartMCP 将 MCP Server 挂载到 gin engine。
// 路径 /mcp,需要 API Key 认证(Authorization: Bearer qzt_xxx)。
func StartMCP(r *gin.Engine) {
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
		"QZT Enterprise ERP",
		"1.0.0",
		server.WithToolCapabilities(true),
		server.WithInstructions("QZT 企业级 ERP 系统。可通过这些工具管理客户、商机、合同、跟进等 CRM 业务。所有操作需通过 API Key 认证。"),
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

	// 注册 CRM 写操作 tools(客户流转/商机/合同/回款/跟进/查重)
	registerCrmWriteTools(s)

	// 注册 CRM 合同模板 tools
	registerContractTemplateTools(s)

	// 注册 CMS tools(文章)
	registerArticleTools(s)

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

	return s
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

		user, err := userRepo.GetByID(c.Request.Context(), apiKey.UserID)
		if err != nil || user.Status != 1 {
			c.JSON(http.StatusForbidden, gin.H{"error": "API Key 关联的用户已禁用"})
			c.Abort()
			return
		}

		// 写入 context key(与 Auth 中间件相同,tool handler 可通过 middleware 取值)
		c.Set(middleware.CtxUserIDKey, user.ID)
		c.Set(middleware.CtxUsernameKey, user.Username)
		roleCodes := make([]string, 0, len(user.Roles))
		for _, r := range user.Roles {
			roleCodes = append(roleCodes, r.Code)
		}
		c.Set(middleware.CtxRoleCodesKey, roleCodes)
		middleware.InjectDataScope(c, user)

		c.Next()
	}
}

// ── 辅助函数 ──

// resultText 把任意数据序列化为 JSON 文本返回给 AI。
func resultText(data interface{}) (*mcp.CallToolResult, error) {
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
