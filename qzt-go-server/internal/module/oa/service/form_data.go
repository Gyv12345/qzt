package service

import (
	"context"
	"errors"

	oamodel "qzt-go-server/internal/model/oa"
	"qzt-go-server/internal/pkg/numbergen"
	"qzt-go-server/internal/repository"
	oarepo "qzt-go-server/internal/repository/oa"
)

// form_data.go 自定义表单数据服务(用户填写提交)。

type FormDataService struct {
	dataRepo     *oarepo.FormDataRepo
	templateRepo *oarepo.FormTemplateRepo
}

func NewFormDataService() *FormDataService {
	return &FormDataService{
		dataRepo:     oarepo.NewFormDataRepo(),
		templateRepo: oarepo.NewFormTemplateRepo(),
	}
}

type CreateFormDataRequest struct {
	TemplateID  uint   `json:"template_id" binding:"required"`
	FieldValues string `json:"field_values" binding:"required"`
}

func (s *FormDataService) Create(ctx context.Context, req *CreateFormDataRequest, userID uint) (*oamodel.OaFormData, error) {
	// 查模板
	tpl, err := s.templateRepo.GetByID(ctx, req.TemplateID)
	if err != nil {
		return nil, repository.NotFoundOr(err, "表单模板不存在")
	}
	if tpl.Status != 1 {
		return nil, errors.New("该表单已停用")
	}

	dataNo, _ := numbergen.Generate(ctx, "form")

	data := &oamodel.OaFormData{
		DataNo:         dataNo,
		TemplateID:     req.TemplateID,
		TemplateKey:    tpl.FormKey,
		TemplateName:   tpl.Name,
		SubmitterID:    userID,
		FieldValues:    req.FieldValues,
		ApprovalStatus: oamodel.ApprovalStatusNone,
	}
	if err := s.dataRepo.Create(ctx, data); err != nil {
		return nil, err
	}
	return data, nil
}

func (s *FormDataService) List(ctx context.Context, page, pageSize int, templateID, submitterID uint, templateKey, approvalStatus string) ([]oamodel.OaFormData, int64, error) {
	return s.dataRepo.PageList(ctx, page, pageSize, templateID, submitterID, templateKey, approvalStatus)
}

func (s *FormDataService) GetByID(ctx context.Context, id uint) (*oamodel.OaFormData, error) {
	data, err := s.dataRepo.GetByID(ctx, id)
	if err != nil {
		return nil, repository.NotFoundOr(err, "表单数据不存在")
	}
	return data, nil
}

type UpdateFormDataRequest struct {
	FieldValues string `json:"field_values" binding:"required"`
}

func (s *FormDataService) Update(ctx context.Context, id uint, req *UpdateFormDataRequest) error {
	data, err := s.dataRepo.GetByID(ctx, id)
	if err != nil {
		return repository.NotFoundOr(err, "表单数据不存在")
	}
	if !oamodel.CanEditApproval(data.ApprovalStatus) {
		return errors.New("仅未提交或已驳回的表单可编辑")
	}
	data.FieldValues = req.FieldValues
	return s.dataRepo.Update(ctx, data)
}

func (s *FormDataService) Delete(ctx context.Context, id uint) error {
	data, err := s.dataRepo.GetByID(ctx, id)
	if err != nil {
		return repository.NotFoundOr(err, "表单数据不存在")
	}
	if data.ApprovalStatus != oamodel.ApprovalStatusNone {
		return errors.New("仅未提交审批的表单可删除")
	}
	return s.dataRepo.Delete(ctx, id)
}
