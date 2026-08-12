package mcp

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"

	sysvc "qzt-go-server/internal/module/system/service"
)

// tools_system.go 系统管理 MCP tools(用户/角色/菜单/API/字典)。
// 让 AI 助手通过 MCP 完成全部后台管理操作,无需登录 admin。

func registerSystemTools(s *server.MCPServer) {
	registerUserTools(s)
	registerRoleTools(s)
	registerMenuTools(s)
	registerAPITools(s)
	registerDictTools(s)
}

// ════════════════════════════════════════════════
// 用户管理
// ════════════════════════════════════════════════

func registerUserTools(s *server.MCPServer) {
	s.AddTool(
		mcp.NewTool("system_user_list",
			mcp.WithDescription("查询系统用户列表(分页)"),
			mcp.WithNumber("page", mcp.Description("页码(默认1)")),
			mcp.WithNumber("page_size", mcp.Description("每页条数(默认20)")),
		),
		handleUserList,
	)
	s.AddTool(
		mcp.NewTool("system_user_get",
			mcp.WithDescription("查询用户详情"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("用户ID")),
		),
		handleUserGet,
	)
	s.AddTool(
		mcp.NewTool("system_user_create",
			mcp.WithDescription("创建系统用户(自动分配角色)"),
			mcp.WithString("username", mcp.Required(), mcp.Description("登录用户名")),
			mcp.WithString("password", mcp.Required(), mcp.Description("登录密码(6-72位)")),
			mcp.WithString("nickname", mcp.Description("昵称")),
			mcp.WithString("email", mcp.Description("邮箱")),
			mcp.WithString("phone", mcp.Description("手机号")),
			mcp.WithString("role_ids", mcp.Description("角色ID列表,逗号分隔,如 1,2")),
		),
		handleUserCreate,
	)
	s.AddTool(
		mcp.NewTool("system_user_update",
			mcp.WithDescription("更新用户信息(留空字段不更新)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("用户ID")),
			mcp.WithString("nickname", mcp.Description("昵称")),
			mcp.WithString("email", mcp.Description("邮箱")),
			mcp.WithString("phone", mcp.Description("手机号")),
			mcp.WithString("password", mcp.Description("新密码(留空不改,6-72位)")),
			mcp.WithString("role_ids", mcp.Description("角色ID列表,逗号分隔")),
			mcp.WithNumber("status", mcp.Description("状态:1启用 0禁用")),
		),
		handleUserUpdate,
	)
	s.AddTool(
		mcp.NewTool("system_user_delete",
			mcp.WithDescription("删除用户(软删除)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("用户ID")),
		),
		handleUserDelete,
	)
}

func handleUserList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := sysvc.NewUserService()
	page, pageSize := parsePaging(req)
	list, total, err := svc.List(ctx, page, pageSize)
	if err != nil {
		return resultError(fmt.Sprintf("查询用户列表失败: %v", err))
	}
	return resultText(map[string]any{"list": list, "total": total, "page": page, "size": pageSize})
}

func handleUserGet(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := sysvc.NewUserService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("用户ID(id)必填")
	}
	u, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("查询用户失败: %v", err))
	}
	return resultText(u)
}

func handleUserCreate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := sysvc.NewUserService()
	username := req.GetString("username", "")
	password := req.GetString("password", "")
	if username == "" || password == "" {
		return resultError("用户名(username)和密码(password)必填")
	}
	cr := &sysvc.CreateUserRequest{
		Username: username,
		Password: password,
		Nickname: req.GetString("nickname", ""),
		Email:    req.GetString("email", ""),
		Phone:    req.GetString("phone", ""),
	}
	if ids := parseIDList(req.GetString("role_ids", "")); len(ids) > 0 {
		cr.RoleIDs = ids
	}
	if err := svc.Create(ctx, cr); err != nil {
		return resultError(fmt.Sprintf("创建用户失败: %v", err))
	}
	return resultText(map[string]any{"message": "用户已创建", "username": username})
}

