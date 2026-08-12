package service

import (
	"testing"
	"time"
)

// condition_test.go evalCondition 条件求值纯函数测试。
// 覆盖:逻辑(AND/OR)、操作符(EQ/NE/GT/LT/GTE/LTE)、类型(数值/日期/字符串)、边界(空/缺字段/坏JSON)。

func TestEvalCondition_EmptyAndInvalid(t *testing.T) {
	data := map[string]any{"amount": 100.0}
	cases := []struct{ name, cfg string; want bool }{
		{"空字符串", "", true},
		{"空 conditions", `{"logic":"AND","conditions":[]}`, true},
		{"坏 JSON", `{not json`, true},
		{"空白", "   ", true},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := evalCondition(c.cfg, data); got != c.want {
				t.Errorf("evalCondition(%q)=%v, want %v", c.cfg, got, c.want)
			}
		})
	}
}

func TestEvalCondition_AndLogic(t *testing.T) {
	data := map[string]any{
		"amount": []byte("150000"), // 模拟 GORM decimal 扫描结果
		"stage":  "SIGNED",
	}
	// 两个条件都满足
	allTrue := `{"logic":"AND","conditions":[
		{"field":"amount","op":"GT","value":"100000"},
		{"field":"stage","op":"EQ","value":"SIGNED"}]}`
	if !evalCondition(allTrue, data) {
		t.Error("AND 全真应返回 true")
	}
	// 第二个不满足
	oneFalse := `{"logic":"AND","conditions":[
		{"field":"amount","op":"GT","value":"100000"},
		{"field":"stage","op":"EQ","value":"DRAFT"}]}`
	if evalCondition(oneFalse, data) {
		t.Error("AND 任一假应返回 false")
	}
}

func TestEvalCondition_OrLogic(t *testing.T) {
	data := map[string]any{"amount": 50000.0}
	oneTrue := `{"logic":"OR","conditions":[
		{"field":"amount","op":"GT","value":"100000"},
		{"field":"amount","op":"LT","value":"100000"}]}`
	if !evalCondition(oneTrue, data) {
		t.Error("OR 任一真应返回 true")
	}
	allFalse := `{"logic":"OR","conditions":[
		{"field":"amount","op":"GT","value":"100000"},
		{"field":"amount","op":"EQ","value":"100000"}]}`
	if evalCondition(allFalse, data) {
		t.Error("OR 全假应返回 false")
	}
}

func TestEvalCondition_NumberOps(t *testing.T) {
	// PSI status 为 int64(GORM 扫描整数列),value 配置字符串 "1"
	data := map[string]any{"status": int64(2)}
	cases := []struct{ op, val string; want bool }{
		{OpEQ, "2", true},
		{OpEQ, "1", false},
		{OpNE, "1", true},
		{OpGTE, "2", true},
		{OpGTE, "3", false},
		{OpLTE, "2", true},
		{OpGT, "1", true},
		{OpLT, "3", true},
	}
	for _, c := range cases {
		cfg := `{"logic":"AND","conditions":[{"field":"status","op":"` + c.op + `","value":"` + c.val + `"}]}`
		if got := evalCondition(cfg, data); got != c.want {
			t.Errorf("status=%d op=%s value=%s: got %v want %v", 2, c.op, c.val, got, c.want)
		}
	}
}

func TestEvalCondition_DateOps(t *testing.T) {
	// 业务表日期列 GORM 扫描为 time.Time
	signed, _ := time.ParseInLocation("2006-01-02", "2024-06-15", time.Local)
	data := map[string]any{"signed_date": signed}
	cases := []struct{ op, val string; want bool }{
		{OpEQ, "2024-06-15", true},
		{OpGT, "2024-01-01", true},  // 签订晚于 1/1
		{OpLT, "2024-12-31", true},  // 签订早于 12/31
		{OpLT, "2024-01-01", false}, // 签订不早于 1/1
		{OpGTE, "2024-06-15", true},
		{OpLTE, "2024-06-15", true},
	}
	for _, c := range cases {
		cfg := `{"logic":"AND","conditions":[{"field":"signed_date","op":"` + c.op + `","value":"` + c.val + `"}]}`
		if got := evalCondition(cfg, data); got != c.want {
			t.Errorf("signed=2024-06-15 op=%s value=%s: got %v want %v", c.op, c.val, got, c.want)
		}
	}
}

func TestEvalCondition_StringOps(t *testing.T) {
	data := map[string]any{"contract_no": "HT202406001"}
	cases := []struct{ op, val string; want bool }{
		{OpEQ, "HT202406001", true},
		{OpNE, "HT999", true},
		{OpEQ, "wrong", false},
	}
	for _, c := range cases {
		cfg := `{"logic":"AND","conditions":[{"field":"contract_no","op":"` + c.op + `","value":"` + c.val + `"}]}`
		if got := evalCondition(cfg, data); got != c.want {
			t.Errorf("op=%s value=%s: got %v want %v", c.op, c.val, got, c.want)
		}
	}
}

func TestEvalCondition_MissingField(t *testing.T) {
	data := map[string]any{"amount": 100.0}
	cfg := `{"logic":"AND","conditions":[{"field":"not_exist","op":"EQ","value":"1"}]}`
	if evalCondition(cfg, data) {
		t.Error("缺字段应返回 false(条件不满足)")
	}
}

func TestEvalCondition_CustomFieldByFieldID(t *testing.T) {
	// CRM 自定义字段 Key=field_id,值由 contract_field 查得(string)
	data := map[string]any{"f_abc123": "VIP"}
	cfg := `{"logic":"AND","conditions":[{"field":"f_abc123","op":"EQ","value":"VIP"}]}`
	if !evalCondition(cfg, data) {
		t.Error("自定义字段按 field_id 取值比较应命中")
	}
}
