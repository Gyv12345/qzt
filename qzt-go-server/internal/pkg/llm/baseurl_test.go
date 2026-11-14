package llm

import (
	"strings"
	"testing"
)

// baseurl_test.go 出网端点校验纯函数单测:
// http/https + 公网地址放行;环回/内网/保留地址/本地主机名拒绝。

func TestValidatePublicBaseURL_Accepts(t *testing.T) {
	cases := []string{
		"https://api.deepseek.com",
		"https://api.deepseek.com/v1",
		"http://api.deepseek.com",
		"https://dashscope.aliyuncs.com/compatible-mode/v1",
		"https://open.bigmodel.cn/api/paas/v4",
	}
	for _, u := range cases {
		if err := ValidatePublicBaseURL(u); err != nil {
			t.Fatalf("应放行 %s,得到: %v", u, err)
		}
	}
}

func TestValidatePublicBaseURL_Rejects(t *testing.T) {
	cases := []string{
		"",                       // 空
		"ftp://api.example.com",  // 非 http/https
		"file:///etc/passwd",     // 非 http/https
		"not a url",              // 无 scheme → scheme 为空
		"https://",               // 缺 host
		"http://127.0.0.1:8000",  // 环回
		"http://localhost",       // 本地主机名
		"http://llm.local",       // 本地后缀
		"http://gw.internal",     // 内部主机名
		"http://10.0.0.5",        // 内网 10/8
		"http://172.16.0.9",      // 内网 172.16/12
		"http://192.168.1.1",     // 内网 192.168/16
		"http://169.254.169.254", // 链路本地(云元数据)
		"http://0.0.0.0",         // 未指定
		"http://100.64.0.1",      // CGNAT 保留段
		"http://192.0.2.1",       // TEST-NET-1 文档段
		"http://198.18.0.1",      // 基准测试段
		"http://203.0.113.9",     // 文档段
		"http://240.0.0.1",       // 保留段
		"http://[::1]:9000",      // IPv6 环回
		"http://[fd00::1]",       // IPv6 唯一本地
		"http://[fe80::1]",       // IPv6 链路本地
	}
	for _, u := range cases {
		err := ValidatePublicBaseURL(u)
		if err == nil {
			t.Fatalf("应拒绝 %s", u)
		}
		if strings.Contains(err.Error(), "\n") {
			t.Fatalf("错误信息不应含换行: %v", err)
		}
	}
}

func TestValidatePublicBaseURL_UnknownHostAllowed(t *testing.T) {
	// 解析失败(离线/不存在的域名)放行:出网时按连接失败报错,不在保存环节误伤。
	if err := ValidatePublicBaseURL("https://no-such-host-abcxyz.invalid"); err != nil {
		t.Fatalf("解析失败域名应放行,得到: %v", err)
	}
}
