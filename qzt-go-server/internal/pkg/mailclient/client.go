package mailclient

// client.go SMTP 邮件发送客户端。
// 配置从 sys_config (setting.Get) 热读取,改配置后立即生效无需重启。

import (
	"context"
	"fmt"
	"io"
	"mime"
	"net/http"
	"strconv"
	"strings"
	"time"

	"gopkg.in/gomail.v2"

	"qzt-go-server/internal/app"
	"qzt-go-server/internal/pkg/setting"
	"qzt-go-server/pkg/xlogger"
)

// Message 一封待发邮件。
type Message struct {
	To          []string    // 收件人邮箱
	Cc          []string    // 抄送
	Bcc         []string    // 密送
	Subject     string      // 主题
	HTMLBody    string      // HTML 正文(优先)
	TextBody    string      // 纯文本正文(HTML 为空时用)
	Attachments []Attachment // 附件
}

// Attachment 邮件附件。
// URL 为可访问的下载地址(公共文件明文直链)或 objectKey(私有文件);
// 后端会按需对 objectKey 签名后再下载字节流附加到邮件。
type Attachment struct {
	URL         string // 下载直链或 objectKey
	Filename    string // 附件显示名
	ContentType string // MIME(可空)
}

// smtpConfig 单次发送所需的 SMTP 配置(每次从 setting 现读)。
type smtpConfig struct {
	Host       string
	Port       int
	Username   string
	Password   string
	From       string // 发件人地址
	FromName   string // 发件人显示名
	Encryption string // ssl / tls / none
}

// IsEnabled 检查邮件功能是否启用(默认启用,空值视为启用)。
func IsEnabled(ctx context.Context) bool {
	v := setting.Get(ctx, "mail.enabled")
	return v == "" || v == "true" || v == "1"
}

// loadConfig 从 sys_config 读取 SMTP 配置(每次调用现读,热配置)。
func loadConfig(ctx context.Context) (smtpConfig, error) {
	cfg := smtpConfig{
		Host:       setting.Get(ctx, "mail.host"),
		Username:   setting.Get(ctx, "mail.username"),
		Password:   setting.Get(ctx, "mail.password"),
		From:       setting.Get(ctx, "mail.from"),
		FromName:   setting.Get(ctx, "mail.from_name"),
		Encryption: setting.Get(ctx, "mail.encryption"),
	}
	if v := setting.Get(ctx, "mail.port"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			cfg.Port = n
		}
	}
	if cfg.Port == 0 {
		cfg.Port = 465 // SSL 默认端口
	}
	if cfg.Encryption == "" {
		cfg.Encryption = "ssl" // 默认 SSL
	}
	if cfg.Host == "" || cfg.Username == "" || cfg.Password == "" {
		return cfg, fmt.Errorf("邮件未配置: 请在系统配置里填写 SMTP 服务器/账号/密码")
	}
	if cfg.From == "" {
		cfg.From = cfg.Username
	}
	return cfg, nil
}

var httpClient = &http.Client{Timeout: 60 * time.Second}

// Send 发送一封邮件。
func Send(ctx context.Context, msg Message) error {
	cfg, err := loadConfig(ctx)
	if err != nil {
		return err
	}
	if len(msg.To) == 0 {
		return fmt.Errorf("收件人不能为空")
	}

	m := gomail.NewMessage()
	// 用 SetAddressHeader 设置发件人(自动 RFC 2047 编码显示名)
	m.SetAddressHeader("From", cfg.From, cfg.FromName)
	m.SetHeader("To", msg.To...)
	if len(msg.Cc) > 0 {
		m.SetHeader("Cc", msg.Cc...)
	}
	if len(msg.Bcc) > 0 {
		m.SetHeader("Bcc", msg.Bcc...)
	}
	// 主题用 RFC 2047 编码(中文标题兼容)
	m.SetHeader("Subject", mime.QEncoding.Encode("utf-8", msg.Subject))

	if msg.HTMLBody != "" {
		m.SetBody("text/html; charset=utf-8", msg.HTMLBody)
		if msg.TextBody != "" {
			m.AddAlternative("text/plain; charset=utf-8", msg.TextBody)
		}
	} else if msg.TextBody != "" {
		m.SetBody("text/plain; charset=utf-8", msg.TextBody)
	}

	// 处理附件:逐个下载字节流后附加
	for _, att := range msg.Attachments {
		if err := attachFile(ctx, m, att); err != nil {
			xlogger.ErrorfCtx(ctx, "邮件附件附加失败 file=%s: %v", att.Filename, err)
			// 单个附件失败不中断整封邮件,继续处理其余附件
			continue
		}
	}

	d := gomail.NewDialer(cfg.Host, cfg.Port, cfg.Username, cfg.Password)
	// encryption: ssl(隐式 SSL,默认)/ tls(STARTTLS)/ none(明文)
	// gomail 在 SSL=false 时,若服务器支持会自动用 STARTTLS
	switch strings.ToLower(cfg.Encryption) {
	case "ssl", "":
		d.SSL = true
	case "tls", "starttls", "none":
		d.SSL = false
	}

	xlogger.InfofCtx(ctx, "发送邮件: to=%s subject=%s attachments=%d", strings.Join(msg.To, ","), msg.Subject, len(msg.Attachments))
	if err := d.DialAndSend(m); err != nil {
		xlogger.ErrorfCtx(ctx, "邮件发送失败 host=%s:%d: %v", cfg.Host, cfg.Port, err)
		return fmt.Errorf("邮件发送失败: %w", err)
	}
	return nil
}

// attachFile 下载附件并附加到 Message。
// att.URL 若以 http(s) 开头则直接 GET;否则视为 objectKey,签名后下载。
func attachFile(ctx context.Context, m *gomail.Message, att Attachment) error {
	url := att.URL
	if !strings.HasPrefix(url, "http://") && !strings.HasPrefix(url, "https://") {
		// 私有文件:用 objectKey 签名取短期 URL
		uploader := app.GetUploader()
		if uploader == nil {
			return fmt.Errorf("存储未初始化,无法签名私有附件")
		}
		signed, err := uploader.SignURL(url, 10*time.Minute)
		if err != nil {
			return fmt.Errorf("签名附件失败: %w", err)
		}
		url = signed
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return fmt.Errorf("创建附件请求失败: %w", err)
	}
	resp, err := httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("下载附件失败: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("下载附件返回 %d", resp.StatusCode)
	}

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("读取附件内容失败: %w", err)
	}
	settings := gomail.SetCopyFunc(func(w io.Writer) error {
		_, err := w.Write(data)
		return err
	})
	if att.ContentType != "" {
		m.Attach(att.Filename, settings)
	} else {
		m.Attach(att.Filename, settings)
	}
	return nil
}