func handleUserUpdate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := sysvc.NewUserService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("用户ID(id)必填")
	}
	ur := &sysvc.UpdateUserRequest{
		Nickname: req.GetString("nickname", ""),
		Email:    req.GetString("email", ""),
		Phone:    req.GetString("phone", ""),
		Password: req.GetString("password", ""),
	}
	if ids := parseIDList(req.GetString("role_ids", "")); len(ids) > 0 {
		ur.RoleIDs = ids
	}
	if v := req.GetFloat("status", -1); v >= 0 {
		st := int8(v)
		ur.Status = &st
	}
	if err := svc.Update(ctx, id, ur); err != nil {
		return resultError(fmt.Sprintf("更新用户失败: %v", err))
	}
	return resultText(map[string]any{"message": "用户已更新", "id": id})
}

func handleUserDelete(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := sysvc.NewUserService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("用户ID(id)必填")
	}
	if err := svc.Delete(ctx, id, userIDFromContext(ctx)); err != nil {
		return resultError(fmt.Sprintf("删除用户失败: %v", err))
	}
	return resultText(map[string]any{"message": "用户已删除", "id": id})
}

// ════════════════════════════════════════════════
// 角色管理
// ════════════════════════════════════════════════

func registerRoleTools(s *server.MCPServer) {
	s.AddTool(
		mcp.NewTool("system_role_list",
			mcp.WithDescription("查询角色列表(全部,不分页)"),
		),
		handleRoleList,
	)
	s.AddTool(
		mcp.NewTool("system_role_get",
			mcp.WithDescription("查询角色详情"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("角色ID")),
		),
		handleRoleGet,
	)
	s.AddTool(
		mcp.NewTool("system_role_create",
			mcp.WithDescription("创建角色"),
			mcp.WithString("name", mcp.Required(), mcp.Description("角色名称,如 销售经理")),
			mcp.WithString("code", mcp.Required(), mcp.Description("角色编码(英文唯一),如 SALES_MANAGER")),
			mcp.WithNumber("sort", mcp.Description("排序(默认0)")),
			mcp.WithString("remark", mcp.Description("备注")),
		),
		handleRoleCreate,
	)
	s.AddTool(
		mcp.NewTool("system_role_update",
			mcp.WithDescription("更新角色"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("角色ID")),
			mcp.WithString("name", mcp.Description("角色名称")),
			mcp.WithNumber("sort", mcp.Description("排序")),
			mcp.WithString("remark", mcp.Description("备注")),
			mcp.WithNumber("status", mcp.Description("状态:1启用 0禁用")),
		),
		handleRoleUpdate,
	)
	s.AddTool(
		mcp.NewTool("system_role_delete",
			mcp.WithDescription("删除角色"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("角色ID")),
		),
		handleRoleDelete,
	)
	s.AddTool(
		mcp.NewTool("system_role_assign_menus",
			mcp.WithDescription("给角色分配菜单权限(覆盖式)"),
			mcp.WithNumber("role_id", mcp.Required(), mcp.Description("角色ID")),
			mcp.WithString("menu_ids", mcp.Required(), mcp.Description("菜单ID列表,逗号分隔,如 1,2,3")),
		),
		handleRoleAssignMenus,
	)
	s.AddTool(
		mcp.NewTool("system_role_assign_apis",
			mcp.WithDescription("给角色分配 API 接口权限(Casbin,覆盖式)"),
			mcp.WithNumber("role_id", mcp.Required(), mcp.Description("角色ID")),
			mcp.WithString("apis", mcp.Required(), mcp.Description(`API 列表 JSON 字符串。格式:[{"path":"/crm/customers","method":"GET"},{"path":"/crm/customers","method":"POST"}]`)),
		),
		handleRoleAssignAPIs,
	)
	s.AddTool(
		mcp.NewTool("system_role_get_apis",
			mcp.WithDescription("查询角色已分配的 API 权限列表"),
			mcp.WithNumber("role_id", mcp.Required(), mcp.Description("角色ID")),
		),
		handleRoleGetAPIs,
	)
}

func handleRoleList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := sysvc.NewRoleService()
	list, err := svc.ListAll(ctx)
	if err != nil {
		return resultError(fmt.Sprintf("查询角色列表失败: %v", err))
	}
	return resultText(list)
}

func handleRoleGet(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := sysvc.NewRoleService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("角色ID(id)必填")
	}
	r, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("查询角色失败: %v", err))
	}
	return resultText(r)
}

