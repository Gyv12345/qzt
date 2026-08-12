package service

import "testing"

// calendar_test.go 钉住 List 依赖的三个纯辅助函数的行为(目前零测试)。
// List 主体是 12 个 GORM 查询块, 含 MySQL 专有 FIND_IN_SET 且 testutil 走真 MySQL,
// 无廉价 DB 级 characterization 路径(未引入 go-sqlmock); 故先覆盖其中唯一带分支的
// 纯逻辑(标题生成 / 来源过滤 / 截断), 这些正是最易出微妙 bug 的部分。

func TestContains(t *testing.T) {
	if !contains([]string{"a", "b", "c"}, "b") {
		t.Fatal(`contains(...,"b") = false, want true`)
	}
	if contains([]string{"a", "b", "c"}, "d") {
		t.Fatal(`contains(...,"d") = true, want false`)
	}
	if contains([]string{}, "a") {
		t.Fatal(`contains(empty,"a") = true, want false`)
	}
	if contains(nil, "a") {
		t.Fatal(`contains(nil,"a") = true, want false`)
	}
}

func TestLeaveTypeText(t *testing.T) {
	cases := map[string]string{
		"ANNUAL":    "年假",
		"SICK":      "病假",
		"PERSONAL":  "事假",
		"MARRIAGE":  "婚假",
		"MATERNITY": "产假",
		"FUNERAL":   "丧假",
		"":          "请假", // 空类型回退为通用"请假"
		"OTHER":     "OTHER", // 未知类型原样透传
	}
	for in, want := range cases {
		if got := leaveTypeText(in); got != want {
			t.Errorf("leaveTypeText(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestTruncateRunes(t *testing.T) {
	// 短于等于 n: 原样返回。
	if got := truncateRunes("abc", 5); got != "abc" {
		t.Fatalf(`truncateRunes("abc",5) = %q, want "abc"`, got)
	}
	if got := truncateRunes("abc", 3); got != "abc" {
		t.Fatalf(`truncateRunes("abc",3) = %q, want "abc" (exact length, no ellipsis)`, got)
	}
	// 超过 n: 截到 n 个 rune + 省略号。
	if got := truncateRunes("abcdef", 3); got != "abc…" {
		t.Fatalf(`truncateRunes("abcdef",3) = %q, want "abc…"`, got)
	}
	// 多字节(中文)按 rune 计数, 不按字节。
	if got := truncateRunes("我是一个测试字符串", 4); got != "我是一个…" {
		t.Fatalf(`truncateRunes(中文,4) = %q, want "我是一个…"`, got)
	}
	// 空串。
	if got := truncateRunes("", 3); got != "" {
		t.Fatalf(`truncateRunes("",3) = %q, want ""`, got)
	}
}
