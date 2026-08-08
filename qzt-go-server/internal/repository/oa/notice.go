package oa

import (
	"context"

	oamodel "qzt-go-server/internal/model/oa"
	"qzt-go-server/internal/repository"
	"qzt-go-server/pkg/xtime"
)

// notice.go OA 公告 repository。

type NoticeRepo struct {
	repository.BaseRepo[oamodel.OaNotice]
}

func NewNoticeRepo() *NoticeRepo { return &NoticeRepo{} }

func (r *NoticeRepo) Update(ctx context.Context, m *oamodel.OaNotice) error {
	return r.BaseRepo.Update(ctx, m, "Title", "Content", "Type", "Status")
}

// Publish 发布公告:status→1 + publish_time。
func (r *NoticeRepo) Publish(ctx context.Context, id uint) error {
	now := xtime.Now()
	return repository.DBFrom(ctx).Model(&oamodel.OaNotice{}).Where("id = ?", id).
		Updates(map[string]interface{}{
			"status":       oamodel.NoticeStatusPublish,
			"publish_time": now,
			"updated_at":   now,
		}).Error
}

// Withdraw 撤回公告:status→0。
func (r *NoticeRepo) Withdraw(ctx context.Context, id uint) error {
	now := xtime.Now()
	return repository.DBFrom(ctx).Model(&oamodel.OaNotice{}).Where("id = ?", id).
		Updates(map[string]interface{}{
			"status":     oamodel.NoticeStatusDraft,
			"updated_at": now,
		}).Error
}

// FindPublished 已发布列表(按 type 可选过滤,publish_time DESC)。
func (r *NoticeRepo) FindPublished(ctx context.Context, noticeType int8, limit int) ([]oamodel.OaNotice, error) {
	q := repository.DBFrom(ctx).Where("status = ?", oamodel.NoticeStatusPublish)
	if noticeType > 0 {
		q = q.Where("type = ?", noticeType)
	}
	if limit > 0 {
		q = q.Limit(limit)
	}
	var list []oamodel.OaNotice
	if err := q.Order("publish_time DESC").Find(&list).Error; err != nil {
		return nil, err
	}
	return list, nil
}

// PageList 分页查询(支持 title/type/status 过滤)。
func (r *NoticeRepo) PageList(ctx context.Context, page, pageSize int, title string, noticeType, status int8) ([]oamodel.OaNotice, int64, error) {
	var list []oamodel.OaNotice
	var total int64
	db := repository.DBFrom(ctx).Model(&oamodel.OaNotice{})
	if title != "" {
		db = db.Where("title LIKE ?", "%"+title+"%")
	}
	if noticeType > 0 {
		db = db.Where("type = ?", noticeType)
	}
	if status >= 0 {
		db = db.Where("status = ?", status)
	}
	if err := db.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	if err := db.Order("id DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&list).Error; err != nil {
		return nil, 0, err
	}
	return list, total, nil
}
