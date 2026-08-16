package mcp

import (
	"context"
	"fmt"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"

	oasvc "qzt-go-server/internal/module/oa/service"
)

// tools_oa_message.go OA 站内信 tools。

func registerOaMessageTools(s *server.MCPServer) {
	// ── 站内信 message (7) ──
	s.AddTool(
		mcp.NewTool("oa_message_inbox",
			mcp.WithDescription("查询收件箱(当前用户的站内信)"),
			mcp.WithNumber("page", mcp.Description("页码(默认1)")),
			mcp.WithNumber("page_size", mcp.Description("每页条数(默认20)")),
		),
		handleOaMessageInbox,
	)
	s.AddTool(
		mcp.NewTool("oa_message_outbox",
			mcp.WithDescription("查询发件箱(当前用户发出的站内信)"),
			mcp.WithNumber("page", mcp.Description("页码(默认1)")),
			mcp.WithNumber("page_size", mcp.Description("每页条数(默认20)")),
		),
		handleOaMessageOutbox,
	)
	s.AddTool(
		mcp.NewTool("oa_message_unread_count",
			mcp.WithDescription("查询当前用户未读站内信数量"),
		),
		handleOaMessageUnreadCount,
	)
	s.AddTool(
		mcp.NewTool("oa_message_get",
			mcp.WithDescription("查询站内信详情"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("消息ID")),
		),
		handleOaMessageGet,
	)
	s.AddTool(
		mcp.NewTool("oa_message_send",
			mcp.WithDescription("发送站内信(当前用户为发送人)"),
			mcp.WithNumber("receiver_id", mcp.Required(), mcp.Description("接收人用户ID")),
			mcp.WithString("title", mcp.Required(), mcp.Description("标题")),
			mcp.WithString("content", mcp.Required(), mcp.Description("内容")),
			mcp.WithString("content_type", mcp.Description("内容格式:text/markdown(默认text)")),
		),
		handleOaMessageSend,
	)
	s.AddTool(
		mcp.NewTool("oa_message_mark_read",
			mcp.WithDescription("标记站内信为已读"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("消息ID")),
		),
		handleOaMessageMarkRead,
	)
	s.AddTool(
		mcp.NewTool("oa_message_read_all",
			mcp.WithDescription("将当前用户全部站内信标记为已读"),
		),
		handleOaMessageReadAll,
	)
}

// ── 站内信 handlers ──

func handleOaMessageInbox(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewMessageService()
	page, pageSize := mcpPage(req)
	list, total, err := svc.Inbox(ctx, page, pageSize, userIDFromContext(ctx))
	if err != nil {
		return resultError(fmt.Sprintf("查询收件箱失败: %v", err))
	}
	return resultText(map[string]any{"list": list, "total": total, "page": page, "size": pageSize})
}

func handleOaMessageOutbox(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewMessageService()
	page, pageSize := mcpPage(req)
	list, total, err := svc.Outbox(ctx, page, pageSize, userIDFromContext(ctx))
	if err != nil {
		return resultError(fmt.Sprintf("查询发件箱失败: %v", err))
	}
	return resultText(map[string]any{"list": list, "total": total, "page": page, "size": pageSize})
}

func handleOaMessageUnreadCount(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewMessageService()
	count, err := svc.GetUnreadCount(ctx, userIDFromContext(ctx))
	if err != nil {
		return resultError(fmt.Sprintf("查询未读数失败: %v", err))
	}
	return resultText(map[string]any{"unread_count": count})
}

func handleOaMessageGet(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewMessageService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("消息ID(id)必填")
	}
	msg, err := svc.GetByID(ctx, id, userIDFromContext(ctx))
	if err != nil {
		return resultError(fmt.Sprintf("查询消息失败: %v", err))
	}
	return resultText(msg)
}

func handleOaMessageSend(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewMessageService()
	receiverID := uint(req.GetFloat("receiver_id", 0))
	title := req.GetString("title", "")
	content := req.GetString("content", "")
	if receiverID == 0 || title == "" || content == "" {
		return resultError("接收人ID(receiver_id)、标题(title)、内容(content)必填")
	}
	sendReq := &oasvc.SendMessageRequest{
		ReceiverID:  receiverID,
		Title:       title,
		Content:     content,
		ContentType: req.GetString("content_type", ""),
	}
	if err := svc.Send(ctx, userIDFromContext(ctx), sendReq); err != nil {
		return resultError(fmt.Sprintf("发送消息失败: %v", err))
	}
	return resultText(map[string]any{"message": "消息已发送", "receiver_id": receiverID})
}

func handleOaMessageMarkRead(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewMessageService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("消息ID(id)必填")
	}
	if err := svc.MarkAsRead(ctx, id, userIDFromContext(ctx)); err != nil {
		return resultError(fmt.Sprintf("标记已读失败: %v", err))
	}
	return resultText(map[string]any{"message": "已标记已读", "id": id})
}

func handleOaMessageReadAll(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewMessageService()
	n, err := svc.MarkAllAsRead(ctx, userIDFromContext(ctx))
	if err != nil {
		return resultError(fmt.Sprintf("全部已读失败: %v", err))
	}
	return resultText(map[string]any{"message": "已全部标记已读", "marked": n})
}
