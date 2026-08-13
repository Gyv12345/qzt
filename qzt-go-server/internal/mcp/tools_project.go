package mcp

// tools_project.go 项目+任务 MCP tools(读写)。

import (
	"context"
	"fmt"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"

	projsvc "qzt-go-server/internal/module/project/service"
	projrepo "qzt-go-server/internal/repository/project"
)

func registerProjectTools(s *server.MCPServer) {
	// ── 项目 ──

	s.AddTool(
		mcp.NewTool("project_list",
			mcp.WithDescription("查询项目列表"),
			mcp.WithString("keyword", mcp.Description("项目名称关键词")),
			mcp.WithNumber("status", mcp.Description("状态:1规划2进行3暂停4完成5取消")),
			mcp.WithNumber("priority", mcp.Description("优先级:1低2中3高4紧急")),
			mcp.WithNumber("manager_id", mcp.Description("项目经理ID")),
			mcp.WithNumber("page", mcp.Description("页码(默认1)")),
			mcp.WithNumber("page_size", mcp.Description("每页条数(默认20)")),
		),
		handleProjectList,
	)
	s.AddTool(
		mcp.NewTool("project_get",
			mcp.WithDescription("查询项目详情(含任务列表)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("项目ID(必填)")),
		),
		handleProjectGet,
	)
	s.AddTool(
		mcp.NewTool("project_create",
			mcp.WithDescription("新建项目"),
			mcp.WithString("name", mcp.Required(), mcp.Description("项目名称(必填)")),
			mcp.WithString("description", mcp.Description("项目描述")),
			mcp.WithNumber("customer_id", mcp.Description("关联客户ID")),
			mcp.WithString("customer_name", mcp.Description("客户名称")),
			mcp.WithNumber("contract_id", mcp.Description("关联合同ID")),
			mcp.WithNumber("manager_id", mcp.Description("项目经理ID")),
			mcp.WithString("member_ids", mcp.Description("成员ID(逗号分隔)")),
			mcp.WithNumber("priority", mcp.Description("优先级:1低2中3高4紧急")),
			mcp.WithString("start_date", mcp.Description("开始日期(YYYY-MM-DD)")),
			mcp.WithString("end_date", mcp.Description("计划完成日期(YYYY-MM-DD)")),
			mcp.WithString("tags", mcp.Description("标签(逗号分隔)")),
		),
		handleProjectCreate,
	)
	s.AddTool(
		mcp.NewTool("project_update",
			mcp.WithDescription("更新项目(半增量,未传字段保留原值)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("项目ID(必填)")),
			mcp.WithString("name", mcp.Description("项目名称")),
			mcp.WithString("description", mcp.Description("项目描述")),
			mcp.WithNumber("customer_id", mcp.Description("关联客户ID")),
			mcp.WithString("customer_name", mcp.Description("客户名称")),
			mcp.WithNumber("contract_id", mcp.Description("关联合同ID")),
			mcp.WithNumber("manager_id", mcp.Description("项目经理ID")),
			mcp.WithString("member_ids", mcp.Description("成员ID(逗号分隔)")),
			mcp.WithNumber("status", mcp.Description("状态:1规划2进行3暂停4完成5取消")),
			mcp.WithNumber("priority", mcp.Description("优先级:1低2中3高4紧急")),
			mcp.WithString("start_date", mcp.Description("开始日期(YYYY-MM-DD)")),
			mcp.WithString("end_date", mcp.Description("计划完成日期(YYYY-MM-DD)")),
			mcp.WithNumber("progress", mcp.Description("进度(0-100)")),
			mcp.WithString("tags", mcp.Description("标签(逗号分隔)")),
		),
		handleProjectUpdate,
	)
	s.AddTool(
		mcp.NewTool("project_delete",
			mcp.WithDescription("删除项目(同时删除项目下所有任务)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("项目ID(必填)")),
		),
		handleProjectDelete,
	)

	// ── 任务 ──

	s.AddTool(
		mcp.NewTool("project_task_list",
			mcp.WithDescription("查询项目任务列表"),
			mcp.WithNumber("project_id", mcp.Required(), mcp.Description("项目ID(必填)")),
		),
		handleProjectTaskList,
	)
	s.AddTool(
		mcp.NewTool("project_task_create",
			mcp.WithDescription("新建项目任务"),
			mcp.WithNumber("project_id", mcp.Required(), mcp.Description("所属项目ID(必填)")),
			mcp.WithString("title", mcp.Required(), mcp.Description("任务标题(必填)")),
			mcp.WithString("description", mcp.Description("任务描述")),
			mcp.WithNumber("assignee_id", mcp.Description("负责人ID")),
			mcp.WithNumber("priority", mcp.Description("优先级:1低2中3高4紧急")),
			mcp.WithString("due_date", mcp.Description("截止日期(YYYY-MM-DD)")),
		),
		handleProjectTaskCreate,
	)
	s.AddTool(
		mcp.NewTool("project_task_update",
			mcp.WithDescription("更新任务(半增量,未传字段保留原值)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("任务ID(必填)")),
			mcp.WithString("title", mcp.Description("任务标题")),
			mcp.WithString("description", mcp.Description("任务描述")),
			mcp.WithNumber("assignee_id", mcp.Description("负责人ID")),
			mcp.WithNumber("status", mcp.Description("状态:1待办2进行3完成4取消")),
			mcp.WithNumber("priority", mcp.Description("优先级:1低2中3高4紧急")),
			mcp.WithNumber("sort_order", mcp.Description("排序值")),
			mcp.WithString("due_date", mcp.Description("截止日期(YYYY-MM-DD)")),
		),
		handleProjectTaskUpdate,
	)
	s.AddTool(
		mcp.NewTool("project_task_status",
			mcp.WithDescription("更新任务状态(看板拖拽用)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("任务ID(必填)")),
			mcp.WithNumber("status", mcp.Required(), mcp.Description("目标状态:1待办2进行3完成4取消(必填)")),
		),
		handleProjectTaskStatus,
	)
	s.AddTool(
		mcp.NewTool("project_task_delete",
			mcp.WithDescription("删除任务"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("任务ID(必填)")),
		),
		handleProjectTaskDelete,
	)
}

// ── 项目 handlers ──

func handleProjectList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := projsvc.NewProjectService()
	page, pageSize := mcpPage(req)
	list, total, err := svc.List(ctx, page, pageSize,
		req.GetString("keyword", ""),
		int8(req.GetFloat("status", 0)),
		int8(req.GetFloat("priority", 0)),
		uint(req.GetFloat("manager_id", 0)),
	)
	if err != nil {
		return resultError(fmt.Sprintf("查询项目失败: %v", err))
	}
	return resultText(map[string]any{"list": list, "total": total, "page": page, "size": pageSize})
}

func handleProjectGet(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := projsvc.NewProjectService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("项目ID(id)必填")
	}
	detail, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("查询项目失败: %v", err))
	}
	return resultText(detail)
}

func handleProjectCreate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := projsvc.NewProjectService()
	name := req.GetString("name", "")
	if name == "" {
		return resultError("项目名称(name)必填")
	}
	createReq := &projsvc.CreateProjectRequest{
		Name:         name,
		Description:  req.GetString("description", ""),
		CustomerName: req.GetString("customer_name", ""),
		MemberIDs:    req.GetString("member_ids", ""),
		Priority:     int8(req.GetFloat("priority", 0)),
		StartDate:    req.GetString("start_date", ""),
		EndDate:      req.GetString("end_date", ""),
		Tags:         req.GetString("tags", ""),
	}
	if args := req.GetArguments(); args != nil {
		createReq.CustomerID = projOptUintArg(args, "customer_id")
		createReq.ContractID = projOptUintArg(args, "contract_id")
		createReq.ManagerID = projOptUintArg(args, "manager_id")
	}
	p, err := svc.Create(ctx, createReq)
	if err != nil {
		return resultError(fmt.Sprintf("创建项目失败: %v", err))
	}
	return resultText(p)
}

