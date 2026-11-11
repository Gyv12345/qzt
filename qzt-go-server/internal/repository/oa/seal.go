package oa

import (
	"context"

	oamodel "qzt-go-server/internal/model/oa"
	"qzt-go-server/internal/repository"
)

// seal.go OA 印章 repository。

// SealRepo 印章台账 repo。
type SealRepo struct {
	repository.BaseRepo[oamodel.OaSeal]
}

func NewSealRepo() *SealRepo { return &SealRepo{} }

// PageList 分页列表(名称/类型/状态筛选)。
func (r *SealRepo) PageList(ctx context.Context, page, pageSize int, name, sealType, status string) ([]oamodel.OaSeal, int64, error) {
	var list []oamodel.OaSeal
	q := repository.DBFrom(ctx).Model(&oamodel.OaSeal{})
	if name != "" {
		q = q.Where("name LIKE ?", "%"+name+"%")
	}
	if sealType != "" {
		q = q.Where("type = ?", sealType)
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

// Update 列清单更新。
func (r *SealRepo) Update(ctx context.Context, m *oamodel.OaSeal) error {
	return r.BaseRepo.Update(ctx, m, "Name", "Type", "KeeperID", "Status", "Remark")
}

// SealApplicationRepo 用印申请 repo。
type SealApplicationRepo struct {
	repository.BaseRepo[oamodel.OaSealApplication]
}

func NewSealApplicationRepo() *SealApplicationRepo { return &SealApplicationRepo{} }

// PageList 分页列表。
func (r *SealApplicationRepo) PageList(ctx context.Context, page, pageSize int, applicationNo, title, approvalStatus string, applicantID uint) ([]oamodel.OaSealApplication, int64, error) {
	var list []oamodel.OaSealApplication
	q := repository.DBFrom(ctx).Model(&oamodel.OaSealApplication{})
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
func (r *SealApplicationRepo) Update(ctx context.Context, m *oamodel.OaSealApplication) error {
	return r.BaseRepo.Update(ctx, m, "Title", "DeptID", "SealID", "Reason", "DocumentName", "Copies", "SealDate", "ApprovalStatus")
}
