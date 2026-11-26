package dingtalk

// client_test.go 钉钉客户端参数构造单测(纯函数,不发真实请求)。

import (
	"net/url"
	"strings"
	"testing"
)

func TestGetQRConnectURL_Params(t *testing.T) {
	c := NewClient(Config{AppKey: "dingAppKey", AppSecret: "sec", AgentID: "100"})
	u := c.GetQRConnectURL("state123", "https://admin.example.com/prod-api/enterprise/oauth/dingtalk/callback")
	if !strings.HasPrefix(u, "https://login.dingtalk.com/oauth2/auth?") {
		t.Fatalf("扫码授权页域名不对: %s", u)
	}
	q, err := url.ParseQuery(strings.TrimPrefix(u, "https://login.dingtalk.com/oauth2/auth?"))
	if err != nil {
		t.Fatalf("query 解析失败: %v", err)
	}
	if q.Get("client_id") != "dingAppKey" {
		t.Errorf("client_id 应为 appKey,得到 %s", q.Get("client_id"))
	}
	if q.Get("response_type") != "code" {
		t.Errorf("response_type 应为 code,得到 %s", q.Get("response_type"))
	}
	if q.Get("scope") != "openid" {
		t.Errorf("scope 应为 openid,得到 %s", q.Get("scope"))
	}
	if q.Get("state") != "state123" {
		t.Errorf("state 应原样透传,得到 %s", q.Get("state"))
	}
	if q.Get("redirect_uri") != "https://admin.example.com/prod-api/enterprise/oauth/dingtalk/callback" {
		t.Errorf("redirect_uri 应为回调端点,得到 %s", q.Get("redirect_uri"))
	}
}

func TestClient_IsConfigured(t *testing.T) {
	if NewClient(Config{AppKey: "", AppSecret: "s"}).IsConfigured() {
		t.Error("缺 appKey 应判未配置")
	}
	if !NewClient(Config{AppKey: "k", AppSecret: "s"}).IsConfigured() {
		t.Error("appKey+Secret 齐全应判已配置")
	}
}

func TestBaseURLConstants(t *testing.T) {
	// 端点常量必须在钉钉公网域(出网校验前置条件,防被改到内网)
	if apiBase != "https://api.dingtalk.com" {
		t.Errorf("apiBase 异常: %s", apiBase)
	}
	if oapiBase != "https://oapi.dingtalk.com" {
		t.Errorf("oapiBase 异常: %s", oapiBase)
	}
	if err := verifyBaseURL(apiBase); err != nil {
		t.Errorf("apiBase 应通过公网校验: %v", err)
	}
	if err := verifyBaseURL(oapiBase); err != nil {
		t.Errorf("oapiBase 应通过公网校验: %v", err)
	}
}