func handleRoleCreate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := sysvc.NewRoleService()
	name := req.GetString("name", "")
	code := req.GetString("code", "")
	if name == "" || code == "" {
		return resultError("角色名称(name)和编码(code)必填")
	}
	cr := &sysvc.CreateRoleRequest{
		Name:   name,
		Code:   code,
		Sort:   int(req.GetFloat("sort", 0)),
		Remark: req.GetString("remark", ""),
	}
	if err := svc.Create(ctx, cr); err != nil {
		return resultError(fmt.Sprintf("创建角色失败: %v", err))
	}
	return resultText(map[string]any{"message": "角色已创建", "code": code})
}

func handleRoleUpdate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := sysvc.NewRoleService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("角色ID(id)必填")
	}
	ur := &sysvc.UpdateRoleRequest{
		Name:   req.GetString("name", ""),
		Sort:   int(req.GetFloat("sort", 0)),
		Remark: req.GetString("remark", ""),
	}
	if v := req.GetFloat("status", -1); v >= 0 {
		st := int8(v)
		ur.Status = &st
	}
	if err := svc.Update(ctx, id, ur); err != nil {
		return resultError(fmt.Sprintf("更新角色失败: %v", err))
	}
	return resultText(map[string]any{"message": "角色已更新", "id": id})
}

func handleRoleDelete(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := sysvc.NewRoleService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("角色ID(id)必填")
	}
	if err := svc.Delete(ctx, id); err != nil {
		return resultError(fmt.Sprintf("删除角色失败: %v", err))
	}
	return resultText(map[string]any{"message": "角色已删除", "id": id})
}

func handleRoleAssignMenus(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := sysvc.NewRoleService()
	roleID := uint(req.GetFloat("role_id", 0))
	menuIDs := parseIDList(req.GetString("menu_ids", ""))
	if roleID == 0 || len(menuIDs) == 0 {
		return resultError("角色ID(role_id)和菜单ID列表(menu_ids)必填")
	}
	if err := svc.SetMenus(ctx, roleID, menuIDs); err != nil {
		return resultError(fmt.Sprintf("分配菜单失败: %v", err))
	}
	return resultText(map[string]any{"message": "菜单权限已分配", "role_id": roleID, "menu_count": len(menuIDs)})
}

func handleRoleAssignAPIs(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := sysvc.NewRoleService()
	roleID := uint(req.GetFloat("role_id", 0))
	apisJSON := req.GetString("apis", "")
	if roleID == 0 || apisJSON == "" {
		return resultError("角色ID(role_id)和API列表(apis)必填")
	}
	var apis []sysvc.RoleAPIItem
	if err := json.Unmarshal([]byte(apisJSON), &apis); err != nil {
		return resultError(fmt.Sprintf("API列表JSON解析失败: %v", err))
	}
	if err := svc.SetAPIs(ctx, roleID, apis); err != nil {
		return resultError(fmt.Sprintf("分配API失败: %v", err))
	}
	return resultText(map[string]any{"message": "API权限已分配", "role_id": roleID, "api_count": len(apis)})
}

func handleRoleGetAPIs(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := sysvc.NewRoleService()
	roleID := uint(req.GetFloat("role_id", 0))
	if roleID == 0 {
		return resultError("角色ID(role_id)必填")
	}
	apis, err := svc.GetAPIs(ctx, roleID)
	if err != nil {
		return resultError(fmt.Sprintf("查询API权限失败: %v", err))
	}
	return resultText(apis)
}

// ════════════════════════════════════════════════
// 菜单管理
// ════════════════════════════════════════════════

