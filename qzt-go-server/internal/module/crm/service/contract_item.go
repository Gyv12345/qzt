package service

import (
	"context"
	"fmt"
	"strings"

	"github.com/shopspring/decimal"

	crmmodel "qzt-go-server/internal/model/crm"
	"qzt-go-server/internal/repository"
	crrepo "qzt-go-server/internal/repository/crm"
)

// contract_item.go 合同产品明细服务。
// 管理合同关联的产品明细行(CRUD),并为合同模板渲染提供 ${productTable} 变量。

// ContractItemService 合同产品明细服务。
type ContractItemService struct {
	repo *crrepo.ContractItemRepo
}

func NewContractItemService() *ContractItemService {
	return &ContractItemService{repo: crrepo.NewContractItemRepo()}
}

// CreateContractItemRequest 创建明细请求。
type CreateContractItemRequest struct {
	ProductID   *uint           `json:"product_id"`
	ProductName string          `json:"product_name" binding:"required"`
	Quantity    decimal.Decimal `json:"quantity" binding:"required"`
	Unit        string          `json:"unit"`
	UnitPrice   decimal.Decimal `json:"unit_price"`
	Remark      string          `json:"remark"`
}

func (s *ContractItemService) Create(ctx context.Context, contractID uint, req *CreateContractItemRequest) (*crmmodel.CrmContractItem, error) {
	item := &crmmodel.CrmContractItem{
		ContractID:  contractID,
		ProductID:   req.ProductID,
		ProductName: req.ProductName,
		Quantity:    req.Quantity,
		Unit:        req.Unit,
		UnitPrice:   req.UnitPrice,
		Amount:      req.UnitPrice.Mul(req.Quantity),
		Remark:      req.Remark,
	}
	if err := s.repo.Create(ctx, item); err != nil {
		return nil, err
	}
	return item, nil
}

// UpdateContractItemRequest 更新明细请求。
type UpdateContractItemRequest struct {
	ProductName *string          `json:"product_name"`
	Quantity    *decimal.Decimal `json:"quantity"`
	Unit        *string          `json:"unit"`
	UnitPrice   *decimal.Decimal `json:"unit_price"`
	Remark      *string          `json:"remark"`
}

func (s *ContractItemService) Update(ctx context.Context, id uint, req *UpdateContractItemRequest) error {
	item, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return repository.NotFoundOr(err, "明细不存在")
	}
	if req.ProductName != nil {
		item.ProductName = *req.ProductName
	}
	if req.Quantity != nil {
		item.Quantity = *req.Quantity
	}
	if req.Unit != nil {
		item.Unit = *req.Unit
	}
	if req.UnitPrice != nil {
		item.UnitPrice = *req.UnitPrice
	}
	item.Amount = item.UnitPrice.Mul(item.Quantity)
	if req.Remark != nil {
		item.Remark = *req.Remark
	}
	return s.repo.Update(ctx, item)
}

func (s *ContractItemService) Delete(ctx context.Context, id uint) error {
	if _, err := s.repo.GetByID(ctx, id); err != nil {
		return repository.NotFoundOr(err, "明细不存在")
	}
	return s.repo.Delete(ctx, id)
}

func (s *ContractItemService) ListByContract(ctx context.Context, contractID uint) ([]crmmodel.CrmContractItem, error) {
	return s.repo.ListByContract(ctx, contractID)
}

// BuildProductTable 查询合同产品明细,生成 Markdown 表格字符串(供 ${productTable} 变量)。
func (s *ContractItemService) BuildProductTable(ctx context.Context, contractID uint) string {
	items, err := s.repo.ListByContract(ctx, contractID)
	if err != nil || len(items) == 0 {
		return ""
	}

	var sb strings.Builder
	sb.WriteString("| 产品名称 | 数量 | 单位 | 单价 | 小计 |\n")
	sb.WriteString("| --- | ---: | --- | ---: | ---: |\n")
	total := decimal.Zero
	for _, item := range items {
		sb.WriteString(fmt.Sprintf("| %s | %s | %s | ¥%s | ¥%s |\n",
			item.ProductName,
			item.Quantity.String(),
			item.Unit,
			item.UnitPrice.String(),
			item.Amount.String(),
		))
		total = total.Add(item.Amount)
	}
	sb.WriteString(fmt.Sprintf("| | | | **合计** | **¥%s** |", total.String()))
	return sb.String()
}
