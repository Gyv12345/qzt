package mcp

import (
	"context"
	"fmt"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"

	oasvc "qzt-go-server/internal/module/oa/service"
)

// tools_oa_meeting.go OA 会议 tools(会议室 + 会议预订)。

func registerOaMeetingRoomTools(s *server.MCPServer) {
	// ── 会议室 meeting_room (5) ──
	s.AddTool(
		mcp.NewTool("oa_meeting_room_list",
			mcp.WithDescription("查询会议室列表"),
			mcp.WithString("name", mcp.Description("会议室名称关键词")),
			mcp.WithString("status", mcp.Description("状态:ENABLED/DISABLED/MAINTENANCE")),
			mcp.WithNumber("page", mcp.Description("页码(默认1)")),
			mcp.WithNumber("page_size", mcp.Description("每页条数(默认20)")),
		),
		handleOaMeetingRoomList,
	)
	s.AddTool(
		mcp.NewTool("oa_meeting_room_get",
			mcp.WithDescription("查询会议室详情"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("会议室ID")),
		),
		handleOaMeetingRoomGet,
	)
	s.AddTool(
		mcp.NewTool("oa_meeting_room_create",
			mcp.WithDescription("创建会议室"),
			mcp.WithString("name", mcp.Required(), mcp.Description("会议室名称")),
			mcp.WithString("location", mcp.Description("位置")),
			mcp.WithNumber("capacity", mcp.Description("容纳人数")),
			mcp.WithString("equipment", mcp.Description("设备(逗号分隔)")),
			mcp.WithString("status", mcp.Description("状态:ENABLED/DISABLED/MAINTENANCE(默认ENABLED)")),
			mcp.WithString("remark", mcp.Description("备注")),
		),
		handleOaMeetingRoomCreate,
	)
	s.AddTool(
		mcp.NewTool("oa_meeting_room_update",
			mcp.WithDescription("更新会议室(只传要修改的字段)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("会议室ID")),
			mcp.WithString("name", mcp.Description("会议室名称")),
			mcp.WithString("location", mcp.Description("位置")),
			mcp.WithNumber("capacity", mcp.Description("容纳人数")),
			mcp.WithString("equipment", mcp.Description("设备(逗号分隔)")),
			mcp.WithString("status", mcp.Description("状态")),
			mcp.WithString("remark", mcp.Description("备注")),
		),
		handleOaMeetingRoomUpdate,
	)
	s.AddTool(
		mcp.NewTool("oa_meeting_room_delete",
			mcp.WithDescription("删除会议室"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("会议室ID")),
		),
		handleOaMeetingRoomDelete,
	)
}

func registerOaMeetingBookingTools(s *server.MCPServer) {
	// ── 会议预订 meeting_booking (5) ──
	s.AddTool(
		mcp.NewTool("oa_meeting_booking_list",
			mcp.WithDescription("查询会议预订列表"),
			mcp.WithNumber("room_id", mcp.Description("会议室ID")),
			mcp.WithNumber("organizer_id", mcp.Description("预订人ID")),
			mcp.WithString("approval_status", mcp.Description("审批状态:NONE/PROCESSING/APPROVED/REJECTED")),
			mcp.WithString("start_date", mcp.Description("开始日期(YYYY-MM-DD)")),
			mcp.WithString("end_date", mcp.Description("结束日期(YYYY-MM-DD)")),
			mcp.WithNumber("page", mcp.Description("页码(默认1)")),
			mcp.WithNumber("page_size", mcp.Description("每页条数(默认20)")),
		),
		handleOaMeetingBookingList,
	)
	s.AddTool(
		mcp.NewTool("oa_meeting_booking_get",
			mcp.WithDescription("查询会议预订详情"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("预订ID")),
		),
		handleOaMeetingBookingGet,
	)
	s.AddTool(
		mcp.NewTool("oa_meeting_booking_create",
			mcp.WithDescription("创建会议预订(自动冲突检测)"),
			mcp.WithString("title", mcp.Required(), mcp.Description("会议标题")),
			mcp.WithNumber("room_id", mcp.Required(), mcp.Description("会议室ID")),
			mcp.WithString("start_time", mcp.Required(), mcp.Description("开始时间(YYYY-MM-DD HH:mm:ss)")),
			mcp.WithString("end_time", mcp.Required(), mcp.Description("结束时间(YYYY-MM-DD HH:mm:ss)")),
			mcp.WithNumber("attendees", mcp.Description("参会人数")),
			mcp.WithString("topic", mcp.Description("会议主题/议程")),
			mcp.WithString("remark", mcp.Description("备注")),
			mcp.WithNumber("dept_id", mcp.Description("部门ID")),
		),
		handleOaMeetingBookingCreate,
	)
	s.AddTool(
		mcp.NewTool("oa_meeting_booking_update",
			mcp.WithDescription("更新会议预订(仅未提交/已驳回可改;只传要修改的字段;改会议室或时间会重新检测冲突)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("预订ID")),
			mcp.WithString("title", mcp.Description("会议标题")),
			mcp.WithNumber("room_id", mcp.Description("会议室ID")),
			mcp.WithString("start_time", mcp.Description("开始时间(YYYY-MM-DD HH:mm:ss)")),
			mcp.WithString("end_time", mcp.Description("结束时间(YYYY-MM-DD HH:mm:ss)")),
			mcp.WithNumber("attendees", mcp.Description("参会人数")),
			mcp.WithString("topic", mcp.Description("会议主题/议程")),
			mcp.WithString("remark", mcp.Description("备注")),
		),
		handleOaMeetingBookingUpdate,
	)
	s.AddTool(
		mcp.NewTool("oa_meeting_booking_delete",
			mcp.WithDescription("删除会议预订(仅未提交审批可删)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("预订ID")),
		),
		handleOaMeetingBookingDelete,
	)
}

// ── 会议室 handlers ──

func handleOaMeetingRoomList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewMeetingRoomService()
	page, pageSize := mcpPage(req)
	list, total, err := svc.List(ctx, page, pageSize,
		req.GetString("name", ""),
		req.GetString("status", ""),
	)
	if err != nil {
		return resultError(fmt.Sprintf("查询会议室列表失败: %v", err))
	}
	return resultText(map[string]any{"list": list, "total": total, "page": page, "size": pageSize})
}

func handleOaMeetingRoomGet(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewMeetingRoomService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("会议室ID(id)必填")
	}
	room, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("查询会议室失败: %v", err))
	}
	return resultText(room)
}

