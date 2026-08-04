package mcp

import (
	"context"

	crmmodel "qzt-go-server/internal/model/crm"
	crmsvc "qzt-go-server/internal/module/crm/service"
)

// crm_service.go MCP tool 调用的 CRM service 封装。
// 复用 crm service 的方法,简化参数传递。

// ── Customer ──

type customerServiceWrapper struct {
	svc *crmsvc.CustomerService
}

func newCustomerService() *customerServiceWrapper {
	return &customerServiceWrapper{svc: crmsvc.NewCustomerService()}
}

func (w *customerServiceWrapper) List(ctx context.Context, page, pageSize int, keyword string) ([]crmmodel.CrmCustomer, int64, error) {
	return w.svc.List(ctx, page, pageSize, keyword, "", "", "", "")
}

func (w *customerServiceWrapper) GetByID(ctx context.Context, id uint) (*crmmodel.CrmCustomer, error) {
	c, _, err := w.svc.GetByID(ctx, id)
	return c, err
}

type customerCreateReq struct {
	Name     string
	Level    string
	Source   string
	Industry string
}

func (w *customerServiceWrapper) Create(ctx context.Context, req *customerCreateReq, userID uint) (*crmmodel.CrmCustomer, error) {
	return w.svc.Create(ctx, &crmsvc.CreateCustomerRequest{
		Name:     req.Name,
		Level:    req.Level,
		Source:   req.Source,
		Industry: req.Industry,
	}, userID)
}
