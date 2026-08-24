package oa

import (
	"context"

	oamodel "qzt-go-server/internal/model/oa"
	"qzt-go-server/internal/repository"
)

// schedule.go OA 日程安排 repository。

type ScheduleRepo struct {
	repository.BaseRepo[oamodel.OaSchedule]
}

func NewScheduleRepo() *ScheduleRepo { return &ScheduleRepo{} }

// PageList 分页查询。日程属于个人,按 creator_id 过滤。
func (r *ScheduleRepo) PageList(ctx context.Context, page, pageSize int, creatorID uint, title, eventType, status, startDate, endDate string) ([]oamodel.OaSchedule, int64, error) {
	var list []oamodel.OaSchedule
	q := repository.DBFrom(ctx).Model(&oamodel.OaSchedule{})
	if title != "" {
		q = q.Where("title LIKE ?", "%"+title+"%")
	}
	if creatorID > 0 {
		q = q.Where("creator_id = ?", creatorID)
	}
	if eventType != "" {
		q = q.Where("event_type = ?", eventType)
	}
	if status != "" {
		q = q.Where("status = ?", status)
	}
	if startDate != "" {
		q = q.Where("start_time >= ?", startDate)
	}
	if endDate != "" {
		q = q.Where("end_time <= ?", endDate)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	err := q.Order("id DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&list).Error
	return list, total, err
}

// ListByDateRange 查某日期范围内的日程(日历视图用)。仅返回当前用户的。
func (r *ScheduleRepo) ListByDateRange(ctx context.Context, creatorID uint, startDate, endDate string) ([]oamodel.OaSchedule, error) {
	var list []oamodel.OaSchedule
	q := repository.DBFrom(ctx).Model(&oamodel.OaSchedule{}).
		Where("creator_id = ?", creatorID).
		Where("start_time >= ? AND end_time <= ?", startDate, endDate).
		Order("start_time ASC")
	err := q.Find(&list).Error
	return list, err
}

func (r *ScheduleRepo) Update(ctx context.Context, m *oamodel.OaSchedule) error {
	return r.BaseRepo.Update(ctx, m, "Title", "EventType", "StartTime", "EndTime", "Location", "Content", "RemindType", "Status")
}
