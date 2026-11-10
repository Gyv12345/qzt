package service

import (
	"strings"
	"time"

	cmsmodel "qzt-go-server/internal/model/cms"
)

// schedule.go P19 定时发布的时间解析与可见性判定（纯函数，便于单测）。
// parseScheduleTime: 空串=清除/未设置(nil)；支持 admin DatePicker 提交口径
// "2006-01-02 15:04:05" 与 RFC3339（管理端详情回显口径）。
// articleVisibleNow: 公开可见 = 已发布 且 定时发布时间已到 且 未过期。

// parseScheduleTime 解析定时发布/有效期输入。
func parseScheduleTime(s string) (*time.Time, error) {
	s = strings.TrimSpace(s)
	if s == "" {
		return nil, nil
	}
	for _, layout := range []string{"2006-01-02 15:04:05", time.RFC3339} {
		t, err := time.ParseInLocation(layout, s, time.Local)
		if err == nil {
			return &t, nil
		}
	}
	return nil, &time.ParseError{Message: "时间格式应为 YYYY-MM-DD HH:mm:ss 或 RFC3339"}
}

// articleVisibleNow 判定文章当前是否公开可见（与 PublicVisibleCond SQL 守卫同口径）。
func articleVisibleNow(a *cmsmodel.CmsArticle, now time.Time) bool {
	if a.Status != cmsmodel.ArticleStatusPublished {
		return false
	}
	if a.PublishAt != nil && a.PublishAt.After(now) {
		return false
	}
	if a.ExpireAt != nil && !a.ExpireAt.After(now) {
		return false
	}
	return true
}
