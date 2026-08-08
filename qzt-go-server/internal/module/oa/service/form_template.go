package service

import (
	"context"

	oamodel "qzt-go-server/internal/model/oa"
	oarepo "qzt-go-server/internal/repository/oa"
)

// form_template.go 自定义表单模板服务(管理员用)。

type FormTemplateService struct {
	repo *oarepo.FormTemplateRepo
}

func NewFormTemplateService() *FormTemplateService {
	return &FormTemplateService{repo: oarepo.NewFormTemplateRepo()}
}

type CreateFormTemplateRequest struct {
	FormKey      string `json:"form_key" binding:"required"`
	Name         string `json:"name" binding:"required"`
	Icon         string `json:"icon"`
	Description  string `json:"description"`
	FieldsConfig string `json:"fields_config" binding:"required"`
	Category     string `json:"category"`
	Status       int8   `json:"status"`
	Sort         int    `json:"sort"`
}

func (s *FormTemplateService) Create(ctx context.Context, req *CreateFormTemplateRequest) (*oamodel.OaFormTemplate, error) {
	if req.Category == "" {
		req.Category = "non-business"
	}
	if req.Status == 0 {
		req.Status = 1
	}
	tpl := &oamodel.OaFormTemplate{
		FormKey:      req.FormKey,
		Name:         req.Name,
		Icon:         req.Icon,
		Description:  req.Description,
		FieldsConfig: req.FieldsConfig,
		Category:     req.Category,
		Status:       req.Status,
		Sort:         req.Sort,
	}
	if err := s.repo.Create(ctx, tpl); err != nil {
		return nil, err
	}
	return tpl, nil
}

func (s *FormTemplateService) List(ctx context.Context, page, pageSize int, name, category string, status int8) ([]oamodel.OaFormTemplate, int64, error) {
	return s.repo.PageList(ctx, page, pageSize, name, category, status)
}

// ListEnabled 查全部启用模板(用户端)。
func (s *FormTemplateService) ListEnabled(ctx context.Context) ([]oamodel.OaFormTemplate, error) {
	return s.repo.ListEnabled(ctx)
}

func (s *FormTemplateService) GetByID(ctx context.Context, id uint) (*oamodel.OaFormTemplate, error) {
	tpl, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, notFoundOr(err, "表单模板不存在")
	}
	return tpl, nil
}

// GetByKey 按 form_key 查询。
func (s *FormTemplateService) GetByKey(ctx context.Context, key string) (*oamodel.OaFormTemplate, error) {
	tpls, err := s.repo.ListEnabled(ctx)
	if err != nil {
		return nil, err
	}
	for _, t := range tpls {
		if t.FormKey == key {
			return &t, nil
		}
	}
	return nil, notFoundOr(nil, "表单模板不存在")
}

type UpdateFormTemplateRequest struct {
	FormKey      string `json:"form_key"`
	Name         string `json:"name"`
	Icon         string `json:"icon"`
	Description  string `json:"description"`
	FieldsConfig string `json:"fields_config"`
	Category     string `json:"category"`
	Status       int8   `json:"status"`
	Sort         int    `json:"sort"`
}

func (s *FormTemplateService) Update(ctx context.Context, id uint, req *UpdateFormTemplateRequest) error {
	tpl, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return notFoundOr(err, "表单模板不存在")
	}
	tpl.FormKey = req.FormKey
	tpl.Name = req.Name
	tpl.Icon = req.Icon
	tpl.Description = req.Description
	tpl.FieldsConfig = req.FieldsConfig
	tpl.Category = req.Category
	tpl.Status = req.Status
	tpl.Sort = req.Sort
	return s.repo.Update(ctx, tpl)
}

func (s *FormTemplateService) Delete(ctx context.Context, id uint) error {
	if _, err := s.repo.GetByID(ctx, id); err != nil {
		return notFoundOr(err, "表单模板不存在")
	}
	return s.repo.Delete(ctx, id)
}

// ToggleStatus 启用/停用。
func (s *FormTemplateService) ToggleStatus(ctx context.Context, id uint) error {
	tpl, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return notFoundOr(err, "表单模板不存在")
	}
	if tpl.Status == 1 {
		tpl.Status = 0
	} else {
		tpl.Status = 1
	}
	return s.repo.Update(ctx, tpl)
}
