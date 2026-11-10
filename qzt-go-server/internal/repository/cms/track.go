package cms

import (
	"context"
	"time"

	"gorm.io/gorm"

	cmsmodel "qzt-go-server/internal/model/cms"
	"qzt-go-server/internal/repository"
)

// track.go 官网埋点事件 repository。append-only 写入 + 聚合统计(原生聚合查询)。

// TrackDatePoint 单日 PV/UV。
type TrackDatePoint struct {
	Date string `json:"date"`
	PV   int64  `json:"pv"`
	UV   int64  `json:"uv"`
}

// TrackNameCount 通用「名称-次数」对(页面/事件/来源 Top 榜)。
type TrackNameCount struct {
	Name  string `json:"name"`
	Count int64  `json:"count"`
}

// TrackRepo 埋点事件仓储。
type TrackRepo struct {
	repository.BaseRepo[cmsmodel.CmsTrackEvent]
}

func NewTrackRepo() *TrackRepo { return &TrackRepo{} }

// BatchCreate 批量写入事件。
func (r *TrackRepo) BatchCreate(ctx context.Context, events []*cmsmodel.CmsTrackEvent) error {
	if len(events) == 0 {
		return nil
	}
	return repository.DBFrom(ctx).Create(&events).Error
}

// CountRange 统计时间范围内的 PV 与 UV(distinct visitor_id)。
func (r *TrackRepo) CountRange(ctx context.Context, start, end time.Time) (pv, uv int64, err error) {
	db := repository.DBFrom(ctx).Model(&cmsmodel.CmsTrackEvent{}).Where("created_at >= ? AND created_at < ?", start, end)
	if err = db.Count(&pv).Error; err != nil {
		return 0, 0, err
	}
	err = db.Distinct("visitor_id").Count(&uv).Error
	return pv, uv, err
}

// DailySeries 按天聚合 PV/UV(自然日,数据库时区)。
func (r *TrackRepo) DailySeries(ctx context.Context, start, end time.Time) ([]TrackDatePoint, error) {
	var rows []TrackDatePoint
	err := repository.DBFrom(ctx).Model(&cmsmodel.CmsTrackEvent{}).
		Select("DATE_FORMAT(created_at, '%Y-%m-%d') AS date, COUNT(*) AS pv, COUNT(DISTINCT visitor_id) AS uv").
		Where("created_at >= ? AND created_at < ?", start, end).
		Group("DATE_FORMAT(created_at, '%Y-%m-%d')").Order("date ASC").
		Scan(&rows).Error
	return rows, err
}

// topColumns 允许做 Top 榜聚合的列白名单——聚合列是 SQL 标识符,不能直接拼客户端输入。
var topColumns = map[string]string{
	"path":     "path",
	"event":    "event",
	"referrer": "referrer",
}

// TopBy 按指定列聚合计数取 Top N。column 仅接受 path/event/referrer(白名单)。
func (r *TrackRepo) TopBy(ctx context.Context, column string, start, end time.Time, limit int) ([]TrackNameCount, error) {
	col, ok := topColumns[column]
	if !ok {
		return nil, gorm.ErrInvalidData
	}
	if limit <= 0 || limit > 100 {
		limit = 10
	}
	var rows []TrackNameCount
	err := repository.DBFrom(ctx).Model(&cmsmodel.CmsTrackEvent{}).
		Select(col+" AS name, COUNT(*) AS count").
		Where("created_at >= ? AND created_at < ? AND "+col+" <> ''", start, end).
		Group(col).Order("count DESC").
		Limit(limit).
		Scan(&rows).Error
	return rows, err
}

// ListPage 分页查询原始事件(管理端排查用)。event 为空则不过滤。
func (r *TrackRepo) ListPage(ctx context.Context, page, pageSize int, event string, start, end time.Time) ([]cmsmodel.CmsTrackEvent, int64, error) {
	q := &repository.QueryOptions{
		Conds: []repository.Cond{
			{Query: "created_at >= ? AND created_at < ?", Args: []any{start, end}},
		},
		Order: []string{"created_at DESC", "id DESC"},
	}
	if event != "" {
		q.Where = map[string]any{"event": event}
	}
	return r.PageList(ctx, page, pageSize, q)
}
