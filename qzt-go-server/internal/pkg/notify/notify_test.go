package notify

// notify_test.go 外部通知通道路由分支单测(纯函数,无 DB/Redis 依赖)。

import "testing"

func TestNormalizeExternalChannel(t *testing.T) {
	cases := []struct {
		in   string
		want string
	}{
		{"", NotifyChannelWecom},      // 空=默认企微(历史行为)
		{"wecom", NotifyChannelWecom}, // 显式企微
		{"dingtalk", NotifyChannelDingtalk},
		{"feishu", NotifyChannelFeishu},
		{"none", NotifyChannelNone},
		{"  Feishu  ", NotifyChannelFeishu}, // 大小写+空白归一
		{"DINGTALK", NotifyChannelDingtalk},
		{"slack", NotifyChannelWecom},  // 非法值回落默认企微
		{"webrtc", NotifyChannelWecom}, // 非法值回落默认企微
	}
	for _, c := range cases {
		if got := NormalizeExternalChannel(c.in); got != c.want {
			t.Errorf("NormalizeExternalChannel(%q) = %q, want %q", c.in, got, c.want)
		}
	}
}

func TestNotifyChannelConstants(t *testing.T) {
	// 渠道值与 sys_user.id_source / sys_oauth_config.provider 字面量一致(跨表路由的前提)
	if NotifyChannelWecom != "wecom" || NotifyChannelDingtalk != "dingtalk" ||
		NotifyChannelFeishu != "feishu" || NotifyChannelNone != "none" {
		t.Fatal("渠道常量字面量与契约不一致")
	}
}
