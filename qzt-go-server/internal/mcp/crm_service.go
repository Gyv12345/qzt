package mcp

import (
	"context"

	"github.com/shopspring/decimal"

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
	return w.svc.List(ctx, page, pageSize, keyword, "", "", "", "", "", 0)
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

// ── Opportunity ──

type opportunityServiceWrapper struct {
	svc *crmsvc.OpportunityService
}

func newOpportunityService() *opportunityServiceWrapper {
	return &opportunityServiceWrapper{svc: crmsvc.NewOpportunityService()}
}

func (w *opportunityServiceWrapper) List(ctx context.Context, page, pageSize int, keyword, stage string) ([]crmmodel.CrmOpportunity, int64, error) {
	return w.svc.List(ctx, page, pageSize, keyword, 0, stage)
}

func (w *opportunityServiceWrapper) GetByID(ctx context.Context, id uint) (*crmmodel.CrmOpportunity, error) {
	return w.svc.GetByID(ctx, id)
}

func (w *opportunityServiceWrapper) Create(ctx context.Context, req *crmsvc.CreateOpportunityRequest, userID uint) (*crmmodel.CrmOpportunity, error) {
	return w.svc.Create(ctx, req, userID)
}

// ── Contract ──

type contractServiceWrapper struct {
	svc *crmsvc.ContractService
}

func newContractService() *contractServiceWrapper {
	return &contractServiceWrapper{svc: crmsvc.NewContractService()}
}

func (w *contractServiceWrapper) List(ctx context.Context, page, pageSize int, keyword, stage string) ([]crmmodel.CrmContract, int64, error) {
	return w.svc.List(ctx, page, pageSize, keyword, 0, stage)
}

func (w *contractServiceWrapper) GetByID(ctx context.Context, id uint) (*crmmodel.CrmContract, error) {
	return w.svc.GetByID(ctx, id)
}

// ── Product ──

type productServiceWrapper struct {
	svc *crmsvc.ProductService
}

func newProductService() *productServiceWrapper {
	return &productServiceWrapper{svc: crmsvc.NewProductService()}
}

func (w *productServiceWrapper) List(ctx context.Context, page, pageSize int, keyword, category string) ([]crmmodel.CrmProduct, int64, error) {
	return w.svc.List(ctx, page, pageSize, keyword, category, -1)
}

func (w *productServiceWrapper) GetByID(ctx context.Context, id uint) (*crmmodel.CrmProduct, error) {
	return w.svc.GetByID(ctx, id)
}

// ── Contact ──

type contactServiceWrapper struct {
	svc *crmsvc.ContactService
}

func newContactService() *contactServiceWrapper {
	return &contactServiceWrapper{svc: crmsvc.NewContactService()}
}

func (w *contactServiceWrapper) ListByCustomer(ctx context.Context, customerID uint) ([]crmmodel.CrmCustomerContact, error) {
	return w.svc.ListByCustomer(ctx, customerID)
}

// ── Payment ──

type paymentServiceWrapper struct {
	svc *crmsvc.PaymentService
}

func newPaymentService() *paymentServiceWrapper {
	return &paymentServiceWrapper{svc: crmsvc.NewPaymentService()}
}

func (w *paymentServiceWrapper) ListPlansByContract(ctx context.Context, contractID uint) ([]crmmodel.CrmContractPaymentPlan, error) {
	return w.svc.ListPlansByContract(ctx, contractID)
}

func (w *paymentServiceWrapper) ListRecordsByContract(ctx context.Context, contractID uint) ([]crmmodel.CrmContractPaymentRecord, error) {
	return w.svc.ListRecordsByContract(ctx, contractID)
}

func (w *paymentServiceWrapper) ContractSummary(ctx context.Context, contractID uint) (*crmsvc.ContractPaymentSummary, error) {
	return w.svc.ContractPaymentSummary(ctx, contractID)
}

// ── Followup ──

type followupServiceWrapper struct {
	svc *crmsvc.FollowService
}

func newFollowupService() *followupServiceWrapper {
	return &followupServiceWrapper{svc: crmsvc.NewFollowService()}
}

func (w *followupServiceWrapper) Timeline(ctx context.Context, field string, value uint) ([]crmmodel.FollowUpRecord, error) {
	return w.svc.Timeline(ctx, field, value)
}

// 避免 unused(部分 wrapper 方法预留给后续工具使用)
var _ = decimal.NewFromInt
