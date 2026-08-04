package service

import (
	"context"

	"qzt-go-server/internal/model/base"
	crmmodel "qzt-go-server/internal/model/crm"
	crrepo "qzt-go-server/internal/repository/crm"
)

// contact.go 客户联系人服务。

type ContactService struct {
	repo *crrepo.CustomerContactRepo
}

func NewContactService() *ContactService {
	return &ContactService{repo: crrepo.NewCustomerContactRepo()}
}

// CreateContactRequest 创建联系人请求。
type CreateContactRequest struct {
	CustomerID         uint   `json:"customer_id" binding:"required"`
	Name               string `json:"name" binding:"required"`
	Phone              string `json:"phone"`
	Email              string `json:"email"`
	Position           string `json:"position"`
	Department         string `json:"department"`
	IsKeyDecisionMaker *int8  `json:"is_key_decision_maker"`
	Remark             string `json:"remark"`
}

func (s *ContactService) Create(ctx context.Context, req *CreateContactRequest) error {
	contact := &crmmodel.CrmCustomerContact{
		CustomerID: req.CustomerID, Name: req.Name, Phone: req.Phone, Email: req.Email,
		Position: req.Position, Department: req.Department, Remark: req.Remark, Status: base.StatusEnabled,
	}
	if req.IsKeyDecisionMaker != nil {
		contact.IsKeyDecisionMaker = *req.IsKeyDecisionMaker
	}
	return s.repo.Create(ctx, contact)
}

func (s *ContactService) GetByID(ctx context.Context, id uint) (*crmmodel.CrmCustomerContact, error) {
	c, err := s.repo.GetByID(ctx, id)
	return c, notFoundOr(err, "联系人不存在")
}

// UpdateContactRequest 更新联系人请求。
type UpdateContactRequest struct {
	Name               string `json:"name" binding:"required"`
	Phone              string `json:"phone"`
	Email              string `json:"email"`
	Position           string `json:"position"`
	Department         string `json:"department"`
	IsKeyDecisionMaker *int8  `json:"is_key_decision_maker"`
	Status             *int8  `json:"status"`
	Remark             string `json:"remark"`
}

func (s *ContactService) Update(ctx context.Context, id uint, req *UpdateContactRequest) error {
	contact, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return notFoundOr(err, "联系人不存在")
	}
	contact.Name = req.Name
	contact.Phone = req.Phone
	contact.Email = req.Email
	contact.Position = req.Position
	contact.Department = req.Department
	if req.IsKeyDecisionMaker != nil {
		contact.IsKeyDecisionMaker = *req.IsKeyDecisionMaker
	}
	if req.Status != nil {
		contact.Status = *req.Status
	}
	contact.Remark = req.Remark
	return s.repo.Update(ctx, contact)
}

func (s *ContactService) Delete(ctx context.Context, id uint) error {
	return s.repo.Delete(ctx, id)
}

func (s *ContactService) ListByCustomer(ctx context.Context, customerID uint) ([]crmmodel.CrmCustomerContact, error) {
	return s.repo.ListByCustomer(ctx, customerID)
}