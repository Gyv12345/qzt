package service

import (
	"testing"
)

// timeout_test.go 审批超时提醒纯函数单测(照 transfer_test.go 风格)。

// TestTimeoutThresholdHours 阈值解析:合法值透传,非法/非正数/空回落默认 48。
func TestTimeoutThresholdHours(t *testing.T) {
	cases := []struct {
		name string
		raw  string
		want float64
	}{
		{"空回落默认48", "", 48},
		{"合法值透传", "24", 24},
		{"小数透传", "0.5", 0.5},
		{"带空白透传", " 72 ", 72},
		{"非法回落默认", "abc", 48},
		{"负数回落默认", "-8", 48},
		{"零回落默认", "0", 48},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := timeoutThresholdHours(tc.raw); got != tc.want {
				t.Fatalf("期望 %v,实际 %v", tc.want, got)
			}
		})
	}
}

// TestFormatWaitingDuration 等待时长描述:小时/跨天折算。
func TestFormatWaitingDuration(t *testing.T) {
	cases := []struct {
		name  string
		hours float64
		want  string
	}{
		{"不足1小时", 0.5, "不足1小时"},
		{"整小时", 3, "3小时"},
		{"跨一天带余", 26, "1天2小时"},
		{"整两天", 48, "2天"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := formatWaitingDuration(tc.hours); got != tc.want {
				t.Fatalf("期望 %s,实际 %s", tc.want, got)
			}
		})
	}
}
