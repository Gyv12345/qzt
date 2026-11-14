package service

import (
	"strings"
	"testing"
)

// ai_model_test.go AI 模型档案保存校验纯函数单测(不触 DB/不触网)。

func TestValidateAIModelRequest(t *testing.T) {
	// 合法:公网 https 端点 + 必填项齐全。
	ok := &SaveAIModelRequest{Name: "DeepSeek", BaseURL: "https://api.deepseek.com", APIKey: "sk-test", Model: "deepseek-chat"}
	if err := validateAIModelRequest(ok, true); err != nil {
		t.Fatalf("合法请求不应报错: %v", err)
	}

	// 新建时 api_key 必填。
	noKey := &SaveAIModelRequest{Name: "DeepSeek", BaseURL: "https://api.deepseek.com", APIKey: "", Model: "deepseek-chat"}
	if err := validateAIModelRequest(noKey, true); err == nil || !strings.Contains(err.Error(), "api_key") {
		t.Fatalf("新建缺 api_key 应报错,得到: %v", err)
	}
	// 更新时允许留空(语义=不修改)。
	if err := validateAIModelRequest(noKey, false); err != nil {
		t.Fatalf("更新留空 api_key 应放行: %v", err)
	}
	// 更新时传脱敏值视为保留原值,放行。
	masked := &SaveAIModelRequest{Name: "DeepSeek", BaseURL: "https://api.deepseek.com", APIKey: "****abcd", Model: "deepseek-chat"}
	if err := validateAIModelRequest(masked, true); err != nil {
		t.Fatalf("脱敏值应放行: %v", err)
	}
	// 新建时传脱敏值在 service.Create 被显式拒绝(无原值可回填,Create 内联
	// isMaskedSecret 判断);此处锚定该判断语义,防止掩码串被误存进库。
	if !isMaskedSecret("****abcd") {
		t.Fatal("****开头应识别为脱敏值(Create 依赖该判断拒绝新建传掩码)")
	}

	// 必填项缺失。
	if err := validateAIModelRequest(&SaveAIModelRequest{BaseURL: "https://api.deepseek.com", APIKey: "k", Model: "m"}, true); err == nil {
		t.Fatal("缺名称应报错")
	}
	if err := validateAIModelRequest(&SaveAIModelRequest{Name: "n", BaseURL: "https://api.deepseek.com", APIKey: "k"}, true); err == nil {
		t.Fatal("缺模型标识应报错")
	}

	// 出网安全:内网/环回端点拒绝。
	badURL := &SaveAIModelRequest{Name: "内网", BaseURL: "http://192.168.1.10", APIKey: "k", Model: "m"}
	if err := validateAIModelRequest(badURL, true); err == nil {
		t.Fatal("内网 base_url 应拒绝")
	}
	loopback := &SaveAIModelRequest{Name: "环回", BaseURL: "http://127.0.0.1:8000", APIKey: "k", Model: "m"}
	if err := validateAIModelRequest(loopback, true); err == nil {
		t.Fatal("环回 base_url 应拒绝")
	}
}
