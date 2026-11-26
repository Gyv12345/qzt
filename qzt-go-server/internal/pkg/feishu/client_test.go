package feishu

// client_test.go 飞书客户端参数构造单测(纯函数,不发真实请求)。

import (
	"net/url"
	"strings"
	"testing"
)

func TestGetQRLoginURL_Params(t *testing.T) {
	c := NewClient(Config{AppID: "cli_fs_app", AppSecret: "sec"})
	u := c.GetQRLoginURL("stateXYZ", "https://admin.example.com/prod-api/enterprise/oauth/feishu/callback")
	if !strings.HasPrefix(u, apiBase+"/authen/v1/authorize?") {
		t.Fatalf("网页授权 URL 形态不对: %s", u)
	}
	parsed, err := url.Parse(u)
	if err != nil {
		t.Fatalf("URL 解析失败: %v", err)
	}
	q := parsed.Query()
	if q.Get("app_id") != "cli_fs_app" {
		t.Errorf("app_id 应为配置 AppID,得到 %s", q.Get("app_id"))
	}
	if q.Get("response_type") != "code" {
		t.Errorf("response_type 应为 code,得到 %s", q.Get("response_type"))
	}
	if q.Get("state") != "stateXYZ" {
		t.Errorf("state 应原样透传,得到 %s", q.Get("state"))
	}
	if q.Get("redirect_uri") != "https://admin.example.com/prod-api/enterprise/oauth/feishu/callback" {
		t.Errorf("redirect_uri 应为回调端点,得到 %s", q.Get("redirect_uri"))
	}
}

func TestClient_IsConfigured(t *testing.T) {
	if NewClient(Config{AppID: "a", AppSecret: ""}).IsConfigured() {
		t.Error("缺 appSecret 应判未配置")
	}
	if !NewClient(Config{AppID: "a", AppSecret: "s"}).IsConfigured() {
		t.Error("appID+Secret 齐全应判已配置")
	}
}

func TestBaseURLConstant(t *testing.T) {
	// 端点常量必须在飞书公网域(出网校验前置条件,防被改到内网)
	if apiBase != "https://open.feishu.cn/open-apis" {
		t.Errorf("apiBase 异常: %s", apiBase)
	}
	if err := verifyBaseURL(apiBase); err != nil {
		t.Errorf("apiBase 应通过公网校验: %v", err)
	}
}

func TestSendUserMessageContentShape(t *testing.T) {
	// content 必须是 {"text": "..."} JSON 字符串(im/v1/messages 契约)
	if content := messageContent("你好\n第二行"); content != `{"text":"你好\n第二行"}` {
		t.Errorf("消息 content 形态异常: %s", content)
	}
}
