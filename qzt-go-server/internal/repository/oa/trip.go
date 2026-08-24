package oa

import (
	"context"

	oamodel "qzt-go-server/internal/model/oa"
	"qzt-go-server/internal/repository"
	"gorm.io/gorm"
)

// trip.go OA 出差 repository。

type TripRepo struct {
	repository.BaseRepo[oamodel.OaBusinessTrip]
}

func NewTripRepo() *TripRepo { return &TripRepo{} }

func (r *TripRepo) PageList(ctx context.Context, page, pageSize int, applicantID uint, tripNo, title, destination, approvalStatus string) ([]oamodel.OaBusinessTrip, int64, error) {
	var list []oamodel.OaBusinessTrip
	q := repository.DBFrom(ctx).Model(&oamodel.OaBusinessTrip{})
	if tripNo != "" {
		q = q.Where("trip_no LIKE ?", "%"+tripNo+"%")
	}
	if title != "" {
		q = q.Where("title LIKE ?", "%"+title+"%")
	}
	if destination != "" {
		q = q.Where("destination LIKE ?", "%"+destination+"%")
	}
	if applicantID > 0 {
		q = q.Where("applicant_id = ?", applicantID)
	}
	if approvalStatus != "" {
		q = q.Where("approval_status = ?", approvalStatus)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	err := q.Order("id DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&list).Error
	return list, total, err
}

func (r *TripRepo) Update(ctx context.Context, m *oamodel.OaBusinessTrip) error {
	return r.BaseRepo.Update(ctx, m, "Title", "ApplicantID", "DeptID", "Destination", "Purpose", "StartDate", "EndDate", "Transport", "BudgetAmount", "Description", "ApprovalStatus")
}

var _ *gorm.DB // 确保 gorm import 被使用(repoDB 在 expense.go 定义)
