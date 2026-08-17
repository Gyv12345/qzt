package service

import (
	"context"
	"errors"
	"time"

	"gorm.io/gorm"

	oamodel "qzt-go-server/internal/model/oa"
	"qzt-go-server/internal/pkg/numbergen"
	"qzt-go-server/internal/repository"
	oarepo "qzt-go-server/internal/repository/oa"
	"qzt-go-server/pkg/xtime"
)

// trip.go 出差申请服务。

type TripService struct {
	repo *oarepo.TripRepo
}

func NewTripService() *TripService { return &TripService{repo: oarepo.NewTripRepo()} }

type CreateTripRequest struct {
	Title        string `json:"title" binding:"required"`
	ApplicantID  uint   `json:"applicant_id"`
	DeptID       *uint  `json:"dept_id"`
	Destination  string `json:"destination" binding:"required"`
	Purpose      string `json:"purpose"`
	StartDate    string `json:"start_date" binding:"required"`
	EndDate      string `json:"end_date" binding:"required"`
	Transport    string `json:"transport"`
	BudgetAmount string `json:"budget_amount"`
	Description  string `json:"description"`
}

func (s *TripService) Create(ctx context.Context, req *CreateTripRequest, userID uint) (*oamodel.OaBusinessTrip, error) {
	if req.ApplicantID == 0 {
		req.ApplicantID = userID
	}
	tripNo, _ := numbergen.Generate(ctx, "trip")

	startDate, err := parseDateField(req.StartDate)
	if err != nil {
		return nil, errors.New("开始日期格式错误")
	}
	endDate, err := parseDateField(req.EndDate)
	if err != nil {
		return nil, errors.New("结束日期格式错误")
	}

	trip := &oamodel.OaBusinessTrip{
		TripNo:         tripNo,
		Title:          req.Title,
		ApplicantID:    req.ApplicantID,
		DeptID:         req.DeptID,
		Destination:    req.Destination,
		Purpose:        req.Purpose,
		StartDate:      startDate,
		EndDate:        endDate,
		Transport:      req.Transport,
		BudgetAmount:   req.BudgetAmount,
		Description:    req.Description,
		ApprovalStatus: oamodel.ApprovalStatusNone,
	}
	if err := s.repo.Create(ctx, trip); err != nil {
		return nil, err
	}
	return trip, nil
}

func (s *TripService) List(ctx context.Context, page, pageSize int, applicantID uint, approvalStatus string) ([]oamodel.OaBusinessTrip, int64, error) {
	return s.repo.PageList(ctx, page, pageSize, applicantID, approvalStatus)
}

func (s *TripService) GetByID(ctx context.Context, id uint) (*oamodel.OaBusinessTrip, error) {
	trip, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, repository.NotFoundOr(err, "出差单不存在")
	}
	return trip, nil
}

type UpdateTripRequest struct {
	Title        string `json:"title" binding:"required"`
	DeptID       *uint  `json:"dept_id"`
	Destination  string `json:"destination"`
	Purpose      string `json:"purpose"`
	StartDate    string `json:"start_date"`
	EndDate      string `json:"end_date"`
	Transport    string `json:"transport"`
	BudgetAmount string `json:"budget_amount"`
	Description  string `json:"description"`
}

func (s *TripService) Update(ctx context.Context, id uint, req *UpdateTripRequest) error {
	trip, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return repository.NotFoundOr(err, "出差单不存在")
	}
	if !oamodel.CanEditApproval(trip.ApprovalStatus) {
		return errors.New("仅未提交或已驳回的出差单可编辑")
	}
	trip.Title = req.Title
	trip.DeptID = req.DeptID
	if req.Destination != "" {
		trip.Destination = req.Destination
	}
	trip.Purpose = req.Purpose
	trip.Transport = req.Transport
	trip.BudgetAmount = req.BudgetAmount
	trip.Description = req.Description
	if req.StartDate != "" {
		if t, err := parseDateField(req.StartDate); err == nil {
			trip.StartDate = t
		}
	}
	if req.EndDate != "" {
		if t, err := parseDateField(req.EndDate); err == nil {
			trip.EndDate = t
		}
	}
	return s.repo.Update(ctx, trip)
}

func (s *TripService) Delete(ctx context.Context, id uint) error {
	trip, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return repository.NotFoundOr(err, "出差单不存在")
	}
	if trip.ApprovalStatus != oamodel.ApprovalStatusNone {
		return errors.New("仅未提交审批的出差单可删除")
	}
	return s.repo.Delete(ctx, id)
}

// parseDateField 解析 yyyy-MM-dd 为 xtime.DateTime。
func parseDateField(s string) (xtime.DateTime, error) {
	t, err := time.ParseInLocation("2006-01-02", s, time.Local)
	if err != nil {
		return xtime.DateTime{}, err
	}
	return xtime.NewDateTime(t), nil
}

var _ = repository.Transaction
var _ *gorm.DB
