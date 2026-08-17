package service

import (
	"context"
	"errors"

	oamodel "qzt-go-server/internal/model/oa"
	"qzt-go-server/internal/pkg/numbergen"
	"qzt-go-server/internal/repository"
	oarepo "qzt-go-server/internal/repository/oa"
)

// meeting_booking.go 会议预订服务。

type MeetingBookingService struct {
	repo *oarepo.MeetingBookingRepo
}

func NewMeetingBookingService() *MeetingBookingService {
	return &MeetingBookingService{repo: oarepo.NewMeetingBookingRepo()}
}

type CreateMeetingBookingRequest struct {
	Title     string `json:"title" binding:"required"`
	RoomID    uint   `json:"room_id" binding:"required"`
	StartTime string `json:"start_time" binding:"required"`
	EndTime   string `json:"end_time" binding:"required"`
	Attendees int    `json:"attendees"`
	Topic     string `json:"topic"`
	Remark    string `json:"remark"`
	DeptID    *uint  `json:"dept_id"`
}

func (s *MeetingBookingService) Create(ctx context.Context, req *CreateMeetingBookingRequest, userID uint) (*oamodel.OaMeetingBooking, error) {
	bookingNo, _ := numbergen.Generate(ctx, "meeting")

	startTime, err := parseDateTimeField(req.StartTime)
	if err != nil {
		return nil, errors.New("开始时间格式错误")
	}
	endTime, err := parseDateTimeField(req.EndTime)
	if err != nil {
		return nil, errors.New("结束时间格式错误")
	}

	// 冲突检测:同一会议室时间不可重叠
	conflict, err := s.repo.HasConflict(ctx, req.RoomID, 0, req.StartTime, req.EndTime)
	if err != nil {
		return nil, err
	}
	if conflict {
		return nil, errors.New("该会议室在此时间段已被预订")
	}

	booking := &oamodel.OaMeetingBooking{
		BookingNo:      bookingNo,
		Title:          req.Title,
		RoomID:         req.RoomID,
		OrganizerID:    userID,
		DeptID:         req.DeptID,
		StartTime:      startTime,
		EndTime:        endTime,
		Attendees:      req.Attendees,
		Topic:          req.Topic,
		Remark:         req.Remark,
		ApprovalStatus: oamodel.ApprovalStatusNone,
	}
	if err := s.repo.Create(ctx, booking); err != nil {
		return nil, err
	}
	return booking, nil
}

func (s *MeetingBookingService) List(ctx context.Context, page, pageSize int, roomID, organizerID uint, approvalStatus, startDate, endDate string) ([]oamodel.OaMeetingBooking, int64, error) {
	return s.repo.PageList(ctx, page, pageSize, roomID, organizerID, approvalStatus, startDate, endDate)
}

func (s *MeetingBookingService) GetByID(ctx context.Context, id uint) (*oamodel.OaMeetingBooking, error) {
	booking, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, repository.NotFoundOr(err, "会议预订不存在")
	}
	return booking, nil
}

type UpdateMeetingBookingRequest struct {
	Title     string `json:"title"`
	RoomID    uint   `json:"room_id"`
	StartTime string `json:"start_time"`
	EndTime   string `json:"end_time"`
	Attendees int    `json:"attendees"`
	Topic     string `json:"topic"`
	Remark    string `json:"remark"`
}

func (s *MeetingBookingService) Update(ctx context.Context, id uint, req *UpdateMeetingBookingRequest) error {
	booking, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return repository.NotFoundOr(err, "会议预订不存在")
	}
	if !oamodel.CanEditApproval(booking.ApprovalStatus) {
		return errors.New("仅未提交或已驳回的预订可编辑")
	}

	// 如果改了会议室或时间,需要重新检测冲突
	roomChanged := req.RoomID != 0 && req.RoomID != booking.RoomID
	timeChanged := req.StartTime != "" || req.EndTime != ""
	if roomChanged || timeChanged {
		roomID := booking.RoomID
		if req.RoomID != 0 {
			roomID = req.RoomID
		}
		startStr := req.StartTime
		if startStr == "" {
			startStr = booking.StartTime.String()
		}
		endStr := req.EndTime
		if endStr == "" {
			endStr = booking.EndTime.String()
		}
		conflict, err := s.repo.HasConflict(ctx, roomID, id, startStr, endStr)
		if err != nil {
			return err
		}
		if conflict {
			return errors.New("该会议室在此时间段已被预订")
		}
	}

	booking.Title = req.Title
	if req.RoomID != 0 {
		booking.RoomID = req.RoomID
	}
	if req.StartTime != "" {
		if t, err := parseDateTimeField(req.StartTime); err == nil {
			booking.StartTime = t
		}
	}
	if req.EndTime != "" {
		if t, err := parseDateTimeField(req.EndTime); err == nil {
			booking.EndTime = t
		}
	}
	booking.Attendees = req.Attendees
	booking.Topic = req.Topic
	booking.Remark = req.Remark
	return s.repo.Update(ctx, booking)
}

func (s *MeetingBookingService) Delete(ctx context.Context, id uint) error {
	booking, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return repository.NotFoundOr(err, "会议预订不存在")
	}
	if booking.ApprovalStatus != oamodel.ApprovalStatusNone {
		return errors.New("仅未提交审批的预订可删除")
	}
	return s.repo.Delete(ctx, id)
}
