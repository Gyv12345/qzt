package mcp

import (
	"context"
	"fmt"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"

	oasvc "qzt-go-server/internal/module/oa/service"
)

// tools_oa_notice.go OA 公告 tools。

func registerOaNoticeTools(s *server.MCPServer) {
	// ── 公告 notice (9) ──
	s.AddTool(
		mcp.NewTool("oa_notice_list",
			mcp.WithDescription("查询公告管理端列表(分页)"),
			mcp.WithString("title", mcp.Description("标题关键词")),
			mcp.WithNumber("type", mcp.Description("类型:1通知 2公告(不传查全部)")),
			mcp.WithNumber("status", mcp.Description("状态:0草稿 1发布(不传查全部)")),
			mcp.WithNumber("page", mcp.Description("页码(默认1)")),
			mcp.WithNumber("page_size", mcp.Description("每页条数(默认20)")),
		),
		handleOaNoticeList,
	)
	s.AddTool(
		mcp.NewTool("oa_notice_feed",
			mcp.WithDescription("首页公告流(已发布的最新公告)"),
			mcp.WithNumber("limit", mcp.Description("返回条数(默认5)")),
		),
		handleOaNoticeFeed,
	)
	s.AddTool(
		mcp.NewTool("oa_notice_published",
			mcp.WithDescription("查询已发布公告"),
			mcp.WithNumber("type", mcp.Description("类型:1通知 2公告(不传查全部)")),
			mcp.WithNumber("limit", mcp.Description("返回条数(默认10)")),
		),
		handleOaNoticePublished,
	)
	s.AddTool(
		mcp.NewTool("oa_notice_get",
			mcp.WithDescription("查询公告详情"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("公告ID")),
		),
		handleOaNoticeGet,
	)
	s.AddTool(
		mcp.NewTool("oa_notice_create",
			mcp.WithDescription("创建公告(默认草稿状态,可用 oa_notice_publish 发布)"),
			mcp.WithString("title", mcp.Required(), mcp.Description("标题")),
			mcp.WithString("content", mcp.Description("正文内容")),
			mcp.WithNumber("type", mcp.Description("类型:1通知 2公告(默认1)")),
		),
		handleOaNoticeCreate,
	)
	s.AddTool(
		mcp.NewTool("oa_notice_update",
			mcp.WithDescription("更新公告(只传要修改的字段)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("公告ID")),
			mcp.WithString("title", mcp.Description("标题")),
			mcp.WithString("content", mcp.Description("正文内容")),
			mcp.WithNumber("type", mcp.Description("类型:1通知 2公告")),
		),
		handleOaNoticeUpdate,
	)
	s.AddTool(
		mcp.NewTool("oa_notice_publish",
			mcp.WithDescription("发布公告(草稿→发布)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("公告ID")),
		),
		handleOaNoticePublish,
	)
	s.AddTool(
		mcp.NewTool("oa_notice_withdraw",
			mcp.WithDescription("撤回公告(发布→草稿)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("公告ID")),
		),
		handleOaNoticeWithdraw,
	)
	s.AddTool(
		mcp.NewTool("oa_notice_delete",
			mcp.WithDescription("删除公告"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("公告ID")),
		),
		handleOaNoticeDelete,
	)
}

// ── 公告 handlers ──

func handleOaNoticeList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewNoticeService()
	page, pageSize := mcpPage(req)
	list, total, err := svc.List(ctx, page, pageSize,
		req.GetString("title", ""),
		int8(req.GetFloat("type", 0)),
		int8(req.GetFloat("status", 0)),
	)
	if err != nil {
		return resultError(fmt.Sprintf("查询公告列表失败: %v", err))
	}
	return resultText(map[string]any{"list": list, "total": total, "page": page, "size": pageSize})
}

func handleOaNoticeFeed(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewNoticeService()
	limit := int(req.GetFloat("limit", 5))
	if limit <= 0 {
		limit = 5
	}
	list, err := svc.FindPublished(ctx, 0, limit)
	if err != nil {
		return resultError(fmt.Sprintf("查询公告流失败: %v", err))
	}
	return resultText(map[string]any{"list": list})
}

func handleOaNoticePublished(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewNoticeService()
	limit := int(req.GetFloat("limit", 10))
	if limit <= 0 {
		limit = 10
	}
	list, err := svc.FindPublished(ctx, int8(req.GetFloat("type", 0)), limit)
	if err != nil {
		return resultError(fmt.Sprintf("查询已发布公告失败: %v", err))
	}
	return resultText(map[string]any{"list": list})
}

func handleOaNoticeGet(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewNoticeService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("公告ID(id)必填")
	}
	n, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("查询公告失败: %v", err))
	}
	return resultText(n)
}

func handleOaNoticeCreate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewNoticeService()
	title := req.GetString("title", "")
	if title == "" {
		return resultError("公告标题(title)必填")
	}
	createReq := &oasvc.CreateNoticeRequest{
		Title:   title,
		Content: req.GetString("content", ""),
		Type:    int8(req.GetFloat("type", 0)),
	}
	n, err := svc.Create(ctx, createReq)
	if err != nil {
		return resultError(fmt.Sprintf("创建公告失败: %v", err))
	}
	return resultText(n)
}

func handleOaNoticeUpdate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewNoticeService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("公告ID(id)必填")
	}
	existing, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("公告不存在: %v", err))
	}
	title := req.GetString("title", existing.Title)
	if title == "" {
		return resultError("公告标题不能为空")
	}
	noticeType := existing.Type
	if argPresent(req, "type") {
		noticeType = int8(req.GetFloat("type", 0))
	}
	upd := &oasvc.UpdateNoticeRequest{
		Title:   title,
		Content: req.GetString("content", existing.Content),
		Type:    noticeType,
	}
	if err := svc.Update(ctx, id, upd); err != nil {
		return resultError(fmt.Sprintf("更新公告失败: %v", err))
	}
	return resultText(map[string]any{"message": "公告已更新", "id": id})
}

func handleOaNoticePublish(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewNoticeService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("公告ID(id)必填")
	}
	if err := svc.Publish(ctx, id); err != nil {
		return resultError(fmt.Sprintf("发布公告失败: %v", err))
	}
	return resultText(map[string]any{"message": "公告已发布", "id": id})
}

func handleOaNoticeWithdraw(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewNoticeService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("公告ID(id)必填")
	}
	if err := svc.Withdraw(ctx, id); err != nil {
		return resultError(fmt.Sprintf("撤回公告失败: %v", err))
	}
	return resultText(map[string]any{"message": "公告已撤回", "id": id})
}

func handleOaNoticeDelete(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewNoticeService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("公告ID(id)必填")
	}
	if err := svc.Delete(ctx, id); err != nil {
		return resultError(fmt.Sprintf("删除公告失败: %v", err))
	}
	return resultText(map[string]any{"message": "公告已删除", "id": id})
}