func handleProjectUpdate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := projsvc.NewProjectService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("项目ID(id)必填")
	}
	existing, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("项目不存在: %v", err))
	}
	ep := existing.Project
	// service.Update 中:status/priority>0 才覆盖,start/end_date 非空才覆盖,
	// 其余字段恒覆盖,故恒覆盖字段用旧值兜底,可选 *uint 字段保留旧指针。
	updateReq := &projsvc.UpdateProjectRequest{
		Name:         req.GetString("name", ep.Name),
		Description:  req.GetString("description", ep.Description),
		CustomerID:   ep.CustomerID,
		CustomerName: req.GetString("customer_name", ep.CustomerName),
		ContractID:   ep.ContractID,
		ManagerID:    ep.ManagerID,
		MemberIDs:    req.GetString("member_ids", ep.MemberIDs),
		Status:       int8(req.GetFloat("status", 0)),
		Priority:     int8(req.GetFloat("priority", 0)),
		StartDate:    req.GetString("start_date", ""),
		EndDate:      req.GetString("end_date", ""),
		Progress:     ep.Progress,
		Tags:         req.GetString("tags", ep.Tags),
	}
	if args := req.GetArguments(); args != nil {
		if _, ok := args["progress"]; ok {
			updateReq.Progress = int8(req.GetFloat("progress", 0))
		}
		if _, ok := args["customer_id"]; ok {
			updateReq.CustomerID = projOptUintArg(args, "customer_id")
		}
		if _, ok := args["contract_id"]; ok {
			updateReq.ContractID = projOptUintArg(args, "contract_id")
		}
		if _, ok := args["manager_id"]; ok {
			updateReq.ManagerID = projOptUintArg(args, "manager_id")
		}
	}
	if err := svc.Update(ctx, id, updateReq); err != nil {
		return resultError(fmt.Sprintf("更新项目失败: %v", err))
	}
	return resultText(map[string]any{"message": "项目已更新", "id": id})
}

