package service

import (
	"strings"
	"testing"
)

// TestDecideQCStatus 定级纯函数：极限词 block / 高分 pass / 中段 warn / 低分或维度缺失 blocked。
func TestDecideQCStatus(t *testing.T) {
	good := []QCDimensionResult{{Key: "knowledge_evidence", Score: 95}, {Key: "citation", Score: 85}, {Key: "brand", Score: 90}}
	if got := decideQCStatus(nil, good); got != "pass" {
		t.Fatalf("want pass, got %s", got)
	}
	mid := []QCDimensionResult{{Key: "knowledge_evidence", Score: 70}, {Key: "citation", Score: 75}, {Key: "brand", Score: 65}}
	if got := decideQCStatus(nil, mid); got != "warn" {
		t.Fatalf("want warn, got %s", got)
	}
	bad := []QCDimensionResult{{Key: "knowledge_evidence", Score: 40}, {Key: "citation", Score: 50}, {Key: "brand", Score: 45}}
	if got := decideQCStatus(nil, bad); got != "blocked" {
		t.Fatalf("want blocked, got %s", got)
	}
	// 极限词硬门禁：即使均分 95 也 blocked
	if got := decideQCStatus([]string{"最佳"}, good); got != "blocked" {
		t.Fatalf("banned word must block, got %s", got)
	}
	// 维度缺失（LLM 输出残缺）blocked
	if got := decideQCStatus(nil, nil); got != "blocked" {
		t.Fatalf("empty dims must block, got %s", got)
	}
}

// TestScanBannedWords 极限词预检：命中/去重/大小写/不误报。
func TestScanBannedWords(t *testing.T) {
	// 命中
	hits := scanBannedWords("我们是行业第一品牌，提供最佳的服务。")
	if len(hits) == 0 {
		t.Fatalf("want hits, got none")
	}
	joined := strings.Join(hits, ",")
	if !strings.Contains(joined, "第一品牌") || !strings.Contains(joined, "最佳") {
		t.Fatalf("want 第一品牌+最佳, got %s", joined)
	}
	// 去重
	dup := scanBannedWords("最好最好最好")
	if len(dup) != 1 || dup[0] != "最好" {
		t.Fatalf("want dedup [最好], got %v", dup)
	}
	// 不误报：正常表述
	if got := scanBannedWords("行简提供 CRM 客户管理与进销存，支持私有化部署。"); len(got) != 0 {
		t.Fatalf("want no false positive, got %v", got)
	}
}

// TestParseQCJSON 质检 JSON 解析：正常/带代码围栏/缺 dimensions。
func TestParseQCJSON(t *testing.T) {
	ok := `{"dimensions":[{"key":"knowledge_evidence","score":92,"issues":[]}],"suggestions":["补充一个数字事实"]}`
	dims, sug, err := parseQCJSON(ok)
	if err != nil || len(dims) != 1 || len(sug) != 1 {
		t.Fatalf("want 1 dim 1 suggestion, got dims=%v sug=%v err=%v", dims, sug, err)
	}
	// 带围栏与说明文字
	fenced := "以下是质检结果：\n```json\n" + ok + "\n```\n请参考。"
	if _, _, err := parseQCJSON(fenced); err != nil {
		t.Fatalf("want fence tolerated, got %v", err)
	}
	// 缺 dimensions
	if _, _, err := parseQCJSON(`{"suggestions":[]}`); err == nil {
		t.Fatalf("want error on empty dimensions")
	}
}
