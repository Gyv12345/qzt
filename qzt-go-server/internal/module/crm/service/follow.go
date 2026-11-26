package service

import (
	"context"
	"errors"
	"time"

	crmmodel "qzt-go-server/internal/model/crm"
	"qzt-go-server/internal/pkg/datascope"
	"qzt-go-server/internal/pkg/numbergen"
	"qzt-go-server/internal/repository"
	crrepo "qzt-go-server/internal/repository/crm"
	"qzt-go-server/pkg/xlogger"
	"qzt-go-server/pkg/xtime"
)

// follow.go 跟进服务:记录 + 计划,联动更新客户/商机的跟进人/跟进时间。
// 联动更新采用 REQUIRES_NEW 语义:非事务、失败仅记日志不回滚主流程。

// FollowService 跟进服务。
type FollowService struct {
	recordRepo     *crrepo.FollowUpRecordRepo
	planRepo       *crrepo.FollowUpPlanRepo
	leadSvc        *LeadService
	customerSvc    *CustomerService
	opportunitySvc *OpportunityService
	contractSvc    *ContractService
	contactSvc     *ContactService
}

func NewFollowService() *FollowService {
	return &FollowService{
		recordRepo:     crrepo.NewFollowUpRecordRepo(),
		planRepo:       crrepo.NewFollowUpPlanRepo(),
		leadSvc:        NewLeadService(),
		customerSvc:    NewCustomerService(),
		opportunitySvc: NewOpportunityService(),
		contractSvc:    NewContractService(),
		contactSvc:     NewContactService(),
	}
}

// validateResourceAccess 校验 body 中全部关联资源,防止通过他人资源ID写入跟进。
func (s *FollowService) validateResourceAccess(ctx context.Context, leadID, customerID, opportunityID, contactID, contractID *uint) error {
	ensure := func(ownerID *uint) error {
		if ownerID != nil && !datascope.CanAccessOwner(ctx, *ownerID) {
			return errors.New("无权为关联资源添加跟进")
		}
		return nil
	}
	if leadID != nil {
		lead, _, err := s.leadSvc.GetByID(ctx, *leadID)
		if err != nil {
			return err
		}
		if err := ensure(lead.OwnerID); err != nil {
			return err
		}
	}
	if customerID != nil {
		customer, _, err := s.customerSvc.GetByID(ctx, *customerID)
		if err != nil {
			return err
		}
		if err := ensure(customer.OwnerID); err != nil {
			return err
		}
	}
	if opportunityID != nil {
		opp, err := s.opportunitySvc.repo.GetByID(ctx, *opportunityID)
		if err != nil {
			return repository.NotFoundOr(err, "商机不存在")
		}
		if err := ensure(opp.OwnerID); err != nil {
			return err
		}
	}
	if contactID != nil {
		contact, err := s.contactSvc.GetByID(ctx, *contactID)
		if err != nil {
			return err
		}
		customer, _, err := s.customerSvc.GetByID(ctx, contact.CustomerID)
		if err != nil {
			return err
		}
		if err := ensure(customer.OwnerID); err != nil {
			return err
		}
	}
	if contractID != nil {
		contract, err := s.contractSvc.GetByID(ctx, *contractID)
		if err != nil {
			return err
		}
		if err := ensure(contract.OwnerID); err != nil {
			return err
		}
	}
	return nil
}

// ── 跟进记录 ──

// CreateRecordRequest 创建跟进记录请求。
type CreateRecordRequest struct {
	FollowNo      string         `json:"follow_no"` // 留空则自动生成
	Type          string         `json:"type" binding:"required"`
	Content       string         `json:"content" binding:"required"`
	FollowTime    xtime.DateTime `json:"follow_time" binding:"required"`
	OwnerID       uint           `json:"owner_id"`
	LeadID        *uint          `json:"lead_id"`
	CustomerID    *uint          `json:"customer_id"`
	OpportunityID *uint          `json:"opportunity_id"`
	ContactID     *uint          `json:"contact_id"`
	ContractID    *uint          `json:"contract_id"`
}

