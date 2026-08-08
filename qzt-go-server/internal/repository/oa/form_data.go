package oa

import (
	"context"

	oamodel "qzt-go-server/internal/model/oa"
	"qzt-go-server/internal/repository"
)

// form_data.go OA 表单数据 repository。

type FormDataRepo struct {
	repository.BaseRepo[oamodel.OaFormData]
}

func NewFormDataRepo() *FormDataRepo { return &FormDataRepo{} }

func (r *FormDataRepo) PageList(ctx context.Context, page, pageSize int, templateID, submitterID uint, templateKey, approvalStatus string) ([]oamodel.OaFormData, int64, error) {
	var list []oamodel.OaFormData
	q := repository.DBFrom(ctx).Model(&oamodel.OaFormData{})
	if templateID > 0 {
		q = q.Where("template_id = ?", templateID)
	}
	if submitterID > 0 {
		q = q.Where("submitter_id = ?", submitterID)
	}
	if templateKey != "" {
		q = q.Where("template_key = ?", templateKey)
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

func (r *FormDataRepo) Update(ctx context.Context, m *oamodel.OaFormData) error {
	return r.BaseRepo.Update(ctx, m, "FieldValues", "ApprovalStatus")
}
