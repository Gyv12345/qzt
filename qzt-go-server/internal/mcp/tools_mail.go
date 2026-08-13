package mcp

// tools_mail.go 邮件 MCP tools(发送 + 测试连接)。

import (
	"context"
	"fmt"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"

	mailsvc "qzt-go-server/internal/module/mail/service"
)

func registerMailTools(s *server.MCPServer) {
	s.AddTool(
		mcp.NewTool("mail_send",
			mcp.WithDescription("发送邮件(注意:会真实发送邮件,调用前请确认收件人地址正确)"),
			mcp.WithString("to", mcp.Required(), mcp.Description("收件人邮箱,多个用逗号分隔(必填)")),
			mcp.WithString("cc", mcp.Description("抄送邮箱,多个用逗号分隔")),
			mcp.WithString("subject", mcp.Required(), mcp.Description("邮件主题(必填)")),
			mcp.WithString("body", mcp.Description("邮件正文(Markdown 格式,后端会渲染成 HTML 并做 XSS 清理)")),
		),
		handleMailSend,
	)
	s.AddTool(
		mcp.NewTool("mail_test_connect",
			mcp.WithDescription("测试 SMTP 连接(用当前发件配置给自己发一封测试邮件,验证连通性)"),
		),
		handleMailTestConnect,
	)
}

// ── handlers ──

func handleMailSend(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := mailsvc.NewMailService()
	to := splitComma(req.GetString("to", ""))
	subject := req.GetString("subject", "")
	if len(to) == 0 || subject == "" {
		return resultError("收件人(to)和主题(subject)必填")
	}
	// SendMailRequest.Attachments 元素类型 mailAttachment 为包内未导出,
	// MCP 工具无法构造,故不支持附件;仅支持 to/cc/subject/body。
	sendReq := &mailsvc.SendMailRequest{
		To:      to,
		Cc:      splitComma(req.GetString("cc", "")),
		Subject: subject,
		Body:    req.GetString("body", ""),
	}
	if err := svc.Send(ctx, sendReq); err != nil {
		return resultError(fmt.Sprintf("发送邮件失败: %v", err))
	}
	return resultText(map[string]any{"message": "邮件已发送", "to": to, "cc": sendReq.Cc})
}

func handleMailTestConnect(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := mailsvc.NewMailService()
	if err := svc.TestConnect(ctx); err != nil {
		return resultError(fmt.Sprintf("SMTP 连接测试失败: %v", err))
	}
	return resultText(map[string]any{"message": "测试邮件已发送,请到收件箱确认"})
}
