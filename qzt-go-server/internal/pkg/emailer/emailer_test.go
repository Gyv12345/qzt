package emailer

import (
	"encoding/base64"
	"strings"
	"testing"
)

func TestConfigEnabled(t *testing.T) {
	if (&Config{}).Enabled() {
		t.Fatal("空配置应不可用")
	}
	c := &Config{Host: "smtp.example.com", Port: 465, Username: "a@b.com", Password: "x"}
	if !c.Enabled() {
		t.Fatal("配齐 host+username 应可用")
	}
}

func TestBuildMessage(t *testing.T) {
	msg := string(buildMessage("noreply@example.com", "to@example.com", "订单已支付 SF001", "<p>hello</p>"))
	for _, want := range []string{
		"From: noreply@example.com",
		"To: to@example.com",
		"Subject: =?utf-8?",
		"MIME-Version: 1.0",
		"Content-Type: text/html; charset=UTF-8",
	} {
		if !strings.Contains(msg, want) {
			t.Fatalf("邮件头缺 %q:\n%s", want, msg)
		}
	}
	// 正文 base64 且解回原文
	idx := strings.Index(msg, "\r\n\r\n")
	if idx < 0 {
		t.Fatal("缺头体分隔")
	}
	got, err := base64.StdEncoding.DecodeString(strings.TrimSpace(msg[idx+4:]))
	if err != nil || string(got) != "<p>hello</p>" {
		t.Fatalf("正文 base64 解码不符: %q err=%v", got, err)
	}
}
