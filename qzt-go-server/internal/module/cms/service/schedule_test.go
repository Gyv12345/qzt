package service

import (
	"testing"
	"time"

	cmsmodel "qzt-go-server/internal/model/cms"
)

// schedule_test.go P19 纯函数单测：时间解析与公开可见性判定。

func TestParseScheduleTime(t *testing.T) {
	if got, err := parseScheduleTime(""); err != nil || got != nil {
		t.Fatalf("empty: got=%v err=%v want nil,nil", got, err)
	}
	if got, _ := parseScheduleTime("  "); got != nil {
		t.Fatalf("blank: got=%v want nil", got)
	}
	if got, err := parseScheduleTime("2026-12-01 09:30:00"); err != nil || got == nil {
		t.Fatalf("datetime: got=%v err=%v", got, err)
	}
	if got, err := parseScheduleTime("2026-12-01T09:30:00+08:00"); err != nil || got == nil {
		t.Fatalf("rfc3339: got=%v err=%v", got, err)
	}
	if _, err := parseScheduleTime("2026/12/01"); err == nil {
		t.Fatal("invalid: want error")
	}
}

func TestArticleVisibleNow(t *testing.T) {
	now := time.Date(2026, 11, 10, 12, 0, 0, 0, time.Local)
	future := now.Add(time.Hour)
	past := now.Add(-time.Hour)

	build := func(status int8, pub, exp *time.Time) *cmsmodel.CmsArticle {
		return &cmsmodel.CmsArticle{Status: status, PublishAt: pub, ExpireAt: exp}
	}
	cases := []struct {
		name string
		a    *cmsmodel.CmsArticle
		want bool
	}{
		{"草稿不可见", build(0, nil, nil), false},
		{"已发布无排期可见", build(1, nil, nil), true},
		{"未到定时发布时间不可见", build(1, &future, nil), false},
		{"已过定时发布时间可见", build(1, &past, nil), true},
		{"已过期不可见", build(1, nil, &past), false},
		{"未过期可见", build(1, nil, &future), true},
	}
	for _, c := range cases {
		if got := articleVisibleNow(c.a, now); got != c.want {
			t.Errorf("%s: got=%v want=%v", c.name, got, c.want)
		}
	}
}
