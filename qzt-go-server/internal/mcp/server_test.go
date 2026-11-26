package mcp

import (
	"testing"
	"time"

	"qzt-go-server/internal/model"
	"qzt-go-server/pkg/xtime"
)

func TestIsAPIKeyExpired(t *testing.T) {
	now := time.Date(2026, 11, 25, 12, 0, 0, 0, time.UTC)
	tests := []struct {
		name      string
		expiresAt xtime.NullDateTime
		want      bool
	}{
		{name: "零值永不过期", expiresAt: xtime.NullDateTime{}, want: false},
		{name: "过去时间已过期", expiresAt: xtime.NullDateTime(now.Add(-time.Hour)), want: true},
		{name: "未来时间未过期", expiresAt: xtime.NullDateTime(now.Add(time.Hour)), want: false},
		{name: "到期瞬间与REST一致未超过", expiresAt: xtime.NullDateTime(now), want: false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			key := &model.SysApiKey{ExpiresAt: tt.expiresAt}
			if got := isAPIKeyExpired(key, now); got != tt.want {
				t.Fatalf("isAPIKeyExpired() = %v, want %v", got, tt.want)
			}
		})
	}
}
