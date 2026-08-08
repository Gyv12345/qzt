package service

import (
	"context"

	oamodel "qzt-go-server/internal/model/oa"
	oarepo "qzt-go-server/internal/repository/oa"
)

// meeting_room.go 会议室管理服务。

type MeetingRoomService struct {
	repo *oarepo.MeetingRoomRepo
}

func NewMeetingRoomService() *MeetingRoomService { return &MeetingRoomService{repo: oarepo.NewMeetingRoomRepo()} }

type CreateMeetingRoomRequest struct {
	Name      string `json:"name" binding:"required"`
	Location  string `json:"location"`
	Capacity  int    `json:"capacity"`
	Equipment string `json:"equipment"`
	Status    string `json:"status"`
	Remark    string `json:"remark"`
}

func (s *MeetingRoomService) Create(ctx context.Context, req *CreateMeetingRoomRequest) (*oamodel.OaMeetingRoom, error) {
	if req.Status == "" {
		req.Status = "ENABLED"
	}
	room := &oamodel.OaMeetingRoom{
		Name:      req.Name,
		Location:  req.Location,
		Capacity:  req.Capacity,
		Equipment: req.Equipment,
		Status:    req.Status,
		Remark:    req.Remark,
	}
	if err := s.repo.Create(ctx, room); err != nil {
		return nil, err
	}
	return room, nil
}

func (s *MeetingRoomService) List(ctx context.Context, page, pageSize int, name, status string) ([]oamodel.OaMeetingRoom, int64, error) {
	return s.repo.PageList(ctx, page, pageSize, name, status)
}

func (s *MeetingRoomService) GetByID(ctx context.Context, id uint) (*oamodel.OaMeetingRoom, error) {
	room, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, notFoundOr(err, "会议室不存在")
	}
	return room, nil
}

type UpdateMeetingRoomRequest struct {
	Name      string `json:"name"`
	Location  string `json:"location"`
	Capacity  int    `json:"capacity"`
	Equipment string `json:"equipment"`
	Status    string `json:"status"`
	Remark    string `json:"remark"`
}

func (s *MeetingRoomService) Update(ctx context.Context, id uint, req *UpdateMeetingRoomRequest) error {
	room, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return notFoundOr(err, "会议室不存在")
	}
	room.Name = req.Name
	room.Location = req.Location
	room.Capacity = req.Capacity
	room.Equipment = req.Equipment
	room.Status = req.Status
	room.Remark = req.Remark
	return s.repo.Update(ctx, room)
}

func (s *MeetingRoomService) Delete(ctx context.Context, id uint) error {
	if _, err := s.repo.GetByID(ctx, id); err != nil {
		return notFoundOr(err, "会议室不存在")
	}
	return s.repo.Delete(ctx, id)
}
