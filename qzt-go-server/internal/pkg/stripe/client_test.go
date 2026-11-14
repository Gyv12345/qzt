package stripe

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"strconv"
	"testing"
	"time"
)

// signHeader 按 Stripe 规则构造签名头:t=时间戳,v1=HMAC-SHA256(secret, t.payload)。
func signHeader(t *testing.T, secret string, payload []byte, at time.Time) string {
	t.Helper()
	ts := strconv.FormatInt(at.Unix(), 10)
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(ts))
	mac.Write([]byte("."))
	mac.Write(payload)
	return fmt.Sprintf("t=%s,v1=%s", ts, hex.EncodeToString(mac.Sum(nil)))
}

func TestVerifyWebhookSignature_OK(t *testing.T) {
	secret := "whsec_test_secret"
	payload := []byte(`{"type":"checkout.session.completed","data":{"object":{"id":"cs_test_1"}}}`)
	header := signHeader(t, secret, payload, time.Now())
	if err := VerifyWebhookSignature(payload, header, secret); err != nil {
		t.Fatalf("合法签名应通过, got: %v", err)
	}
}

func TestVerifyWebhookSignature_MultipleV1_AnyMatch(t *testing.T) {
	secret := "whsec_test_secret"
	payload := []byte(`{"type":"checkout.session.completed"}`)
	good := signHeader(t, secret, payload, time.Now())
	// 混入一个错误签名在前,合法签名在后:任一 v1 匹配即通过
	header := "t=" + strconv.FormatInt(time.Now().Unix(), 10) + ",v1=deadbeef," + good
	if err := VerifyWebhookSignature(payload, header, secret); err != nil {
		t.Fatalf("多 v1 任一匹配应通过, got: %v", err)
	}
}

func TestVerifyWebhookSignature_WrongSignature(t *testing.T) {
	secret := "whsec_test_secret"
	payload := []byte(`{"type":"checkout.session.completed"}`)
	// 用另一个密钥计算签名 → 必须拒绝
	header := signHeader(t, "whsec_other", payload, time.Now())
	if err := VerifyWebhookSignature(payload, header, secret); err == nil {
		t.Fatal("错误签名应被拒绝")
	}
	// 篡改 payload → 必须拒绝
	tampered := append([]byte(nil), payload...)
	tampered = append(tampered, ' ')
	if err := VerifyWebhookSignature(tampered, signHeader(t, secret, payload, time.Now()), secret); err == nil {
		t.Fatal("篡改 payload 应被拒绝")
	}
}

func TestVerifyWebhookSignature_ExpiredTimestamp(t *testing.T) {
	secret := "whsec_test_secret"
	payload := []byte(`{"type":"checkout.session.completed"}`)
	header := signHeader(t, secret, payload, time.Now().Add(-10*time.Minute))
	if err := VerifyWebhookSignature(payload, header, secret); err == nil {
		t.Fatal("过期时间戳应被拒绝")
	}
}

func TestVerifyWebhookSignature_MalformedHeader(t *testing.T) {
	payload := []byte(`{}`)
	cases := []struct {
		name   string
		header string
	}{
		{"空头", ""},
		{"无t", "v1=abc"},
		{"无v1", "t=1700000000"},
		{"t非数字", "t=abc,v1=abc"},
	}
	secret := "whsec_test_secret"
	for _, tc := range cases {
		if err := VerifyWebhookSignature(payload, tc.header, secret); err == nil {
			t.Fatalf("%s 应被拒绝", tc.name)
		}
	}
	if err := VerifyWebhookSignature(payload, signHeader(t, secret, payload, time.Now()), ""); err == nil {
		t.Fatal("空密钥应被拒绝")
	}
}

func TestCreateCheckoutSession_NotConfigured(t *testing.T) {
	c := NewClient("")
	_, err := c.CreateCheckoutSession(context.Background(), &CheckoutSessionParams{
		Items:      []LineItem{{ProductName: "demo", Currency: "USD", UnitAmount: 10, Quantity: 1}},
		SuccessURL: "https://x/success",
		CancelURL:  "https://x/cancel",
	})
	if err == nil {
		t.Fatal("未配置密钥应返回错误")
	}
	if !errors.Is(err, ErrNotConfigured) {
		t.Fatalf("应返回 ErrNotConfigured, got: %v", err)
	}
	if err.Error() != "支付通道未配置" {
		t.Fatalf("错误文案应为「支付通道未配置」, got: %s", err.Error())
	}
}

func TestParseWebhookEvent(t *testing.T) {
	payload := []byte(`{
	  "type": "checkout.session.completed",
	  "data": {
	    "object": {
	      "id": "cs_test_123",
	      "payment_intent": "pi_test_456",
	      "customer_details": {
	        "email": "buyer@example.com",
	        "name": "John Doe",
	        "address": {"country": "US"}
	      },
	      "metadata": {"order_no": "SF20261113001"}
	    }
	  }
	}`)
	ev, err := ParseWebhookEvent(payload)
	if err != nil {
		t.Fatalf("解析失败: %v", err)
	}
	if ev.Type != "checkout.session.completed" {
		t.Fatalf("type = %s", ev.Type)
	}
	if ev.Data.Object.ID != "cs_test_123" || ev.Data.Object.PaymentIntent != "pi_test_456" {
		t.Fatalf("session 字段不符: %+v", ev.Data.Object)
	}
	if ev.Data.Object.CustomerDetails.Email != "buyer@example.com" ||
		ev.Data.Object.CustomerDetails.Name != "John Doe" ||
		ev.Data.Object.CustomerDetails.Address.Country != "US" {
		t.Fatalf("customer_details 不符: %+v", ev.Data.Object.CustomerDetails)
	}
	if ev.OrderNo() != "SF20261113001" {
		t.Fatalf("order_no = %s", ev.OrderNo())
	}
}

func TestToCents(t *testing.T) {
	cases := []struct {
		in   float64
		want int64
		ok   bool
	}{
		{19.99, 1999, true},
		{10, 1000, true},
		{0.005, 1, true}, // 四舍五入
		{0, 0, false},
		{-1, 0, false},
	}
	for _, tc := range cases {
		got, err := toCents(tc.in)
		if tc.ok {
			if err != nil || got != tc.want {
				t.Fatalf("toCents(%v) = (%d,%v), want (%d,nil)", tc.in, got, err, tc.want)
			}
		} else if err == nil {
			t.Fatalf("toCents(%v) 应报错", tc.in)
		}
	}
}
