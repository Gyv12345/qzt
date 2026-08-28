package mcp

import (
	"context"
	"fmt"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"

	"qzt-go-server/internal/app"
	"qzt-go-server/internal/model"
)

// perm_check.go MCP 工具操作级权限控制。
//
// 每个工具在 toolPermMap(perm_map.go) 中标注其对应的 HTTP API(path+method),
// 调用前用 Casbin(app.Enforcer) 校验当前 API Key 用户角色是否有权访问该 API。
// 规则与前端 HTTP 接口共享同一份 Casbin 策略(在 admin 后台 角色管理→API 权限 配置)。
//
// 策略:
//   - 未在 toolPermMap 中的工具 → 默认拒绝(避免遗漏工具被无权调用)。
//   - super_admin 角色 → 放行(Casbin 模型 matcher 与此处双重短路)。
//   - 多角色任一通过即放行(与 HTTP CasbinRBAC 中间件一致)。

// toolPerm 标注一个工具对应的 HTTP API 权限点。
type toolPerm struct {
	method string
	path   string
}

// mcpCtxKey MCP request context 中专用的 key 类型。
type mcpCtxKey string

const mcpRoleCodesKey mcpCtxKey = "mcp_role_codes"

// mcpUserIDKey API Key 绑定用户的 ID(request context),供工具 handler 取"当前用户"。
const mcpUserIDKey mcpCtxKey = "mcp_user_id"

// mcpPermissionMiddleware 工具调用权限中间件:工具名→Casbin 校验。
// 挂载方式:buildServer() 里 server.WithToolHandlerMiddleware(mcpPermissionMiddleware())。
func mcpPermissionMiddleware() server.ToolHandlerMiddleware {
	return func(next server.ToolHandlerFunc) server.ToolHandlerFunc {
		return func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			toolName := req.Params.Name
			perm, ok := toolPermMap[toolName]
			if !ok {
				// 默认拒绝:未标注权限的工具不可调用(防止遗漏)
				return mcp.NewToolResultError(fmt.Sprintf("工具 %s 未配置权限映射,已拒绝(请联系管理员补配置)", toolName)), nil
			}
			roleCodes, _ := ctx.Value(mcpRoleCodesKey).([]string)
			if len(roleCodes) == 0 {
				return mcp.NewToolResultError("无法获取当前用户角色,已拒绝"), nil
			}
			// 仅需认证的工具(对应 HTTP authenticated 组路由,登录即可用,如个人收件箱/公告流/库存查询):
			// 这些操作在 HTTP 层本就不挂 CasbinRBAC,MCP 层保持一致——有合法身份即放行。
			if authOnlyTools[toolName] {
				return next(ctx, req)
			}
			for _, rc := range roleCodes {
				if rc == model.SuperAdminRoleCode {
					return next(ctx, req) // 超管放行
				}
				if allowed, err := app.Enforcer.Enforce(rc, perm.path, perm.method); err == nil && allowed {
					return next(ctx, req)
				}
			}
			return mcp.NewToolResultError(fmt.Sprintf("无权限调用 %s(需要 %s %s,请在后台为当前角色分配该 API 权限)", toolName, perm.method, perm.path)), nil
		}
	}
}