// CreateRecord 创建跟进记录;若关联客户,非事务地更新客户的跟进人/跟进时间(失败仅记日志)。
func (s *FollowService) CreateRecord(ctx context.Context, req *CreateRecordRequest) (*crmmodel.FollowUpRecord, error) {
	if req.LeadID == nil && req.CustomerID == nil && req.OpportunityID == nil && req.ContactID == nil && req.ContractID == nil {
		return nil, errors.New("跟进记录至少关联一个资源(线索/客户/商机/联系人/合同)")
	}
	if err := s.validateResourceAccess(ctx, req.LeadID, req.CustomerID, req.OpportunityID, req.ContactID, req.ContractID); err != nil {
		return nil, err
	}
	followNo := req.FollowNo
	if followNo == "" {
		followNo, _ = numbergen.Generate(ctx, "follow")
	}
	rec := &crmmodel.FollowUpRecord{
		FollowNo: followNo,
		Type:     req.Type, Content: req.Content, FollowTime: req.FollowTime, OwnerID: req.OwnerID,
		LeadID: req.LeadID, CustomerID: req.CustomerID, OpportunityID: req.OpportunityID,
		ContactID: req.ContactID, ContractID: req.ContractID,
	}
	if err := s.recordRepo.Create(ctx, rec); err != nil {
		return nil, err
	}
	// 联动更新跟进人/时间(REQUIRES_NEW 语义:失败仅记日志不回滚)
	s.syncLinkedFollow(ctx, req.OwnerID, req.FollowTime.Time(), req.LeadID, req.CustomerID, req.OpportunityID, req.ContractID)
	return rec, nil
}

// syncLinkedFollow 统一创建记录与计划转换两条路径的最近跟进时间联动。
func (s *FollowService) syncLinkedFollow(ctx context.Context, ownerID uint, followTime time.Time, leadID, customerID, opportunityID, contractID *uint) {
	if leadID != nil {
		if err := s.leadSvc.UpdateFollow(ctx, *leadID, ownerID, followTime); err != nil {
			xlogger.ErrorfCtx(ctx, "更新线索跟进信息失败 leadID=%d: %v", *leadID, err)
		}
	}
	if customerID != nil {
		if err := s.customerSvc.UpdateFollow(ctx, *customerID, ownerID, followTime); err != nil {
			xlogger.ErrorfCtx(ctx, "更新客户跟进信息失败 customerID=%d: %v", *customerID, err)
		}
	}
	if opportunityID != nil {
		if err := s.opportunitySvc.UpdateFollow(ctx, *opportunityID, ownerID, followTime); err != nil {
			xlogger.ErrorfCtx(ctx, "更新商机跟进信息失败 opportunityID=%d: %v", *opportunityID, err)
		}
	}
	if contractID != nil {
		if err := s.contractSvc.UpdateFollow(ctx, *contractID, ownerID, followTime); err != nil {
			xlogger.ErrorfCtx(ctx, "更新合同跟进信息失败 contractID=%d: %v", *contractID, err)
		}
	}
}

// GetRecord 跟进记录详情。
func (s *FollowService) GetRecord(ctx context.Context, id uint) (*crmmodel.FollowUpRecord, error) {
	rec, err := s.recordRepo.GetByID(ctx, id)
	return rec, repository.NotFoundOr(err, "跟进记录不存在")
}

// UpdateRecordRequest 更新跟进记录请求。
type UpdateRecordRequest struct {
	Type       string         `json:"type" binding:"required"`
	Content    string         `json:"content" binding:"required"`
	FollowTime xtime.DateTime `json:"follow_time" binding:"required"`
}

// UpdateRecord 更新跟进记录。
func (s *FollowService) UpdateRecord(ctx context.Context, id uint, req *UpdateRecordRequest) error {
	rec, err := s.recordRepo.GetByID(ctx, id)
	if err != nil {
		return repository.NotFoundOr(err, "跟进记录不存在")
	}
	rec.Type = req.Type
	rec.Content = req.Content
	rec.FollowTime = req.FollowTime
	return s.recordRepo.Update(ctx, rec)
}

// DeleteRecord 删除跟进记录。
func (s *FollowService) DeleteRecord(ctx context.Context, id uint) error {
	return s.recordRepo.Delete(ctx, id)
}

// Timeline 按资源(客户/商机/联系人/合同)查跟进记录时间线。
// field 为列名:customer_id / opportunity_id / contact_id / contract_id。
func (s *FollowService) Timeline(ctx context.Context, field string, value uint) ([]crmmodel.FollowUpRecord, error) {
	return s.recordRepo.Timeline(ctx, field, value)
}

// ── 跟进计划 ──

// CreatePlanRequest 创建跟进计划请求。
type CreatePlanRequest struct {
	Type          string             `json:"type" binding:"required"`
	Content       string             `json:"content" binding:"required"`
	PlanTime      xtime.DateTime     `json:"plan_time" binding:"required"`
	RemindTime    xtime.NullDateTime `json:"remind_time"`
	OwnerID       uint               `json:"owner_id"` // 缺省取当前登录人(handler 注入)
	LeadID        *uint              `json:"lead_id"`
	CustomerID    *uint              `json:"customer_id"`
	OpportunityID *uint              `json:"opportunity_id"`
	ContactID     *uint              `json:"contact_id"`
	ContractID    *uint              `json:"contract_id"`
}

