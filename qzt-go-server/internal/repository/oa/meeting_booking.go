package oa

import (
	"context"

	oamodel "qzt-go-server/internal/model/oa"
	"qzt-go-server/internal/repository"
)

// meeting_booking.go OA 会议预订 repository。

type MeetingBookingRepo struct {
	repository.BaseRepo[oamodel.OaMeetingBooking]
}

func NewMeetingBookingRepo() *MeetingBookingRepo { return &MeetingBookingRepo{} }

// PageList 分页查询。支持按会议室/组织者/审批状态/日期筛选。
func (r *MeetingBookingRepo) PageList(ctx context.Context, page, pageSize int, roomID, organizerID uint, approvalStatus, startDate, endDate string) ([]oamodel.OaMeetingBooking, int64, error) {
	var list []oamodel.OaMeetingBooking
	q := repository.DBFrom(ctx).Model(&oamodel.OaMeetingBooking{})
	if roomID > 0 {
		q = q.Where("room_id = ?", roomID)
	}
	if organizerID > 0 {
		q = q.Where("organizer_id = ?", organizerID)
	}
	if approvalStatus != "" {
		q = q.Where("approval_status = ?", approvalStatus)
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

// HasConflict 检查同一会议室是否存在时间冲突的有效预订。
// 排除自身(excludeID)和已取消/驳回的预订。
// 两个时间段 [s1,e1) 和 [s2,e2) 重叠的条件:s1 < e2 AND s2 < e1。
func (r *MeetingBookingRepo) HasConflict(ctx context.Context, roomID, excludeID uint, startTime, endTime string) (bool, error) {
	var count int64
	q := repository.DBFrom(ctx).Model(&oamodel.OaMeetingBooking{}).
		Where("room_id = ?", roomID).
		Where("start_time < ?", endTime).
		Where("end_time > ?", startTime).
		Where("approval_status IN ?", []string{"NONE", "APPROVING", "APPROVED"})
	if excludeID > 0 {
		q = q.Where("id != ?", excludeID)
	}
	err := q.Count(&count).Error
	return count > 0, err
}

func (r *MeetingBookingRepo) Update(ctx context.Context, m *oamodel.OaMeetingBooking) error {
	return r.BaseRepo.Update(ctx, m, "Title", "RoomID", "StartTime", "EndTime", "Attendees", "Topic", "ApprovalStatus", "DeptID", "Remark")
}