func handleOaMeetingRoomCreate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewMeetingRoomService()
	name := req.GetString("name", "")
	if name == "" {
		return resultError("会议室名称(name)必填")
	}
	createReq := &oasvc.CreateMeetingRoomRequest{
		Name:      name,
		Location:  req.GetString("location", ""),
		Capacity:  int(req.GetFloat("capacity", 0)),
		Equipment: req.GetString("equipment", ""),
		Status:    req.GetString("status", ""),
		Remark:    req.GetString("remark", ""),
	}
	room, err := svc.Create(ctx, createReq)
	if err != nil {
		return resultError(fmt.Sprintf("创建会议室失败: %v", err))
	}
	return resultText(room)
}

func handleOaMeetingRoomUpdate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewMeetingRoomService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("会议室ID(id)必填")
	}
	existing, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("会议室不存在: %v", err))
	}
	upd := &oasvc.UpdateMeetingRoomRequest{
		Name:      req.GetString("name", existing.Name),
		Location:  req.GetString("location", existing.Location),
		Capacity:  int(req.GetFloat("capacity", float64(existing.Capacity))),
		Equipment: req.GetString("equipment", existing.Equipment),
		Status:    req.GetString("status", existing.Status),
		Remark:    req.GetString("remark", existing.Remark),
	}
	if err := svc.Update(ctx, id, upd); err != nil {
		return resultError(fmt.Sprintf("更新会议室失败: %v", err))
	}
	return resultText(map[string]any{"message": "会议室已更新", "id": id})
}