// CreatePlan 创建跟进计划(默认 status=待办)。
func (s *FollowService) CreatePlan(ctx context.Context, req *CreatePlanRequest) (*crmmodel.FollowUpPlan, error) {
	if err := s.validateResourceAccess(ctx, req.LeadID, req.CustomerID, req.OpportunityID, req.ContactID, req.ContractID); err != nil {
		return nil, err
	}
	plan := &crmmodel.FollowUpPlan{
		Type: req.Type, Content: req.Content, PlanTime: req.PlanTime, RemindTime: req.RemindTime,
		OwnerID: req.OwnerID, Status: crmmodel.PlanStatusTodo,
		LeadID: req.LeadID, CustomerID: req.CustomerID, OpportunityID: req.OpportunityID,
		ContactID: req.ContactID, ContractID: req.ContractID,
	}
	if err := s.planRepo.Create(ctx, plan); err != nil {
		return nil, err
	}
	return plan, nil
}

// GetPlan 跟进计划详情。
func (s *FollowService) GetPlan(ctx context.Context, id uint) (*crmmodel.FollowUpPlan, error) {
	plan, err := s.planRepo.GetByID(ctx, id)
	return plan, repository.NotFoundOr(err, "跟进计划不存在")
}

// UpdatePlanRequest 更新跟进计划请求。
type UpdatePlanRequest struct {
	Type       string             `json:"type" binding:"required"`
	Content    string             `json:"content" binding:"required"`
	PlanTime   xtime.DateTime     `json:"plan_time" binding:"required"`
	RemindTime xtime.NullDateTime `json:"remind_time"`
}

// UpdatePlan 更新跟进计划。
func (s *FollowService) UpdatePlan(ctx context.Context, id uint, req *UpdatePlanRequest) error {
	plan, err := s.planRepo.GetByID(ctx, id)
	if err != nil {
		return repository.NotFoundOr(err, "跟进计划不存在")
	}
	plan.Type = req.Type
	plan.Content = req.Content
	plan.PlanTime = req.PlanTime
	plan.RemindTime = req.RemindTime
	return s.planRepo.Update(ctx, plan)
}

// DeletePlan 删除跟进计划。
func (s *FollowService) DeletePlan(ctx context.Context, id uint) error {
	return s.planRepo.Delete(ctx, id)
}

// ConvertPlanToRecord 将计划转为跟进记录(事务内):
//   - 新建一条 FollowUpRecord,PlanID 指向该计划;
//   - 计划 Status 改为 1(已转记录),RecordID 回填。
func (s *FollowService) ConvertPlanToRecord(ctx context.Context, id, operatorID uint) (*crmmodel.FollowUpRecord, error) {
	plan, err := s.planRepo.GetByID(ctx, id)
	if err != nil {
		return nil, repository.NotFoundOr(err, "跟进计划不存在")
	}
	if plan.Status != crmmodel.PlanStatusTodo {
		return nil, errors.New("该计划已处理,无法转换")
	}
	now := time.Now()
	planFollowNo, _ := numbergen.Generate(ctx, "follow")
	rec := &crmmodel.FollowUpRecord{
		FollowNo: planFollowNo,
		Type:     plan.Type, Content: plan.Content, FollowTime: xtime.NewDateTime(now), OwnerID: operatorID,
		LeadID: plan.LeadID, CustomerID: plan.CustomerID, OpportunityID: plan.OpportunityID,
		ContactID: plan.ContactID, ContractID: plan.ContractID, PlanID: &plan.ID,
	}
	err = repository.Transaction(ctx, func(ctx context.Context) error {
		if err := s.recordRepo.Create(ctx, rec); err != nil {
			return err
		}
		plan.Status = crmmodel.PlanStatusDone
		plan.RecordID = &rec.ID
		return s.planRepo.Update(ctx, plan)
	})
	if err != nil {
		return nil, err
	}
	s.syncLinkedFollow(ctx, operatorID, now, plan.LeadID, plan.CustomerID, plan.OpportunityID, plan.ContractID)
	return rec, nil
}

// SkipPlan 跳过跟进计划(Status 改为 2)。
func (s *FollowService) SkipPlan(ctx context.Context, id uint) error {
	plan, err := s.planRepo.GetByID(ctx, id)
	if err != nil {
		return repository.NotFoundOr(err, "跟进计划不存在")
	}
	plan.Status = crmmodel.PlanStatusSkipped
	return s.planRepo.Update(ctx, plan)
}

// MyTodos 查某用户的待办计划(status=0)。
func (s *FollowService) MyTodos(ctx context.Context, ownerID uint) ([]crmmodel.FollowUpPlan, error) {
	return s.planRepo.MyTodos(ctx, ownerID)
}