func handleProjectDelete(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := projsvc.NewProjectService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("项目ID(id)必填")
	}
	if err := svc.Delete(ctx, id); err != nil {
		return resultError(fmt.Sprintf("删除项目失败: %v", err))
	}
	return resultText(map[string]any{"message": "项目已删除", "id": id})
}

// ── 任务 handlers ──

func handleProjectTaskList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := projsvc.NewProjectService()
	projectID := uint(req.GetFloat("project_id", 0))
	if projectID == 0 {
		return resultError("项目ID(project_id)必填")
	}
	tasks, err := svc.ListTasks(ctx, projectID)
	if err != nil {
		return resultError(fmt.Sprintf("查询任务失败: %v", err))
	}
	return resultText(map[string]any{"list": tasks, "total": len(tasks)})
}

func handleProjectTaskCreate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := projsvc.NewProjectService()
	projectID := uint(req.GetFloat("project_id", 0))
	title := req.GetString("title", "")
	if projectID == 0 || title == "" {
		return resultError("项目ID(project_id)和任务标题(title)必填")
	}
	createReq := &projsvc.CreateTaskRequest{
		ProjectID:   projectID,
		Title:       title,
		Description: req.GetString("description", ""),
		Priority:    int8(req.GetFloat("priority", 0)),
		DueDate:     req.GetString("due_date", ""),
	}
	if args := req.GetArguments(); args != nil {
		createReq.AssigneeID = projOptUintArg(args, "assignee_id")
	}
	t, err := svc.CreateTask(ctx, createReq)
	if err != nil {
		return resultError(fmt.Sprintf("创建任务失败: %v", err))
	}
	return resultText(t)
}

func handleProjectTaskUpdate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := projsvc.NewProjectService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("任务ID(id)必填")
	}
	existing, err := projrepo.NewTaskRepo().GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("任务不存在: %v", err))
	}
	// service.UpdateTask 中:status/priority>0 才覆盖,due_date 非空才覆盖,
	// title/description/assignee_id/sort_order 恒覆盖,故用旧值兜底。
	updateReq := &projsvc.UpdateTaskRequest{
		Title:       req.GetString("title", existing.Title),
		Description: req.GetString("description", existing.Description),
		AssigneeID:  existing.AssigneeID,
		Status:      int8(req.GetFloat("status", 0)),
		Priority:    int8(req.GetFloat("priority", 0)),
		SortOrder:   existing.SortOrder,
		DueDate:     req.GetString("due_date", ""),
	}
	if args := req.GetArguments(); args != nil {
		if _, ok := args["assignee_id"]; ok {
			updateReq.AssigneeID = projOptUintArg(args, "assignee_id")
		}
		if _, ok := args["sort_order"]; ok {
			updateReq.SortOrder = int(req.GetFloat("sort_order", 0))
		}
	}
	if err := svc.UpdateTask(ctx, id, updateReq); err != nil {
		return resultError(fmt.Sprintf("更新任务失败: %v", err))
	}
	return resultText(map[string]any{"message": "任务已更新", "id": id})
}

func handleProjectTaskStatus(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := projsvc.NewProjectService()
	id := uint(req.GetFloat("id", 0))
	status := int8(req.GetFloat("status", 0))
	if id == 0 || status == 0 {
		return resultError("任务ID(id)和状态(status)必填")
	}
	if err := svc.UpdateTaskStatus(ctx, id, status); err != nil {
		return resultError(fmt.Sprintf("更新任务状态失败: %v", err))
	}
	return resultText(map[string]any{"message": "任务状态已更新", "id": id, "status": status})
}

func handleProjectTaskDelete(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := projsvc.NewProjectService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("任务ID(id)必填")
	}
	if err := svc.DeleteTask(ctx, id); err != nil {
		return resultError(fmt.Sprintf("删除任务失败: %v", err))
	}
	return resultText(map[string]any{"message": "任务已删除", "id": id})
}

// projOptUintArg 从 args 取可选 uint 参数,返回 *uint。
// 未提供 → nil(不设置);显式传 0/负数 → nil(清空);>0 → 指向该值的指针。
func projOptUintArg(args map[string]any, key string) *uint {
	v, ok := args[key]
	if !ok {
		return nil
	}
	if f, ok2 := v.(float64); ok2 && f > 0 {
		u := uint(f)
		return &u
	}
	return nil
}
