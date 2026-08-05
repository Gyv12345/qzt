package service

import (
	"context"

	psimodel "qzt-go-server/internal/model/psi"
	"qzt-go-server/internal/pkg/numbergen"
	"qzt-go-server/internal/repository"
	psirepo "qzt-go-server/internal/repository/psi"
)

// supplier.go 供应商服务:CRUD + 下拉。

// SupplierService 供应商服务。
type SupplierService struct {
	repo *psirepo.SupplierRepo
}

func NewSupplierService() *SupplierService {
	return &SupplierService{repo: psirepo.NewSupplierRepo()}
}

// CreateSupplierRequest 创建供应商请求。
type CreateSupplierRequest struct {
	Name          string `json:"name" binding:"required"`
	SupplierNo    string `json:"supplier_no"`
	ContactPerson string `json:"contact_person"`
	Phone         string `json:"phone"`
	Email         string `json:"email"`
	Address       string `json:"address"`
	BankName      string `json:"bank_name"`
	BankAccount   string `json:"bank_account"`
	Status        *int8  `json:"status"`
	Remark        string `json:"remark"`
}

// Create 创建供应商(默认 status=启用)。
func (s *SupplierService) Create(ctx context.Context, req *CreateSupplierRequest) (*psimodel.PsiSupplier, error) {
	supplierNo := req.SupplierNo
	if supplierNo == "" {
		supplierNo, _ = numbergen.Generate(ctx, "supplier")
	}
	sup := &psimodel.PsiSupplier{
		Name: req.Name, SupplierNo: supplierNo, ContactPerson: req.ContactPerson,
		Phone: req.Phone, Email: req.Email, Address: req.Address,
		BankName: req.BankName, BankAccount: req.BankAccount, Status: psimodel.StatusEnabled, Remark: req.Remark,
	}
	if req.Status != nil {
		sup.Status = *req.Status
	}
	if err := s.repo.Create(ctx, sup); err != nil {
		return nil, err
	}
	return sup, nil
}

// GetByID 供应商详情。
func (s *SupplierService) GetByID(ctx context.Context, id uint) (*psimodel.PsiSupplier, error) {
	sup, err := s.repo.GetByID(ctx, id)
	return sup, notFoundOr(err, "供应商不存在")
}

// UpdateSupplierRequest 更新供应商请求。
type UpdateSupplierRequest struct {
	Name          string `json:"name" binding:"required"`
	SupplierNo    string `json:"supplier_no"`
	ContactPerson string `json:"contact_person"`
	Phone         string `json:"phone"`
	Email         string `json:"email"`
	Address       string `json:"address"`
	BankName      string `json:"bank_name"`
	BankAccount   string `json:"bank_account"`
	Status        *int8  `json:"status"`
	Remark        string `json:"remark"`
}

// Update 更新供应商。
func (s *SupplierService) Update(ctx context.Context, id uint, req *UpdateSupplierRequest) error {
	sup, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return notFoundOr(err, "供应商不存在")
	}
	sup.Name = req.Name
	sup.SupplierNo = req.SupplierNo
	sup.ContactPerson = req.ContactPerson
	sup.Phone = req.Phone
	sup.Email = req.Email
	sup.Address = req.Address
	sup.BankName = req.BankName
	sup.BankAccount = req.BankAccount
	if req.Status != nil {
		sup.Status = *req.Status
	}
	sup.Remark = req.Remark
	return s.repo.Update(ctx, sup)
}

// Delete 删除供应商(软删除)。
func (s *SupplierService) Delete(ctx context.Context, id uint) error {
	if _, err := s.repo.GetByID(ctx, id); err != nil {
		return notFoundOr(err, "供应商不存在")
	}
	return s.repo.Delete(ctx, id)
}

// List 供应商列表(分页 + keyword 名称模糊 + status 过滤)。
func (s *SupplierService) List(ctx context.Context, page, pageSize int, keyword string, status int8) ([]psimodel.PsiSupplier, int64, error) {
	q := &repository.QueryOptions{Order: []string{"id DESC"}}
	where := map[string]interface{}{}
	if keyword != "" {
		q.Search = map[string]string{"name": keyword, "supplier_no": keyword}
	}
	if status > 0 {
		where["status"] = status
	}
	if len(where) > 0 {
		q.Where = where
	}
	return s.repo.PageList(ctx, page, pageSize, q)
}

// ListEnabled 列出启用的供应商(下拉用)。
func (s *SupplierService) ListEnabled(ctx context.Context) ([]psimodel.PsiSupplier, error) {
	return s.repo.ListEnabled(ctx)
}