func handleOaMeetingRoomDelete(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewMeetingRoomService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("会议室ID(id)必填")
	}
	if err := svc.Delete(ctx, id); err != nil {
		return resultError(fmt.Sprintf("删除会议室失败: %v", err))
	}
	return resultText(map[string]any{"message": "会议室已删除", "id": id})
}

// ── 会议预订 handlers ──

func handleOaMeetingBookingList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewMeetingBookingService()
	page, pageSize := mcpPage(req)
	list, total, err := svc.List(ctx, page, pageSize,
		uint(req.GetFloat("room_id", 0)),
		uint(req.GetFloat("organizer_id", 0)),
		req.GetString("title", ""),
		req.GetString("approval_status", ""),
		req.GetString("start_date", ""),
		req.GetString("end_date", ""),
	)
	if err != nil {
		return resultError(fmt.Sprintf("查询会议预订列表失败: %v", err))
	}
	return resultText(map[string]any{"list": list, "total": total, "page": page, "size": pageSize})
}

func handleOaMeetingBookingGet(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewMeetingBookingService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("预订ID(id)必填")
	}
	booking, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("查询会议预订失败: %v", err))
	}
	return resultText(booking)
}

func handleOaMeetingBookingCreate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewMeetingBookingService()
	title := req.GetString("title", "")
	roomID := uint(req.GetFloat("room_id", 0))
	startTime := req.GetString("start_time", "")
	endTime := req.GetString("end_time", "")
	if title == "" || roomID == 0 || startTime == "" || endTime == "" {
		return resultError("标题(title)、会议室ID(room_id)、开始时间(start_time)、结束时间(end_time)必填")
	}
	createReq := &oasvc.CreateMeetingBookingRequest{
		Title:     title,
		RoomID:    roomID,
		StartTime: startTime,
		EndTime:   endTime,
		Attendees: int(req.GetFloat("attendees", 0)),
		Topic:     req.GetString("topic", ""),
		Remark:    req.GetString("remark", ""),
		DeptID:    optUintPtr(req, "dept_id"),
	}
	booking, err := svc.Create(ctx, createReq, userIDFromContext(ctx))
	if err != nil {
		return resultError(fmt.Sprintf("创建会议预订失败: %v", err))
	}
	return resultText(booking)
}

func handleOaMeetingBookingUpdate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewMeetingBookingService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("预订ID(id)必填")
	}
	existing, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("会议预订不存在: %v", err))
	}
	// attendees service 无条件覆盖,需显式保留旧值
	attendees := existing.Attendees
	if argPresent(req, "attendees") {
		attendees = int(req.GetFloat("attendees", 0))
	}
	// start_time/end_time/room_id 留空/0 时 service 自动保留旧值
	upd := &oasvc.UpdateMeetingBookingRequest{
		Title:     req.GetString("title", existing.Title),
		RoomID:    uint(req.GetFloat("room_id", float64(existing.RoomID))),
		StartTime: req.GetString("start_time", ""),
		EndTime:   req.GetString("end_time", ""),
		Attendees: attendees,
		Topic:     req.GetString("topic", existing.Topic),
		Remark:    req.GetString("remark", existing.Remark),
	}
	if err := svc.Update(ctx, id, upd); err != nil {
		return resultError(fmt.Sprintf("更新会议预订失败: %v", err))
	}
	return resultText(map[string]any{"message": "会议预订已更新", "id": id})
}

func handleOaMeetingBookingDelete(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewMeetingBookingService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("预订ID(id)必填")
	}
	if err := svc.Delete(ctx, id); err != nil {
		return resultError(fmt.Sprintf("删除会议预订失败: %v", err))
	}
	return resultText(map[string]any{"message": "会议预订已删除", "id": id})
}
