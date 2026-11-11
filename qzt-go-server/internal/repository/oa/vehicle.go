package oa

import (
	"context"

	oamodel "qzt-go-server/internal/model/oa"
	"qzt-go-server/internal/repository"
)

// vehicle.go OA 用车 repository。

// VehicleRepo 车辆台账 repo。
type VehicleRepo struct {
	repository.BaseRepo[oamodel.OaVehicle]
}

func NewVehicleRepo() *VehicleRepo { return &VehicleRepo{} }

// PageList 分页列表(车牌/状态筛选)。
func (r *VehicleRepo) PageList(ctx context.Context, page, pageSize int, plateNo, status string) ([]oamodel.OaVehicle, int64, error) {
	var list []oamodel.OaVehicle
	q := repository.DBFrom(ctx).Model(&oamodel.OaVehicle{})
	if plateNo != "" {
		q = q.Where("plate_no LIKE ?", "%"+plateNo+"%")
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

// Update 列清单更新(防整对象覆盖)。
func (r *VehicleRepo) Update(ctx context.Context, m *oamodel.OaVehicle) error {
	return r.BaseRepo.Update(ctx, m, "PlateNo", "VehicleModel", "Seats", "Status", "OwnerID", "Remark")
}

// VehicleApplicationRepo 用车申请 repo。
type VehicleApplicationRepo struct {
	repository.BaseRepo[oamodel.OaVehicleApplication]
}

func NewVehicleApplicationRepo() *VehicleApplicationRepo { return &VehicleApplicationRepo{} }

// PageList 分页列表。
func (r *VehicleApplicationRepo) PageList(ctx context.Context, page, pageSize int, applicationNo, title, approvalStatus string, applicantID uint) ([]oamodel.OaVehicleApplication, int64, error) {
	var list []oamodel.OaVehicleApplication
	q := repository.DBFrom(ctx).Model(&oamodel.OaVehicleApplication{})
	if applicationNo != "" {
		q = q.Where("application_no LIKE ?", "%"+applicationNo+"%")
	}
	if title != "" {
		q = q.Where("title LIKE ?", "%"+title+"%")
	}
	if approvalStatus != "" {
		q = q.Where("approval_status = ?", approvalStatus)
	}
	if applicantID > 0 {
		q = q.Where("applicant_id = ?", applicantID)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	err := q.Order("id DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&list).Error
	return list, total, err
}

// Update 列清单更新。
func (r *VehicleApplicationRepo) Update(ctx context.Context, m *oamodel.OaVehicleApplication) error {
	return r.BaseRepo.Update(ctx, m, "Title", "DeptID", "VehicleID", "Reason", "StartTime", "EndTime", "Passengers", "Destination", "ApprovalStatus", "Status")
}
