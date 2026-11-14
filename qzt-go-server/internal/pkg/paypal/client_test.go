package paypal

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

// newStubServer 启动 httptest 桩服务器,按路径分发 OAuth/下单/捕获响应。
func newStubServer(t *testing.T, orderResp, captureResp map[string]any) *httptest.Server {
	t.Helper()
	mux := http.NewServeMux()
	mux.HandleFunc("/v1/oauth2/token", func(w http.ResponseWriter, r *http.Request) {
		if u, p, ok := r.BasicAuth(); !ok || u != "CID" || p != "SECRET" {
			w.WriteHeader(http.StatusUnauthorized)
			_, _ = w.Write([]byte(`{"message":"bad credentials"}`))
			return
		}
		writeJSON(w, map[string]any{"access_token": "TESTTOKEN", "expires_in": 3600})
	})
	mux.HandleFunc("/v2/checkout/orders", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, orderResp)
	})
	mux.HandleFunc("/v2/checkout/orders/TESTORDER/capture", func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("PayPal-Request-Id") == "" {
			w.WriteHeader(http.StatusBadRequest)
			return
		}
		writeJSON(w, captureResp)
	})
	srv := httptest.NewServer(mux)
	t.Cleanup(srv.Close)
	return srv
}

func writeJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(v)
}

func TestPayPalNotConfigured(t *testing.T) {
	c := NewClient("", "", "")
	if c.Enabled() {
		t.Fatal("空凭据应视为未配置")
	}
	if _, err := c.CreateOrder(context.Background(), &OrderParams{Amount: 1}); err != ErrNotConfigured {
		t.Fatalf("未配置应返回 ErrNotConfigured, got %v", err)
	}
}

func TestPayPalCreateAndCapture(t *testing.T) {
	srv := newStubServer(t,
		map[string]any{
			"id": "TESTORDER",
			"links": []map[string]any{
				{"rel": "self", "href": "https://x/1"},
				{"rel": "payer-action", "href": "https://www.paypal.com/checkoutnow?token=TESTORDER"},
			},
		},
		map[string]any{
			"id":     "TESTORDER",
			"status": "COMPLETED",
			"payer": map[string]any{
				"email_address": "buyer@example.com",
				"name":          map[string]any{"given_name": "Ada", "surname": "Lovelace"},
				"address":       map[string]any{"country_code": "US"},
			},
			"purchase_units": []map[string]any{{
				"payments": map[string]any{
					"captures": []map[string]any{{"id": "CAP1", "status": "COMPLETED"}},
				},
			}},
		},
	)
	c := NewClient("sandbox", "CID", "SECRET")
	c.BaseURL = srv.URL

	order, err := c.CreateOrder(context.Background(), &OrderParams{
		Amount: 19.5, Currency: "usd", OrderNo: "SF20261113001",
		ReturnURL: "https://s/en/checkout/success", CancelURL: "https://s/en/cart",
		Description: "Test",
	})
	if err != nil {
		t.Fatalf("CreateOrder: %v", err)
	}
	if order.ID != "TESTORDER" || order.ApproveURL == "" {
		t.Fatalf("order = %+v", order)
	}

	res, err := c.CaptureOrder(context.Background(), "TESTORDER", "SF20261113001")
	if err != nil {
		t.Fatalf("CaptureOrder: %v", err)
	}
	if res.OrderStatus != "COMPLETED" || res.CaptureStatus != "COMPLETED" ||
		res.BuyerEmail != "buyer@example.com" || res.BuyerName != "Ada Lovelace" ||
		res.CountryCode != "US" || res.CaptureID != "CAP1" {
		t.Fatalf("capture result = %+v", res)
	}
}

func TestPayPalCreateOrderValidation(t *testing.T) {
	c := NewClient("sandbox", "CID", "SECRET")
	c.BaseURL = "http://127.0.0.1:1" // 不可达,验证仅走参数校验路径
	if _, err := c.CreateOrder(context.Background(), &OrderParams{Amount: 0, Currency: "USD", OrderNo: "X", ReturnURL: "r", CancelURL: "c"}); err == nil {
		t.Fatal("金额<=0 应报错")
	}
	if _, err := c.CreateOrder(context.Background(), &OrderParams{Amount: 1, Currency: "USD", OrderNo: "", ReturnURL: "r", CancelURL: "c"}); err == nil {
		t.Fatal("缺单号应报错")
	}
}

func TestPayPalCaptureRequiresRequestID(t *testing.T) {
	// PayPal-Request-Id 缺失时桩服务器返回 400 → apiError
	c := NewClient("sandbox", "CID", "SECRET")
	c.BaseURL = "http://127.0.0.1:1"
	if _, err := c.CaptureOrder(context.Background(), "TESTORDER", ""); err == nil {
		t.Fatal("应返回错误")
	}
}
