package mcp

import (
	"context"
	"fmt"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"

	oasvc "qzt-go-server/internal/module/oa/service"
)

// tools_oa_schedule.go OA 日程 tools。

func registerOaScheduleTools(s *server.MCPServer) {
	// ── 日程 schedule (6) ──
	s.AddTool(
		mcp.NewTool("oa_schedule_list",
			mcp.WithDescription("查询日程列表(默认当前用户)"),
			mcp.WithNumber("creator_id", mcp.Description("创建人ID(默认当前用户)")),
			mcp.WithString("event_type", mcp.Description("类型:MEETING/TASK/REMINDER/OUT/OTHER")),
			mcp.WithString("status", mcp.Description("状态:PENDING/DONE/CANCELED")),
			mcp.WithString("start_date", mcp.Description("开始日期(YYYY-MM-DD)")),
			mcp.WithString("end_date", mcp.Description("结束日期(YYYY-MM-DD)")),
			mcp.WithNumber("page", mcp.Description("页码(默认1)")),
			mcp.WithNumber("page_size", mcp.Description("每页条数(默认20)")),
		),
		handleOaScheduleList,
	)
	s.AddTool(
		mcp.NewTool("oa_schedule_calendar",
			mcp.WithDescription("日历视图:返回当前用户指定日期范围内的全部日程"),
			mcp.WithString("start_date", mcp.Required(), mcp.Description("开始日期(YYYY-MM-DD)")),
			mcp.WithString("end_date", mcp.Required(), mcp.Description("结束日期(YYYY-MM-DD)")),
		),
		handleOaScheduleCalendar,
	)
	s.AddTool(
		mcp.NewTool("oa_schedule_get",
			mcp.WithDescription("查询日程详情"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("日程ID")),
		),
		handleOaScheduleGet,
	)
	s.AddTool(
		mcp.NewTool("oa_schedule_create",
			mcp.WithDescription("创建日程"),
			mcp.WithString("title", mcp.Required(), mcp.Description("标题")),
			mcp.WithString("start_time", mcp.Required(), mcp.Description("开始时间(YYYY-MM-DD HH:mm:ss)")),
			mcp.WithString("end_time", mcp.Required(), mcp.Description("结束时间(YYYY-MM-DD HH:mm:ss)")),
			mcp.WithString("event_type", mcp.Description("类型:MEETING/TASK/REMINDER/OUT/OTHER(默认OTHER)")),
			mcp.WithString("location", mcp.Description("地点")),
			mcp.WithString("content", mcp.Description("内容")),
			mcp.WithString("remind_type", mcp.Description("提醒:NONE/MIN5/MIN15/HOUR1/DAY1(默认NONE)")),
			mcp.WithString("status", mcp.Description("状态:PENDING/DONE/CANCELED(默认PENDING)")),
		),
		handleOaScheduleCreate,
	)
	s.AddTool(
		mcp.NewTool("oa_schedule_update",
			mcp.WithDescription("更新日程(只传要修改的字段)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("日程ID")),
			mcp.WithString("title", mcp.Description("标题")),
			mcp.WithString("event_type", mcp.Description("类型")),
			mcp.WithString("start_time", mcp.Description("开始时间(YYYY-MM-DD HH:mm:ss)")),
			mcp.WithString("end_time", mcp.Description("结束时间(YYYY-MM-DD HH:mm:ss)")),
			mcp.WithString("location", mcp.Description("地点")),
			mcp.WithString("content", mcp.Description("内容")),
			mcp.WithString("remind_type", mcp.Description("提醒")),
			mcp.WithString("status", mcp.Description("状态")),
		),
		handleOaScheduleUpdate,
	)
	s.AddTool(
		mcp.NewTool("oa_schedule_delete",
			mcp.WithDescription("删除日程"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("日程ID")),
		),
		handleOaScheduleDelete,
	)
}

// ── 日程 handlers ──

func handleOaScheduleList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewScheduleService()
	page, pageSize := mcpPage(req)
	creatorID := uint(req.GetFloat("creator_id", float64(userIDFromContext(ctx))))
	list, total, err := svc.List(ctx, page, pageSize, creatorID,
		req.GetString("event_type", ""),
		req.GetString("status", ""),
		req.GetString("start_date", ""),
		req.GetString("end_date", ""),
	)
	if err != nil {
		return resultError(fmt.Sprintf("查询日程列表失败: %v", err))
	}
	return resultText(map[string]any{"list": list, "total": total, "page": page, "size": pageSize})
}

func handleOaScheduleCalendar(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewScheduleService()
	startDate := req.GetString("start_date", "")
	endDate := req.GetString("end_date", "")
	if startDate == "" || endDate == "" {
		return resultError("开始日期(start_date)和结束日期(end_date)必填")
	}
	list, err := svc.ListByDateRange(ctx, userIDFromContext(ctx), startDate, endDate)
	if err != nil {
		return resultError(fmt.Sprintf("查询日程日历失败: %v", err))
	}
	return resultText(map[string]any{"list": list})
}

func handleOaScheduleGet(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewScheduleService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("日程ID(id)必填")
	}
	sch, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("查询日程失败: %v", err))
	}
	return resultText(sch)
}

func handleOaScheduleCreate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewScheduleService()
	title := req.GetString("title", "")
	startTime := req.GetString("start_time", "")
	endTime := req.GetString("end_time", "")
	if title == "" || startTime == "" || endTime == "" {
		return resultError("标题(title)、开始时间(start_time)、结束时间(end_time)必填")
	}
	createReq := &oasvc.CreateScheduleRequest{
		Title:      title,
		EventType:  req.GetString("event_type", ""),
		StartTime:  startTime,
		EndTime:    endTime,
		Location:   req.GetString("location", ""),
		Content:    req.GetString("content", ""),
		RemindType: req.GetString("remind_type", ""),
		Status:     req.GetString("status", ""),
	}
	sch, err := svc.Create(ctx, createReq, userIDFromContext(ctx))
	if err != nil {
		return resultError(fmt.Sprintf("创建日程失败: %v", err))
	}
	return resultText(sch)
}

func handleOaScheduleUpdate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewScheduleService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("日程ID(id)必填")
	}
	existing, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("日程不存在: %v", err))
	}
	// start_time/end_time 留空时 service 自动保留旧值
	upd := &oasvc.UpdateScheduleRequest{
		Title:      req.GetString("title", existing.Title),
		EventType:  req.GetString("event_type", existing.EventType),
		StartTime:  req.GetString("start_time", ""),
		EndTime:    req.GetString("end_time", ""),
		Location:   req.GetString("location", existing.Location),
		Content:    req.GetString("content", existing.Content),
		RemindType: req.GetString("remind_type", existing.RemindType),
		Status:     req.GetString("status", existing.Status),
	}
	if err := svc.Update(ctx, id, upd); err != nil {
		return resultError(fmt.Sprintf("更新日程失败: %v", err))
	}
	return resultText(map[string]any{"message": "日程已更新", "id": id})
}

func handleOaScheduleDelete(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewScheduleService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("日程ID(id)必填")
	}
	if err := svc.Delete(ctx, id); err != nil {
		return resultError(fmt.Sprintf("删除日程失败: %v", err))
	}
	return resultText(map[string]any{"message": "日程已删除", "id": id})
}
