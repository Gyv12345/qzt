package textguard

import (
	"regexp"
	"testing"
)

func TestScanBanned(t *testing.T) {
	hits := ScanBanned("我们是行业第一品牌，提供最佳的服务。")
	if len(hits) != 2 || hits[0] != "第一品牌" || hits[1] != "最佳" {
		t.Fatalf("命中结果不符: %v", hits)
	}
	// 同一词重复出现只计一次
	if got := ScanBanned("最好最好最好"); len(got) != 1 || got[0] != "最好" {
		t.Fatalf("重复词应去重: %v", got)
	}
	// 大小写变体各算一次;正常文案零命中
	if got := ScanBanned("TOP1 与 top1"); len(got) != 1 || got[0] != "TOP1" {
		t.Fatalf("大小写敏感命中不符: %v", got)
	}
	if got := ScanBanned("行简提供 CRM 客户管理与进销存,支持私有化部署。"); got != nil && len(got) != 0 {
		t.Fatalf("正常文案不应命中: %v", got)
	}
}

func TestFindUnique(t *testing.T) {
	re := regexp.MustCompile(`\d+元`)
	got := FindUnique(re, "共100元,再付100元,合计300元")
	if len(got) != 2 || got[0] != "100元" || got[1] != "300元" {
		t.Fatalf("命中结果不符: %v", got)
	}
	if got := FindUnique(re, "没有金额"); len(got) != 0 {
		t.Fatalf("未命中应为空: %v", got)
	}
}
