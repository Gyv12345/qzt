// Package emailer 事务邮件发送器(P28-C 独立站订单/询盘通知)。
//
// 纯标准库(net/smtp + crypto/tls)实现最小 SMTP 客户端:465 端口隐式 TLS、
// 其他端口先 STARTTLS(未提供则拒绝发信),AUTH PLAIN,HTML 邮件逐收件人
// 单独投递(隔离失败、互不泄露地址)。凭据只走 gitignored .env
// (EMAIL_SMTP_HOST / EMAIL_SMTP_PORT / EMAIL_SMTP_USERNAME / EMAIL_SMTP_PASSWORD /
// EMAIL_SMTP_FROM),留空=通道关闭,Send 返回 ErrNotConfigured 由调用方静默跳过
// (通知仍有站内信/企微兜底,邮件只是补充渠道)。
package emailer

import (
	"context"
	"crypto/tls"
	"encoding/base64"
	"errors"
	"fmt"
	"mime"
	"net"
	"net/smtp"
	"strconv"
	"strings"
	"time"
)

// ErrNotConfigured SMTP 未配置。调用方静默跳过(站内/企微通知不受影响)。
var ErrNotConfigured = errors.New("邮件通道未配置")

// Config SMTP 发信配置(全部来自 config.Get().Email)。
type Config struct {
	Host     string // SMTP 服务器,空=通道关闭
	Port     int    // 465=隐式 TLS;其他端口走 STARTTLS
	Username string // 发信账号
	Password string // 授权码/密码
	From     string // 发件人地址,空则用 Username
}

// Enabled 通道是否可用(host+username 配齐才算)。
func (c *Config) Enabled() bool {
	return c != nil && c.Host != "" && c.Username != ""
}

// Send 发送 HTML 邮件给多个收件人(逐人单独投递,失败隔离)。
// 通道未配置返回 ErrNotConfigured;配置了但发送失败返回聚合错误。
func Send(ctx context.Context, cfg *Config, to []string, subject, html string) error {
	if !cfg.Enabled() {
		return ErrNotConfigured
	}
	if len(to) == 0 {
		return errors.New("邮件收件人为空")
	}
	if ctx == nil {
		ctx = context.Background()
	}
	host := cfg.Host
	port := cfg.Port
	if port <= 0 {
		port = 465
	}
	from := cfg.From
	if from == "" {
		from = cfg.Username
	}

	var errs []error
	for _, addr := range to {
		addr = strings.TrimSpace(addr)
		if addr == "" {
			continue
		}
		if err := sendOne(ctx, host, port, cfg, from, addr, subject, html); err != nil {
			errs = append(errs, fmt.Errorf("%s: %w", addr, err))
		}
	}
	if len(errs) > 0 {
		return errors.Join(errs...)
	}
	return nil
}

// sendOne 向单个收件人投递(每次新建连接,失败不影响其他收件人)。
func sendOne(ctx context.Context, host string, port int, cfg *Config, from, to, subject, html string) error {
	conn, err := dialTLS(ctx, host, port)
	if err != nil {
		return err
	}
	client, err := smtp.NewClient(conn, host)
	if err != nil {
		_ = conn.Close()
		return err
	}
	c := &smtpCloser{client: client, conn: conn}
	defer c.close()

	// 非 465 端口升级 STARTTLS(未提供则拒绝发信,认证/正文不得明文)
	if port != 465 {
		ok, _ := client.Extension("STARTTLS")
		if !ok {
			return errors.New("SMTP 服务器不支持 STARTTLS,拒绝明文发信")
		}
		if err := client.StartTLS(&tls.Config{ServerName: host}); err != nil {
			return fmt.Errorf("STARTTLS 失败: %w", err)
		}
	}

	// AUTH PLAIN(要求 TLS 已建立)
	if cfg.Password != "" {
		auth := smtp.PlainAuth("", cfg.Username, cfg.Password, host)
		if err := client.Auth(auth); err != nil {
			return fmt.Errorf("SMTP 认证失败: %w", err)
		}
	}
	return clientSend(client, from, to, subject, html)
}

// dialTLS 按端口建立加密连接:465 隐式 TLS;其他端口明文连接由调用方 STARTTLS。
func dialTLS(ctx context.Context, host string, port int) (net.Conn, error) {
	addr := net.JoinHostPort(host, strconv.Itoa(port))
	d := net.Dialer{Timeout: 15 * time.Second}

	if port == 465 {
		return tls.DialWithDialer(&d, "tcp", addr, &tls.Config{ServerName: host})
	}
	return d.DialContext(ctx, "tcp", addr)
}

// smtpCloser 统一释放连接。
type smtpCloser struct {
	client *smtp.Client
	conn   net.Conn
}

func (s *smtpCloser) close() {
	_ = s.client.Quit()
	_ = s.conn.Close()
}

// clientSend MAIL FROM → RCPT TO → DATA(消息体)。
func clientSend(client *smtp.Client, from, to, subject, html string) error {
	if err := client.Mail(from); err != nil {
		return fmt.Errorf("MAIL FROM 失败: %w", err)
	}
	if err := client.Rcpt(to); err != nil {
		return fmt.Errorf("RCPT TO 失败: %w", err)
	}
	w, err := client.Data()
	if err != nil {
		return fmt.Errorf("DATA 失败: %w", err)
	}
	if _, err := w.Write(buildMessage(from, to, subject, html)); err != nil {
		_ = w.Close()
		return err
	}
	return w.Close()
}

// buildMessage 组装 RFC 5322 邮件:主题 Q 编码,HTML 正文 base64 每行 76 字符。
func buildMessage(from, to, subject, html string) []byte {
	var b strings.Builder
	b.WriteString("From: " + from + "\r\n")
	b.WriteString("To: " + to + "\r\n")
	b.WriteString("Subject: " + mime.QEncoding.Encode("utf-8", subject) + "\r\n")
	b.WriteString("Date: " + time.Now().Format(time.RFC1123Z) + "\r\n")
	b.WriteString("MIME-Version: 1.0\r\n")
	b.WriteString("Content-Type: text/html; charset=UTF-8\r\n")
	b.WriteString("Content-Transfer-Encoding: base64\r\n\r\n")
	enc := base64.StdEncoding.EncodeToString([]byte(html))
	for len(enc) > 76 {
		b.WriteString(enc[:76] + "\r\n")
		enc = enc[76:]
	}
	b.WriteString(enc + "\r\n")
	return []byte(b.String())
}
