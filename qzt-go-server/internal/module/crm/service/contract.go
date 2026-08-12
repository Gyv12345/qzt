package service

import (
	"context"
	"errors"
	"time"

	"github.com/shopspring/decimal"

	"qzt-go-server/internal/model"
	crmmodel "qzt-go-server/internal/model/crm"
	"qzt-go-server/internal/pkg/datascope"
	"qzt-go-server/internal/pkg/diff"
	"qzt-go-server/internal/pkg/numbergen"
	"qzt-go-server/internal/repository"
	apprrepo "qzt-go-server/internal/repository/approval"
	crrepo "qzt-go-server/internal/repository/crm"
	"qzt-go-server/pkg/xtime"
)

// contractFieldDefs 合同可对比的业务字段(CrmContract 实际存在的字段)。
// 注意:金额字段是 TotalAmount(不是 Amount)。
var contractFieldDefs = []diff.FieldDef{
	{Name: "Name", Label: "合同名称"},
	{Name: "CustomerID", Label: "客户"},
	{Name: "OpportunityID", Label: "商机"},
	{Name: "TotalAmount", Label: "合同金额"},
	{Name: "Stage", Label: "阶段"},
	{Name: "OwnerID", Label: "负责人"},
	{Name: "SignedDate", Label: "签订日期"},
	{Name: "Content", Label: "合同内容"},
}

// contract.go 合同服务:CRUD + 跟进联动。回款累计逻辑见 payment.go。

// ContractService 合同服务。
type ContractService struct {
	repo       *crrepo.ContractRepo
	planRepo   *crrepo.PaymentPlanRepo
	recordRepo *crrepo.PaymentRecordRepo
	titleRepo  *crrepo.BusinessTitleRepo
}

func NewContractService() *ContractService {
	return &ContractService{
		repo:       crrepo.NewContractRepo(),
		planRepo:   crrepo.NewPaymentPlanRepo(),
		recordRepo: crrepo.NewPaymentRecordRepo(),
		titleRepo:  crrepo.NewBusinessTitleRepo(),
	}
}

// CreateContractRequest 创建合同请求。
type CreateContractRequest struct {
	Name          string             `json:"name" binding:"required"`
	ContractNo    string             `json:"contract_no"` // 留空则自动生成
	CustomerID    uint               `json:"customer_id" binding:"required"`
	OpportunityID *uint              `json:"opportunity_id"`
	TitleID       *uint              `json:"title_id"`
	TotalAmount   decimal.Decimal    `json:"total_amount" binding:"required"`
	SignedDate    xtime.NullDateTime `json:"signed_date"`
	StartDate     xtime.NullDateTime `json:"start_date"`
	EndDate       xtime.NullDateTime `json:"end_date"`
	OwnerID       *uint              `json:"owner_id"`
	Content       string             `json:"content"`
}

// Create 创建合同(默认 stage=DRAFT,received_amount=0)。
func (s *ContractService) Create(ctx context.Context, req *CreateContractRequest, currentUserID uint) (*crmmodel.CrmContract, error) {
	if req.TotalAmount.LessThanOrEqual(decimal.Zero) {
		return nil, errors.New("合同金额必须大于 0")
	}
	ownerID := req.OwnerID
	if ownerID == nil {
		ownerID = &currentUserID
	}
	// 自动生成合同编号(用户填了用手填的,留空才自动)
	contractNo := req.ContractNo
	if contractNo == "" {
		contractNo, _ = numbergen.Generate(ctx, "contract")
	}
	contract := &crmmodel.CrmContract{
		Name: req.Name, ContractNo: contractNo, CustomerID: req.CustomerID, OpportunityID: req.OpportunityID, TitleID: req.TitleID,
		TotalAmount: req.TotalAmount, ReceivedAmount: decimal.Zero, SignedDate: req.SignedDate,
		StartDate: req.StartDate, EndDate: req.EndDate, Stage: crmmodel.ContractStageDraft,
		OwnerID: ownerID, Content: req.Content,
	}
	if err := s.repo.Create(ctx, contract); err != nil {
		return nil, err
	}
	return contract, nil
}