func registerMenuTools(s *server.MCPServer) {
	s.AddTool(
		mcp.NewTool("system_menu_tree",
			mcp.WithDescription("查询完整菜单树(所有菜单,树形结构)"),
		),
		handleMenuTree,
	)
	s.AddTool(
		mcp.NewTool("system_menu_create",
			mcp.WithDescription("创建菜单。type:0目录 1菜单 2按钮。parent_id=0 为顶级。component 对应前端页面路径(如 system/user/index)"),
			mcp.WithString("name", mcp.Required(), mcp.Description("菜单名称")),
			mcp.WithNumber("parent_id", mcp.Description("父菜单ID(顶级填0)")),
			mcp.WithString("path", mcp.Description("路由路径,如 /system/user")),
			mcp.WithString("component", mcp.Description("前端组件路径,如 system/user/index")),
			mcp.WithString("icon", mcp.Description("图标名")),
			mcp.WithNumber("type", mcp.Description("类型:0目录 1菜单 2按钮(默认1)")),
			mcp.WithString("permission", mcp.Description("权限标识,如 system:user:add")),
			mcp.WithNumber("sort", mcp.Description("排序(默认0)")),
		),
		handleMenuCreate,
	)
	s.AddTool(
		mcp.NewTool("system_menu_update",
			mcp.WithDescription("更新菜单"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("菜单ID")),
			mcp.WithString("name", mcp.Description("菜单名称")),
			mcp.WithString("path", mcp.Description("路由路径")),
			mcp.WithString("component", mcp.Description("前端组件路径")),
			mcp.WithString("icon", mcp.Description("图标名")),
			mcp.WithNumber("type", mcp.Description("类型:0目录 1菜单 2按钮")),
			mcp.WithString("permission", mcp.Description("权限标识")),
			mcp.WithNumber("sort", mcp.Description("排序")),
			mcp.WithNumber("status", mcp.Description("状态:1启用 0禁用")),
		),
		handleMenuUpdate,
	)
	s.AddTool(
		mcp.NewTool("system_menu_delete",
			mcp.WithDescription("删除菜单"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("菜单ID")),
		),
		handleMenuDelete,
	)
}

func handleMenuTree(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := sysvc.NewMenuService()
	tree, err := svc.GetTree(ctx)
	if err != nil {
		return resultError(fmt.Sprintf("查询菜单树失败: %v", err))
	}
	return resultText(tree)
}

func handleMenuCreate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := sysvc.NewMenuService()
	name := req.GetString("name", "")
	if name == "" {
		return resultError("菜单名称(name)必填")
	}
	cr := &sysvc.CreateMenuRequest{
		ParentID:   uint(req.GetFloat("parent_id", 0)),
		Name:       name,
		Path:       req.GetString("path", ""),
		Component:  req.GetString("component", ""),
		Icon:       req.GetString("icon", ""),
		Type:       int8(req.GetFloat("type", 1)),
		Permission: req.GetString("permission", ""),
		Sort:       int(req.GetFloat("sort", 0)),
		Visible:    1,
		Status:     1,
	}
	if err := svc.Create(ctx, cr); err != nil {
		return resultError(fmt.Sprintf("创建菜单失败: %v", err))
	}
	return resultText(map[string]any{"message": "菜单已创建", "name": name})
}

func handleMenuUpdate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := sysvc.NewMenuService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("菜单ID(id)必填")
	}
	ur := &sysvc.UpdateMenuRequest{
		Name:       req.GetString("name", ""),
		Path:       req.GetString("path", ""),
		Component:  req.GetString("component", ""),
		Icon:       req.GetString("icon", ""),
		Type:       int8(req.GetFloat("type", 1)),
		Permission: req.GetString("permission", ""),
		Sort:       int(req.GetFloat("sort", 0)),
		Status:     int8(req.GetFloat("status", 1)),
	}
	if err := svc.Update(ctx, id, ur); err != nil {
		return resultError(fmt.Sprintf("更新菜单失败: %v", err))
	}
	return resultText(map[string]any{"message": "菜单已更新", "id": id})
}

func handleMenuDelete(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := sysvc.NewMenuService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("菜单ID(id)必填")
	}
	if err := svc.Delete(ctx, id); err != nil {
		return resultError(fmt.Sprintf("删除菜单失败: %v", err))
	}
	return resultText(map[string]any{"message": "菜单已删除", "id": id})
}

// ════════════════════════════════════════════════
// API 管理
// ════════════════════════════════════════════════

