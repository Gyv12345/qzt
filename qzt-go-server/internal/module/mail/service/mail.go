package service

// mail.go 邮件模块业务层。负责发信 + 测试连接。

import (
	"context"
	"fmt"

	"github.com/microcosm-cc/bluemonday"
	"github.com/russross/blackfriday/v2"

	"qzt-go-server/internal/pkg/mailclient"
	"qzt-go-server/internal/pkg/setting"
)

type MailService struct{}

func NewMailService() *MailService {
	return &MailService{}
}

// SendMailRequest 发送邮件请求。
type SendMailRequest struct {
	To          []string         `json:"to" binding:"required,min=1,dive,required"`
	Cc          []string         `json:"cc"`
	Subject     string           `json:"subject" binding:"required"`
	Body        string           `json:"body"`        // HTML 正文(前端 Markdown 转 HTML)
	Attachments []mailAttachment `json:"attachments"` // 附件
}

// mailAttachment 邮件附件(前端 FileUpload 产出的文件信息)。
type mailAttachment struct {
	URL         string `json:"url"`          // 下载直链或 objectKey(私有)
	Filename    string `json:"file_name"`    // 附件显示名
	ContentType string `json:"content_type"` // MIME(可空)
}

// Send 发送邮件。Body 为 Markdown,后端渲染成 HTML(经 XSS 清理)。
func (s *MailService) Send(ctx context.Context, req *SendMailRequest) error {
	if !mailclient.IsEnabled(ctx) {
		return fmt.Errorf("邮件功能未启用,请在系统配置中开启")
	}
	// Markdown → HTML,再用 bluemonday 清理危险标签/属性(防邮件 XSS)
	htmlBody := ""
	if req.Body != "" {
		unsafe := blackfriday.Run([]byte(req.Body))
		htmlBody = string(bluemonday.UGCPolicy().SanitizeBytes(unsafe))
	}
	msg := mailclient.Message{
		To:       req.To,
		Cc:       req.Cc,
		Subject:  req.Subject,
		HTMLBody: htmlBody,
		TextBody: req.Body, // 纯文本用原始 markdown 兜底
	}
	for _, a := range req.Attachments {
		if a.URL == "" || a.Filename == "" {
			continue
		}
		msg.Attachments = append(msg.Attachments, mailclient.Attachment{
			URL:         a.URL,
			Filename:    a.Filename,
			ContentType: a.ContentType,
		})
	}
	return mailclient.Send(ctx, msg)
}

// TestConnect 用当前 SMTP 配置给自己发一封测试邮件,验证连通性。
func (s *MailService) TestConnect(ctx context.Context) error {
	if !mailclient.IsEnabled(ctx) {
		return fmt.Errorf("邮件功能未启用")
	}
	from := setting.Get(ctx, "mail.from")
	if from == "" {
		return fmt.Errorf("未配置发件人地址(mail.from),无法发送测试邮件")
	}
	// 给 mail.from 自身发测试邮件
	return mailclient.Send(ctx, mailclient.Message{
		To:       []string{from},
		Subject:  "qzt 邮件测试",
		HTMLBody: "<p>这是一封来自 qzt 系统的测试邮件,收到说明 SMTP 配置正确。</p>",
		TextBody: "这是一封来自 qzt 系统的测试邮件,收到说明 SMTP 配置正确。",
	})
}
