package oa

import (
	"context"

	oamodel "qzt-go-server/internal/model/oa"
	"qzt-go-server/internal/repository"
)

// form_template.go OA 表单模板 repository。

type FormTemplateRepo struct {
	repository.BaseRepo[oamodel.OaFormTemplate]
}

func NewFormTemplateRepo() *FormTemplateRepo { return &FormTemplateRepo{} }

func (r *FormTemplateRepo) PageList(ctx context.Context, page, pageSize int, name, category string, status int8) ([]oamodel.OaFormTemplate, int64, error) {
	var list []oamodel.OaFormTemplate
	q := repository.DBFrom(ctx).Model(&oamodel.OaFormTemplate{})
	if name != "" {
		q = q.Where("name LIKE ?", "%"+name+"%")
	}
	if category != "" {
		q = q.Where("category = ?", category)
	}
	if status >= 0 {
		q = q.Where("status = ?", status)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	err := q.Order("sort ASC, id DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&list).Error
	return list, total, err
}

// ListEnabled 查全部启用的模板(用户端展示用)。
func (r *FormTemplateRepo) ListEnabled(ctx context.Context) ([]oamodel.OaFormTemplate, error) {
	var list []oamodel.OaFormTemplate
	err := repository.DBFrom(ctx).Where("status = 1").Order("sort ASC, id DESC").Find(&list).Error
	return list, err
}

func (r *FormTemplateRepo) Update(ctx context.Context, m *oamodel.OaFormTemplate) error {
	return r.BaseRepo.Update(ctx, m, "FormKey", "Name", "Icon", "Description", "FieldsConfig", "Category", "Status", "Sort")
}