func registerAPITools(s *server.MCPServer) {
	s.AddTool(
		mcp.NewTool("system_api_list",
			mcp.WithDescription("查询API接口列表(Casbin 权限项)"),
			mcp.WithNumber("page", mcp.Description("页码(默认1)")),
			mcp.WithNumber("page_size", mcp.Description("每页条数(默认50)")),
		),
		handleAPIList,
	)
	s.AddTool(
		mcp.NewTool("system_api_create",
			mcp.WithDescription("注册 API 接口(用于 Casbin 权限分配)"),
			mcp.WithString("path", mcp.Required(), mcp.Description("接口路径,如 /crm/customers")),
			mcp.WithString("method", mcp.Required(), mcp.Description("HTTP方法:GET/POST/PUT/DELETE")),
			mcp.WithString("group", mcp.Description("分组,如 CRM")),
			mcp.WithString("description", mcp.Description("接口描述")),
		),
		handleAPICreate,
	)
	s.AddTool(
		mcp.NewTool("system_api_delete",
			mcp.WithDescription("删除 API 接口"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("API ID")),
		),
		handleAPIDelete,
	)
}

func handleAPIList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := sysvc.NewAPIService()
	page, pageSize := parsePaging(req)
	if pageSize < 50 {
		pageSize = 50
	}
	list, total, err := svc.List(ctx, page, pageSize)
	if err != nil {
		return resultError(fmt.Sprintf("查询API列表失败: %v", err))
	}
	return resultText(map[string]any{"list": list, "total": total, "page": page, "size": pageSize})
}

func handleAPICreate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := sysvc.NewAPIService()
	path := req.GetString("path", "")
	method := req.GetString("method", "")
	if path == "" || method == "" {
		return resultError("路径(path)和方法(method)必填")
	}
	if err := svc.Create(ctx, &sysvc.CreateAPIRequest{
		Path: path, Method: method,
		Group: req.GetString("group", ""), Description: req.GetString("description", ""),
	}); err != nil {
		return resultError(fmt.Sprintf("创建API失败: %v", err))
	}
	return resultText(map[string]any{"message": "API已创建", "path": path, "method": method})
}

func handleAPIDelete(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := sysvc.NewAPIService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("API ID(id)必填")
	}
	if err := svc.Delete(ctx, id); err != nil {
		return resultError(fmt.Sprintf("删除API失败: %v", err))
	}
	return resultText(map[string]any{"message": "API已删除", "id": id})
}

// ════════════════════════════════════════════════
// 字典管理
// ════════════════════════════════════════════════

func registerDictTools(s *server.MCPServer) {
	s.AddTool(
		mcp.NewTool("system_dict_list",
			mcp.WithDescription("查询字典列表"),
			mcp.WithString("keyword", mcp.Description("字典名称/编码关键词")),
			mcp.WithNumber("page", mcp.Description("页码(默认1)")),
			mcp.WithNumber("page_size", mcp.Description("每页条数(默认20)")),
		),
		handleDictList,
	)
	s.AddTool(
		mcp.NewTool("system_dict_get",
			mcp.WithDescription("查询字典详情(含字典项)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("字典ID")),
		),
		handleDictGet,
	)
	s.AddTool(
		mcp.NewTool("system_dict_create",
			mcp.WithDescription("创建字典(含字典项)。items_json 为字典项数组 JSON"),
			mcp.WithString("name", mcp.Required(), mcp.Description("字典名称,如 商机阶段")),
			mcp.WithString("code", mcp.Required(), mcp.Description("字典编码(唯一),如 OPPORTUNITY_STAGE")),
			mcp.WithString("remark", mcp.Description("备注")),
			mcp.WithString("items_json", mcp.Required(), mcp.Description(`字典项 JSON 数组。格式:[{"label":"初步接触","value":"PROSPECTING","sort":1},{"label":"赢单","value":"WON","sort":5}]`)),
		),
		handleDictCreate,
	)
	s.AddTool(
		mcp.NewTool("system_dict_update",
			mcp.WithDescription("更新字典(含字典项,覆盖式)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("字典ID")),
			mcp.WithString("name", mcp.Required(), mcp.Description("字典名称")),
			mcp.WithString("code", mcp.Required(), mcp.Description("字典编码")),
			mcp.WithString("remark", mcp.Description("备注")),
			mcp.WithString("items_json", mcp.Required(), mcp.Description("字典项 JSON 数组(覆盖原有项)")),
		),
		handleDictUpdate,
	)
	s.AddTool(
		mcp.NewTool("system_dict_delete",
			mcp.WithDescription("删除字典(含字典项)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("字典ID")),
		),
		handleDictDelete,
	)
}

func handleDictList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := sysvc.NewDictService()
	page, pageSize := parsePaging(req)
	keyword := req.GetString("keyword", "")
	list, total, err := svc.List(ctx, page, pageSize, keyword)
	if err != nil {
		return resultError(fmt.Sprintf("查询字典列表失败: %v", err))
	}
	return resultText(map[string]any{"list": list, "total": total, "page": page, "size": pageSize})
}

func handleDictGet(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := sysvc.NewDictService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("字典ID(id)必填")
	}
	d, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("查询字典失败: %v", err))
	}
	return resultText(d)
}

