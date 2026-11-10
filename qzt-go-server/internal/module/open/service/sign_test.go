package service_test

import (
	"strings"
	"testing"
	"time"

	apprsvc "qzt-go-server/internal/module/approval/service"
	"qzt-go-server/internal/module/open/service"
)

// sign_test.go P17 open service 纯函数单测:签名/退避/事件目录/PostConfig 解析。

func TestSignPayloadRoundTrip(t *testing.T) {
	secret := "abc123"
	ts := "1730000000"
	body := `{"event":"approval.passed","data":{"instance_id":1}}`

	sig := service.SignPayload(secret, ts, body)
	if sig == "" || !strings.HasPrefix(sig, "sha256=") {
		t.Fatalf("签名格式错误: %q", sig)
	}
	if !service.VerifyPayload(secret, ts, body, sig) {
		t.Fatal("正确签名应通过校验")
	}
}

func TestSignPayloadTamper(t *testing.T) {
	secret := "abc123"
	body := `{"a":1}`
	sig := service.SignPayload(secret, "1730000000", body)

	// 篡改 body / timestamp / secret 任一,校验必须失败
	if service.VerifyPayload(secret, "1730000001", body, sig) {
		t.Fatal("timestamp 被篡改应校验失败")
	}
	if service.VerifyPayload("other", "1730000000", body, sig) {
		t.Fatal("secret 不同应校验失败")
	}
	// 同参数重复计算签名一致(确定性)
	if service.SignPayload(secret, "1730000000", body) != sig {
		t.Fatal("同参数签名应确定一致")
	}
}

func TestNextRetryDelay(t *testing.T) {
	// 退避表:1m/5m/30m/2h;超出表长 → 0(死信)
	cases := map[int]time.Duration{0: 1 * time.Minute, 1: 5 * time.Minute, 2: 30 * time.Minute, 3: 2 * time.Hour, 4: 0}
	for in, want := range cases {
		if got := service.NextRetryDelay(in); got != want {
			t.Fatalf("NextRetryDelay(%d)=%v want %v", in, got, want)
		}
	}
}

func TestValidEvents(t *testing.T) {
	if !service.ValidEvents("") {
		t.Fatal("空串=订阅全部,应合法")
	}
	if !service.ValidEvents("approval.passed,crm.payment.created") {
		t.Fatal("目录内事件应合法")
	}
	if service.ValidEvents("approval.passed, not.a.real.event") {
		// 注意:带空格段 TrimSpace 后仍非法事件码 → 应返回 false
		t.Fatal("含非法事件码应校验失败")
	}
}

func TestParsePostConfig(t *testing.T) {
	if apprsvc.ParsePostConfig("") != nil {
		t.Fatal("空配置应返回 nil")
	}
	if apprsvc.ParsePostConfig("not-json") != nil {
		t.Fatal("非法 JSON 应返回 nil")
	}
	cfg := apprsvc.ParsePostConfig(`{"field_updates":[{"field":"stage","value":"SIGNED"}],"webhook_event":"contract.signed"}`)
	if cfg == nil {
		t.Fatal("合法配置应解析成功")
	}
	if len(cfg.FieldUpdates) != 1 || cfg.FieldUpdates[0].Field != "stage" || cfg.FieldUpdates[0].Value != "SIGNED" {
		t.Fatalf("字段更新解析错误: %+v", cfg.FieldUpdates)
	}
	if cfg.WebhookEvent != "contract.signed" {
		t.Fatalf("webhook_event 解析错误: %q", cfg.WebhookEvent)
	}
}