// GetByID 合同详情。
func (s *ContractService) GetByID(ctx context.Context, id uint) (*crmmodel.CrmContract, error) {
	c, err := s.repo.GetByID(ctx, id)
	return c, notFoundOr(err, "合同不存在")
}

// UpdateContractRequest 更新合同请求(received_amount 不接受客户端传入,由回款维护)。
type UpdateContractRequest struct {
	Name          string             `json:"name" binding:"required"`
	CustomerID    uint               `json:"customer_id" binding:"required"`
	OpportunityID *uint              `json:"opportunity_id"`
	TitleID       *uint              `json:"title_id"`
	TotalAmount   decimal.Decimal    `json:"total_amount" binding:"required"`
	SignedDate    xtime.NullDateTime `json:"signed_date"`
	StartDate     xtime.NullDateTime `json:"start_date"`
	EndDate       xtime.NullDateTime `json:"end_date"`
	Stage         string             `json:"stage"`
	OwnerID       *uint              `json:"owner_id"`
	Content       string             `json:"content"`
}

// Update 更新合同。
func (s *ContractService) Update(ctx context.Context, id uint, req *UpdateContractRequest, operatorID uint) error {
	if req.TotalAmount.LessThanOrEqual(decimal.Zero) {
		return errors.New("合同金额必须大于 0")
	}
	c, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return notFoundOr(err, "合同不存在")
	}
	// 复制旧值快照(用于 diff)
	oldSnapshot := *c
	c.Name = req.Name
	c.CustomerID = req.CustomerID
	c.OpportunityID = req.OpportunityID
	c.TitleID = req.TitleID
	c.TotalAmount = req.TotalAmount
	c.SignedDate = req.SignedDate
	c.StartDate = req.StartDate
	c.EndDate = req.EndDate

	if req.Stage != "" {
		c.Stage = req.Stage
	}
	c.OwnerID = req.OwnerID
	c.Content = req.Content
	// diff 字段变更
	changes := diff.DiffStructs(&oldSnapshot, c, contractFieldDefs)

	return repository.Transaction(ctx, func(ctx context.Context) error {
		if err := s.repo.Update(ctx, c); err != nil {
			return err
		}
		recordChanges(ctx, model.BizTypeContract, id, operatorID, changes)
		return nil
	})
}

// Delete 删除合同。
func (s *ContractService) Delete(ctx context.Context, id uint) error {
	if _, err := s.repo.GetByID(ctx, id); err != nil {
		return notFoundOr(err, "合同不存在")
	}
	if apprrepo.HasInstance(ctx, "CONTRACT", id) {
		return errors.New("该合同已进入审批流程,不能删除")
	}
	return s.repo.Delete(ctx, id)
}

// List 合同列表(分页 + keyword 名称模糊 + customerID + stage 过滤)。
func (s *ContractService) List(ctx context.Context, page, pageSize int, keyword string, customerID uint, stage string) ([]crmmodel.CrmContract, int64, error) {
	q := &repository.QueryOptions{Order: []string{"id DESC"}}
	where := map[string]any{}
	if keyword != "" {
		q.Search = map[string]string{"name": keyword}
	}
	if customerID > 0 {
		where["customer_id"] = customerID
	}
	if stage != "" {
		where["stage"] = stage
	}
	if len(where) > 0 {
		q.Where = where
	}
	if cond := datascope.BuildCond(ctx, "owner_id"); cond != nil {
		q.Conds = append(q.Conds, *cond)
	}
	return s.repo.PageList(ctx, page, pageSize, q)
}

// UpdateFollow 更新合同的跟进人/跟进时间(跟进记录创建后调用)。
func (s *ContractService) UpdateFollow(ctx context.Context, id, followerID uint, followTime time.Time) error {
	c, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil // 关联可选,静默忽略
	}
	c.FollowerID = &followerID
	c.FollowTime = xtime.NewNullDateTimeFromTime(followTime)
	return s.repo.Update(ctx, c)
}
