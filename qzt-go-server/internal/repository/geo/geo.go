// Package geo GEO 监测 repository(提示词库/平台/轮次/结果)。
// 嵌入 repository.BaseRepo[T] 获得通用 CRUD;按需补充特定查询。
package geo

import (
	"context"
	"errors"
	"time"

	"gorm.io/gorm"

	geo "qzt-go-server/internal/model/geo"
	"qzt-go-server/internal/repository"
)

// PromptRepo geo_prompt 提示词库。
type PromptRepo struct {
	repository.BaseRepo[geo.GeoPrompt]
}

func NewPromptRepo() *PromptRepo { return &PromptRepo{} }

// PageList 分页（group_type/keyword 可选筛选）。
func (r *PromptRepo) PageList(ctx context.Context, page, pageSize int, groupType, keyword string) ([]geo.GeoPrompt, int64, error) {
	q := &repository.QueryOptions{Order: []string{"sort ASC", "id ASC"}}
	if groupType != "" {
		q.Where = map[string]any{"group_type": groupType}
	}
	if keyword != "" {
		q.Search = map[string]string{"question": keyword}
	}
	return r.BaseRepo.PageList(ctx, page, pageSize, q)
}

// ListEnabled 参与监测的全部提示词（按 sort 稳定排序）。
func (r *PromptRepo) ListEnabled(ctx context.Context) ([]geo.GeoPrompt, error) {
	return r.List(ctx, &repository.QueryOptions{
		Where: map[string]any{"enabled": true},
		Order: []string{"sort ASC", "id ASC"},
	})
}

// PlatformRepo geo_platform 监测平台。
type PlatformRepo struct {
	repository.BaseRepo[geo.GeoPlatform]
}

func NewPlatformRepo() *PlatformRepo { return &PlatformRepo{} }

// ListEnabled 参与监测的全部平台。
func (r *PlatformRepo) ListEnabled(ctx context.Context) ([]geo.GeoPlatform, error) {
	return r.List(ctx, &repository.QueryOptions{
		Where: map[string]any{"enabled": true},
		Order: []string{"id ASC"},
	})
}

// ListAll 全部平台（管理列表用）。
func (r *PlatformRepo) ListAll(ctx context.Context) ([]geo.GeoPlatform, error) {
	return r.List(ctx, &repository.QueryOptions{Order: []string{"id ASC"}})
}

// RunRepo geo_run 监测轮次。
type RunRepo struct {
	repository.BaseRepo[geo.GeoRun]
}

func NewRunRepo() *RunRepo { return &RunRepo{} }

// PageList 分页（新轮次在前）。
func (r *RunRepo) PageList(ctx context.Context, page, pageSize int) ([]geo.GeoRun, int64, error) {
	return r.BaseRepo.PageList(ctx, page, pageSize, &repository.QueryOptions{Order: []string{"id DESC"}})
}

// Latest 最近 N 个已完成轮次（趋势接口用）。
func (r *RunRepo) Latest(ctx context.Context, limit int) ([]geo.GeoRun, error) {
	list, _, err := r.BaseRepo.PageList(ctx, 1, limit, &repository.QueryOptions{
		Where: map[string]any{"status": "done"},
		Order: []string{"id DESC"},
	})
	return list, err
}

// FindRunning 当前执行中的轮次（防重入；无记录返回 nil）。
func (r *RunRepo) FindRunning(ctx context.Context) (*geo.GeoRun, error) {
	run, err := r.GetOne(ctx, &repository.QueryOptions{
		Conds: []repository.Cond{{Query: "status = ?", Args: []any{"running"}}},
	})
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return run, nil
}

// ResultRepo geo_result 监测结果。
type ResultRepo struct {
	repository.BaseRepo[geo.GeoResult]
}

func NewResultRepo() *ResultRepo { return &ResultRepo{} }

// ListByRun 一轮的全部结果（按平台、得分稳定排序）。
func (r *ResultRepo) ListByRun(ctx context.Context, runID uint) ([]geo.GeoResult, error) {
	return r.List(ctx, &repository.QueryOptions{
		Where: map[string]any{"run_id": runID},
		Order: []string{"platform_id ASC", "score DESC", "prompt_id ASC"},
	})
}

