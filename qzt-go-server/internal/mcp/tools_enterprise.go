package mcp

import (
	"context"
	"fmt"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"

	entsvc "qzt-go-server/internal/module/enterprise/service"
)

// tools_enterprise.go 定时任务管理 tools(列表/详情/创建/更新/删除/手动触发/执行日志)。

func registerEnterpriseTools(s *server.MCPServer) {
	// ── 定时任务 ──
	s.AddTool(
		mcp.NewTool("enterprise_job_list",
			mcp.WithDescription("查询定时任务列表"),
			mcp.WithNumber("page", mcp.Description("页码(默认1)")),
			mcp.WithNumber("page_size", mcp.Description("每页条数(默认20)")),
		),
		handleEnterpriseJobList,
	)

	s.AddTool(
		mcp.NewTool("enterprise_job_get",
			mcp.WithDescription("查询定时任务详情"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("任务ID")),
		),
		handleEnterpriseJobGet,
	)

	s.AddTool(
		mcp.NewTool("enterprise_job_create",
			mcp.WithDescription("创建定时任务(cron 表达式为 6 段式:秒分时日月周)"),
			mcp.WithString("job_name", mcp.Required(), mcp.Description("任务名称")),
			mcp.WithString("cron_expression", mcp.Required(), mcp.Description("Cron表达式(6段式 秒分时日月周,如 0 */5 * * * *)")),
			mcp.WithString("bean_class", mcp.Required(), mcp.Description("执行处理器注册名(须已在系统注册)")),
			mcp.WithString("job_group", mcp.Description("任务分组")),
			mcp.WithNumber("status", mcp.Description("状态:0暂停 1运行(默认1运行)")),
			mcp.WithString("remark", mcp.Description("备注")),
		),
		handleEnterpriseJobCreate,
	)

	s.AddTool(
		mcp.NewTool("enterprise_job_update",
			mcp.WithDescription("更新定时任务(只传要修改的字段)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("任务ID")),
			mcp.WithString("job_name", mcp.Description("任务名称")),
			mcp.WithString("cron_expression", mcp.Description("Cron表达式(6段式 秒分时日月周)")),
			mcp.WithString("bean_class", mcp.Description("执行处理器注册名")),
			mcp.WithString("job_group", mcp.Description("任务分组")),
			mcp.WithNumber("status", mcp.Description("状态:0暂停 1运行")),
			mcp.WithString("remark", mcp.Description("备注")),
		),
		handleEnterpriseJobUpdate,
	)

	s.AddTool(
		mcp.NewTool("enterprise_job_delete",
			mcp.WithDescription("删除定时任务"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("任务ID")),
		),
		handleEnterpriseJobDelete,
	)

	s.AddTool(
		mcp.NewTool("enterprise_job_run",
			mcp.WithDescription("手动触发任务一次(会立即异步执行该定时任务,不等待执行结果)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("任务ID")),
		),
		handleEnterpriseJobRun,
	)

	s.AddTool(
		mcp.NewTool("enterprise_job_log_list",
			mcp.WithDescription("查询任务执行日志"),
			mcp.WithNumber("job_id", mcp.Description("任务ID(可选过滤)")),
			mcp.WithNumber("page", mcp.Description("页码(默认1)")),
			mcp.WithNumber("page_size", mcp.Description("每页条数(默认20)")),
		),
		handleEnterpriseJobLogList,
	)
}

// ── handlers ──

func handleEnterpriseJobList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := entsvc.NewJobService()
	page, pageSize := mcpPage(req)
	list, total, err := svc.List(ctx, page, pageSize)
	if err != nil {
		return resultError(fmt.Sprintf("查询定时任务列表失败: %v", err))
	}
	return resultText(map[string]any{"list": list, "total": total, "page": page, "size": pageSize})
}

func handleEnterpriseJobGet(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := entsvc.NewJobService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("任务ID(id)必填")
	}
	job, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("查询定时任务失败: %v", err))
	}
	return resultText(job)
}

func handleEnterpriseJobCreate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := entsvc.NewJobService()
	jobName := req.GetString("job_name", "")
	cronExpr := req.GetString("cron_expression", "")
	beanClass := req.GetString("bean_class", "")
	if jobName == "" || cronExpr == "" || beanClass == "" {
		return resultError("任务名称(job_name)、Cron表达式(cron_expression)、处理器注册名(bean_class)必填")
	}
	createReq := &entsvc.CreateSysJobRequest{
		JobName:        jobName,
		JobGroup:       req.GetString("job_group", ""),
		CronExpression: cronExpr,
		BeanClass:      beanClass,
		Status:         int8(req.GetFloat("status", 0)),
		Remark:         req.GetString("remark", ""),
	}
	job, err := svc.Create(ctx, createReq)
	if err != nil {
		return resultError(fmt.Sprintf("创建定时任务失败: %v", err))
	}
	return resultText(job)
}

func handleEnterpriseJobUpdate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := entsvc.NewJobService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("任务ID(id)必填")
	}
	existing, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("任务不存在: %v", err))
	}

	jobName := req.GetString("job_name", existing.JobName)
	if jobName == "" {
		return resultError("任务名称不能为空")
	}
	cronExpr := req.GetString("cron_expression", existing.CronExpression)
	if cronExpr == "" {
		return resultError("Cron表达式不能为空")
	}
	beanClass := req.GetString("bean_class", existing.BeanClass)
	if beanClass == "" {
		return resultError("处理器注册名不能为空")
	}
	status := existing.Status
	if args := req.GetArguments(); args != nil {
		if _, ok := args["status"]; ok {
			status = int8(req.GetFloat("status", float64(existing.Status)))
		}
	}
	updateReq := &entsvc.UpdateSysJobRequest{
		JobName:        jobName,
		JobGroup:       req.GetString("job_group", existing.JobGroup),
		CronExpression: cronExpr,
		BeanClass:      beanClass,
		Status:         status,
		Remark:         req.GetString("remark", existing.Remark),
	}
	if err := svc.Update(ctx, id, updateReq); err != nil {
		return resultError(fmt.Sprintf("更新定时任务失败: %v", err))
	}
	return resultText(map[string]any{"message": "定时任务已更新", "id": id})
}

func handleEnterpriseJobDelete(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := entsvc.NewJobService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("任务ID(id)必填")
	}
	if err := svc.Delete(ctx, id); err != nil {
		return resultError(fmt.Sprintf("删除定时任务失败: %v", err))
	}
	return resultText(map[string]any{"message": "定时任务已删除", "id": id})
}

func handleEnterpriseJobRun(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := entsvc.NewJobService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("任务ID(id)必填")
	}
	if err := svc.RunOnce(ctx, id); err != nil {
		return resultError(fmt.Sprintf("触发任务失败: %v", err))
	}
	return resultText(map[string]any{"message": "任务已触发,异步执行中", "id": id})
}

func handleEnterpriseJobLogList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := entsvc.NewJobService()
	page, pageSize := mcpPage(req)
	jobID := uint(req.GetFloat("job_id", 0))
	list, total, err := svc.ListLogs(ctx, page, pageSize, jobID)
	if err != nil {
		return resultError(fmt.Sprintf("查询任务执行日志失败: %v", err))
	}
	return resultText(map[string]any{"list": list, "total": total, "page": page, "size": pageSize})
}
