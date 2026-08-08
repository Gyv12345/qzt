package oa

import (
	"context"

	oamodel "qzt-go-server/internal/model/oa"
	"qzt-go-server/internal/repository"
)

// meeting_room.go OA 会议室 repository。

type MeetingRoomRepo struct {
	repository.BaseRepo[oamodel.OaMeetingRoom]
}

func NewMeetingRoomRepo() *MeetingRoomRepo { return &MeetingRoomRepo{} }

// PageList 分页查询。支持按名称/状态筛选。
func (r *MeetingRoomRepo) PageList(ctx context.Context, page, pageSize int, name, status string) ([]oamodel.OaMeetingRoom, int64, error) {
	var list []oamodel.OaMeetingRoom
	q := repository.DBFrom(ctx).Model(&oamodel.OaMeetingRoom{})
	if name != "" {
		q = q.Where("name LIKE ?", "%"+name+"%")
	}
	if status != "" {
		q = q.Where("status = ?", status)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	err := q.Order("id DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&list).Error
	return list, total, err
}

func (r *MeetingRoomRepo) Update(ctx context.Context, m *oamodel.OaMeetingRoom) error {
	return r.BaseRepo.Update(ctx, m, "Name", "Location", "Capacity", "Equipment", "Status", "Remark")
}