func handleDictCreate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := sysvc.NewDictService()
	name := req.GetString("name", "")
	code := req.GetString("code", "")
	itemsJSON := req.GetString("items_json", "")
	if name == "" || code == "" || itemsJSON == "" {
		return resultError("字典名称(name)、编码(code)、字典项(items_json)必填")
	}
	var items []sysvc.CreateDictItem
	if err := json.Unmarshal([]byte(itemsJSON), &items); err != nil {
		return resultError(fmt.Sprintf("字典项JSON解析失败: %v", err))
	}
	if err := svc.Create(ctx, &sysvc.CreateDictRequest{
		Name: name, Code: code, Remark: req.GetString("remark", ""), Items: items,
	}); err != nil {
		return resultError(fmt.Sprintf("创建字典失败: %v", err))
	}
	return resultText(map[string]any{"message": "字典已创建", "code": code, "item_count": len(items)})
}

func handleDictUpdate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := sysvc.NewDictService()
	id := uint(req.GetFloat("id", 0))
	name := req.GetString("name", "")
	code := req.GetString("code", "")
	itemsJSON := req.GetString("items_json", "")
	if id == 0 || name == "" || code == "" || itemsJSON == "" {
		return resultError("字典ID(id)、名称(name)、编码(code)、字典项(items_json)必填")
	}
	var items []sysvc.CreateDictItem
	if err := json.Unmarshal([]byte(itemsJSON), &items); err != nil {
		return resultError(fmt.Sprintf("字典项JSON解析失败: %v", err))
	}
	if err := svc.Update(ctx, id, &sysvc.UpdateDictRequest{
		Name: name, Code: code, Remark: req.GetString("remark", ""), Items: items,
	}); err != nil {
		return resultError(fmt.Sprintf("更新字典失败: %v", err))
	}
	return resultText(map[string]any{"message": "字典已更新", "id": id, "item_count": len(items)})
}

func handleDictDelete(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := sysvc.NewDictService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("字典ID(id)必填")
	}
	if err := svc.Delete(ctx, id); err != nil {
		return resultError(fmt.Sprintf("删除字典失败: %v", err))
	}
	return resultText(map[string]any{"message": "字典已删除", "id": id})
}

// ════════════════════════════════════════════════
// 辅助函数
// ════════════════════════════════════════════════

// parsePaging 从请求解析分页参数
func parsePaging(req mcp.CallToolRequest) (int, int) {
	page := int(req.GetFloat("page", 1))
	pageSize := int(req.GetFloat("page_size", 20))
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 || pageSize > 100 {
		pageSize = 20
	}
	return page, pageSize
}

// parseIDList 解析逗号分隔的 ID 列表 "1,2,3" → []uint{1,2,3}
func parseIDList(s string) []uint {
	if s == "" {
		return nil
	}
	var ids []uint
	for _, part := range splitComma(s) {
		if id := parseUint(part); id > 0 {
			ids = append(ids, id)
		}
	}
	return ids
}

// splitComma 简单逗号分割(去除空白)
func splitComma(s string) []string {
	var parts []string
	current := ""
	for _, ch := range s {
		if ch == ',' {
			if current != "" {
				parts = append(parts, current)
			}
			current = ""
		} else if ch != ' ' {
			current += string(ch)
		}
	}
	if current != "" {
		parts = append(parts, current)
	}
	return parts
}
