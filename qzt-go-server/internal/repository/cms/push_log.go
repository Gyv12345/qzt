package cms

import (
	"context"
	"time"

	cmsmodel "qzt-go-server/internal/model/cms"
	"qzt-go-server/internal/repository"
)

// push_log.go 搜索引擎推送日志仓储。

// PushLogRepo 推送日志仓储。
type PushLogRepo struct {
	repository.BaseRepo[cmsmodel.CmsPushLog]
}

func NewPushLogRepo() *PushLogRepo { return &PushLogRepo{} }

// PushedRecently 判断 url 在指定通道下 within 内是否已成功推送。
// 用于 24h 幂等去重——保护百度每日配额,也避免向 IndexNow 重复灌同批 URL。
func (r *PushLogRepo) PushedRecently(ctx context.Context, channel, url string, within time.Duration) (bool, error) {
	var count int64
	err := repository.DBFrom(ctx).Model(&cmsmodel.CmsPushLog{}).
		Where("channel = ? AND url = ? AND status = ? AND created_at >= ?",
			channel, url, cmsmodel.PushStatusSuccess, time.Now().Add(-within)).
		Count(&count).Error
	return count > 0, err
}

// List 管理端分页查询,channel 为空查全部。
func (r *PushLogRepo) List(ctx context.Context, page, pageSize int, channel string) ([]cmsmodel.CmsPushLog, int64, error) {
	opts := &repository.QueryOptions{Order: []string{"id DESC"}}
	if channel != "" {
		opts.Where = map[string]any{"channel": channel}
	}
	return r.PageList(ctx, page, pageSize, opts)
}