// ── 信源产线：选题池 / 稿件库 / 平台账号 ──

// TopicRepo geo_topic 选题池。
type TopicRepo struct {
	repository.BaseRepo[geo.GeoTopic]
}

func NewTopicRepo() *TopicRepo { return &TopicRepo{} }

// PageList 分页（status/origin 可选筛选，新选题在前）。
func (r *TopicRepo) PageList(ctx context.Context, page, pageSize int, status, origin string) ([]geo.GeoTopic, int64, error) {
	q := &repository.QueryOptions{Order: []string{"id DESC"}}
	if status != "" {
		q.Where = map[string]any{"status": status}
	}
	if origin != "" {
		if q.Where == nil {
			q.Where = map[string]any{}
		}
		q.Where["origin"] = origin
	}
	return r.BaseRepo.PageList(ctx, page, pageSize, q)
}

// ListApproved 待产稿的已批准选题（先批先产）。
func (r *TopicRepo) ListApproved(ctx context.Context, limit int) ([]geo.GeoTopic, error) {
	list, _, err := r.BaseRepo.PageList(ctx, 1, limit, &repository.QueryOptions{
		Where: map[string]any{"status": "approved"},
		Order: []string{"id ASC"},
	})
	return list, err
}

// SourceRepo geo_source 稿件库。
type SourceRepo struct {
	repository.BaseRepo[geo.GeoSource]
}

func NewSourceRepo() *SourceRepo { return &SourceRepo{} }

// PageList 分页（content_type/platform/status 可选筛选，新稿件在前）。
func (r *SourceRepo) PageList(ctx context.Context, page, pageSize int, contentType, platform, status, qcStatus string) ([]geo.GeoSource, int64, error) {
	q := &repository.QueryOptions{Order: []string{"id DESC"}}
	if contentType != "" {
		q.Where = map[string]any{"content_type": contentType}
	}
	if platform != "" {
		if q.Where == nil {
			q.Where = map[string]any{}
		}
		q.Where["platform"] = platform
	}
	if status != "" {
		if q.Where == nil {
			q.Where = map[string]any{}
		}
		q.Where["status"] = status
	}
	if qcStatus != "" {
		if q.Where == nil {
			q.Where = map[string]any{}
		}
		q.Where["qc_status"] = qcStatus
	}
	return r.BaseRepo.PageList(ctx, page, pageSize, q)
}

// RecentMotherTopicIDs 最近 since 之后产过母稿的选题 ID 集合（选题冷却判定用；
// variant_of=0 只算母稿，分发稿不占冷却）。
func (r *SourceRepo) RecentMotherTopicIDs(ctx context.Context, since time.Time) (map[uint]struct{}, error) {
	rows, err := r.List(ctx, &repository.QueryOptions{
		Conds: []repository.Cond{
			{Query: "variant_of = ?", Args: []any{0}},
			{Query: "created_at >= ?", Args: []any{since}},
		},
		Select: []string{"topic_id"},
	})
	if err != nil {
		return nil, err
	}
	set := make(map[uint]struct{}, len(rows))
	for _, s := range rows {
		if s.TopicID > 0 {
			set[s.TopicID] = struct{}{}
		}
	}
	return set, nil
}

// PlatformAccountRepo geo_platform_account 平台授权账号。
type PlatformAccountRepo struct {
	repository.BaseRepo[geo.GeoPlatformAccount]
}

func NewPlatformAccountRepo() *PlatformAccountRepo { return &PlatformAccountRepo{} }

// ListEnabled 平台的全部可用授权账号。
func (r *PlatformAccountRepo) ListEnabled(ctx context.Context, platform string) ([]geo.GeoPlatformAccount, error) {
	return r.List(ctx, &repository.QueryOptions{
		Where: map[string]any{"platform": platform, "enabled": true},
		Order: []string{"id ASC"},
	})
}

// FindByOpenID 按 openid 查账号（OAuth 绑定时 upsert 用；无记录返回 nil,nil）。
func (r *PlatformAccountRepo) FindByOpenID(ctx context.Context, platform, openID string) (*geo.GeoPlatformAccount, error) {
	acc, err := r.GetOne(ctx, &repository.QueryOptions{
		Where: map[string]any{"platform": platform, "open_id": openID},
	})
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return acc, nil
}
