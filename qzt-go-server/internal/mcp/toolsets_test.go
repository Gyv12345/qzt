package mcp

import (
	"context"
	"strings"
	"testing"

	"github.com/mark3labs/mcp-go/mcp"
)

// toolsets_test.go 工具集目录/过滤/解析的纯函数测试(不依赖 DB)。

// 全部已注册工具名都应被目录前缀覆盖,否则勾选过滤后不可见。
func TestToolsetCatalogCoversAllTools(t *testing.T) {
	covered := make(map[string]bool)
	total := 0
	for _, ts := range ToolsetCatalog() {
		if ts.ToolCount == 0 {
			t.Errorf("工具集 %s(%s) 工具数为 0,疑似前缀配置错误", ts.Key, strings.Join(ts.Prefixes, ","))
		}
		total += ts.ToolCount
		for _, p := range ts.Prefixes {
			covered[p] = true
		}
	}
	for name := range buildServer().ListTools() {
		if !covered[toolPrefix(name)] {
			t.Errorf("工具 %s 的前缀未被任何工具集覆盖", name)
		}
	}
	if total == 0 {
		t.Fatal("目录工具总数为 0")
	}
}

func TestToolsetFilter(t *testing.T) {
	tools := []mcp.Tool{{Name: "crm_customer_list"}, {Name: "oa_notice_get"}, {Name: "system_user_list"}}

	// 未配置工具集 → 全放行
	if got := toolsetFilter(context.Background(), tools); len(got) != 3 {
		t.Errorf("空工具集应全放行,got %d", len(got))
	}
	// 只开 crm → 仅 CRM 工具
	ctx := context.WithValue(context.Background(), mcpToolsetsKey, []string{"crm"})
	got := toolsetFilter(ctx, tools)
	if len(got) != 1 || got[0].Name != "crm_customer_list" {
		t.Errorf("crm 过滤结果不符: %v", got)
	}
	// system 集覆盖多个前缀(system/site/wecom)
	ctx = context.WithValue(context.Background(), mcpToolsetsKey, []string{"system"})
	if got := toolsetFilter(ctx, tools); len(got) != 1 || got[0].Name != "system_user_list" {
		t.Errorf("system 过滤结果不符: %v", got)
	}
}

func TestParseToolsetsAndValid(t *testing.T) {
	if got := ParseToolsets(""); got != nil {
		t.Errorf("空串应返回 nil,got %v", got)
	}
	got := ParseToolsets(" crm, oa,,crm ")
	if len(got) != 2 || got[0] != "crm" || got[1] != "oa" {
		t.Errorf("解析/去重/去空白不符: %v", got)
	}
	if !ValidToolset("crm") || ValidToolset("nope") {
		t.Error("ValidToolset 判断错误")
	}
}
