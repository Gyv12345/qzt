package service

import (
	"context"
	"errors"
	"time"

	"qzt-go-server/internal/model"
	crmmodel "qzt-go-server/internal/model/crm"
	"qzt-go-server/internal/pkg/datascope"
	"qzt-go-server/internal/pkg/diff"
	"qzt-go-server/internal/pkg/numbergen"
	crrepo "qzt-go-server/internal/repository/crm"
	"qzt-go-server/internal/repository"
	"qzt-go-server/pkg/xtime"
)

// leadFieldDefs 线索可对比的业务字段(CrmLead 实际存在的字段)。
var leadFieldDefs = []diff.FieldDef{
	{Name: "Name", Label: "线索名称"},
	{Name: "ContactName", Label: "联系人"},
	{Name: "Phone", Label: "电话"},
	{Name: "Email", Label: "邮箱"},
	{Name: "Company", Label: "公司"},
	{Name: "Level", Label: "级别"},
	{Name: "Source", Label: "来源"},
	{Name: "Industry", Label: "行业"},
	{Name: "Status", Label: "状态"},
}

// lead.go 线索服务:CRUD + 公海操作(领取/释放/转移) + 转化为客户。
// 公海生命周期逻辑逐行镜像 customer.go。

// LeadService 线索服务。
type LeadService struct {
	repo        *crrepo.LeadRepo
	historyRepo *crrepo.LeadOwnerHistoryRepo
	custRepo    *crrepo.CustomerRepo
}

func NewLeadService() *LeadService {
	return &LeadService{
		repo:        crrepo.NewLeadRepo(),
		historyRepo: crrepo.NewLeadOwnerHistoryRepo(),
		custRepo:    crrepo.NewCustomerRepo(),
	}
}

// CreateLeadRequest 创建线索请求。
type CreateLeadRequest struct {
	Name        string `json:"name" binding:"required"`
	LeadNo      string `json:"lead_no"` // 留空则自动生成
	ContactName string `json:"contact_name"`
	Phone       string `json:"phone"`
	Email       string `json:"email"`
	Company     string `json:"company"`
	Level       string `json:"level"`
	Source      string `json:"source"`
	Industry    string `json:"industry"`
	OwnerID     *uint  `json:"owner_id"`
}

// Create 创建线索(默认私海,owner 默认当前用户)。
func (s *LeadService) Create(ctx context.Context, req *CreateLeadRequest, currentUserID uint) (*crmmodel.CrmLead, error) {
	ownerID := req.OwnerID
	if ownerID == nil {
		ownerID = &currentUserID
	}
	now := time.Now()
	// 自动生成线索编号(用户填了用手填的,留空才自动)
	leadNo := req.LeadNo
	if leadNo == "" {
		leadNo, _ = numbergen.Generate(ctx, "lead")
	}
	lead := &crmmodel.CrmLead{
		Name:        req.Name,
		LeadNo:      leadNo,
		ContactName: req.ContactName,
		Phone:       req.Phone,
		Email:       req.Email,
		Company:     req.Company,
		Level:       req.Level,
		Source:      req.Source,
		Industry:    req.Industry,
		Status:      crmmodel.LeadStatusNew,
		OwnerID:     ownerID,
		InPool:      crmmodel.InPoolPrivate,
		CollectionTime: xtime.NewNullDateTimeFromTime(now),
	}
	err := repository.Transaction(ctx, func(ctx context.Context) error {
		if err := s.repo.Create(ctx, lead); err != nil {
			return err
		}
		return s.historyRepo.Create(ctx, &crmmodel.CrmLeadOwnerHistory{
			LeadID: lead.ID, OwnerID: ownerID, Action: crmmodel.OwnerActionTake,
			OperatorID: currentUserID,
		})
	})
	if err != nil {
		return nil, err
	}
	return lead, nil
}

// GetByID 线索详情。
func (s *LeadService) GetByID(ctx context.Context, id uint) (*crmmodel.CrmLead, error) {
	lead, err := s.repo.GetByID(ctx, id)
	return lead, notFoundOr(err, "线索不存在")
}

// UpdateLeadRequest 更新线索请求。
type UpdateLeadRequest struct {
	Name        string `json:"name" binding:"required"`
	ContactName string `json:"contact_name"`
	Phone       string `json:"phone"`
	Email       string `json:"email"`
	Company     string `json:"company"`
	Level       string `json:"level"`
	Source      string `json:"source"`
	Status      *int8  `json:"status"`
	Industry    string `json:"industry"`
}

// Update 更新线索。
func (s *LeadService) Update(ctx context.Context, id uint, req *UpdateLeadRequest, operatorID uint) error {
	lead, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return notFoundOr(err, "线索不存在")
	}
	// 复制旧值快照(用于 diff)
	oldSnapshot := *lead
	lead.Name = req.Name
	lead.ContactName = req.ContactName
	lead.Phone = req.Phone
	lead.Email = req.Email
	lead.Company = req.Company
	lead.Level = req.Level
	lead.Source = req.Source
	lead.Industry = req.Industry
	if req.Status != nil {
		lead.Status = *req.Status
	}
	// diff 字段变更
	changes := diff.DiffStructs(&oldSnapshot, lead, leadFieldDefs)

	return repository.Transaction(ctx, func(ctx context.Context) error {
		if err := s.repo.Update(ctx, lead); err != nil {
			return err
		}
		recordChanges(ctx, model.BizTypeLead, id, operatorID, changes)
		return nil
	})
}

// Delete 删除线索。
func (s *LeadService) Delete(ctx context.Context, id uint) error {
	if _, err := s.repo.GetByID(ctx, id); err != nil {
		return notFoundOr(err, "线索不存在")
	}
	return s.repo.Delete(ctx, id)
}

// List 线索列表(分页 + 主字段过滤)。
func (s *LeadService) List(ctx context.Context, page, pageSize int, keyword, level, source, status, industry string) ([]crmmodel.CrmLead, int64, error) {
	q := &repository.QueryOptions{Order: []string{"id DESC"}}
	where := map[string]interface{}{}
	if keyword != "" {
		q.Search = map[string]string{"name": keyword}
	}
	if level != "" {
		where["level"] = level
	}
	if source != "" {
		where["source"] = source
	}
	if status != "" {
		where["status"] = status
	}
	if industry != "" {
		where["industry"] = industry
	}
	if len(where) > 0 {
		q.Where = where
	}
	if cond := datascope.BuildCond(ctx, "owner_id"); cond != nil {
		q.Conds = append(q.Conds, *cond)
	}
	return s.repo.PageList(ctx, page, pageSize, q)
}

// ── 公海操作 ──

// ReleaseToPool 释放线索到公海(退回公海)。
func (s *LeadService) ReleaseToPool(ctx context.Context, id, poolID, operatorID uint, reason string) error {
	lead, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return notFoundOr(err, "线索不存在")
	}
	if lead.InPool == crmmodel.InPoolPublic {
		return errors.New("线索已在公海")
	}
	return repository.Transaction(ctx, func(ctx context.Context) error {
		lead.InPool = crmmodel.InPoolPublic
		lead.PoolID = &poolID
		lead.OwnerID = nil
		lead.CollectionTime = xtime.NullDateTime{}
		lead.PoolReason = reason
		if err := s.repo.Update(ctx, lead); err != nil {
			return err
		}
		return s.historyRepo.Create(ctx, &crmmodel.CrmLeadOwnerHistory{
			LeadID: id, OwnerID: nil, Action: crmmodel.OwnerActionRelease,
			OperatorID: operatorID, Reason: reason,
		})
	})
}

// PickFromPool 从公海领取线索。
func (s *LeadService) PickFromPool(ctx context.Context, id, operatorID uint) error {
	lead, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return notFoundOr(err, "线索不存在")
	}
	if lead.InPool != crmmodel.InPoolPublic {
		return errors.New("线索不在公海")
	}
	now := time.Now()
	return repository.Transaction(ctx, func(ctx context.Context) error {
		lead.InPool = crmmodel.InPoolPrivate
		lead.PoolID = nil
		lead.OwnerID = &operatorID
		lead.CollectionTime = xtime.NewNullDateTimeFromTime(now)
		lead.PoolReason = ""
		if err := s.repo.Update(ctx, lead); err != nil {
			return err
		}
		return s.historyRepo.Create(ctx, &crmmodel.CrmLeadOwnerHistory{
			LeadID: id, OwnerID: &operatorID, Action: crmmodel.OwnerActionTake,
			OperatorID: operatorID,
		})
	})
}

// Transfer 转移线索给其他用户。
func (s *LeadService) Transfer(ctx context.Context, id, toUserID, operatorID uint) error {
	lead, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return notFoundOr(err, "线索不存在")
	}
	if lead.InPool == crmmodel.InPoolPublic {
		return errors.New("公海线索不可直接转移,请先领取")
	}
	return repository.Transaction(ctx, func(ctx context.Context) error {
		lead.OwnerID = &toUserID
		if err := s.repo.Update(ctx, lead); err != nil {
			return err
		}
		return s.historyRepo.Create(ctx, &crmmodel.CrmLeadOwnerHistory{
			LeadID: id, OwnerID: &toUserID, Action: crmmodel.OwnerActionTransfer,
			OperatorID: operatorID,
		})
	})
}

// OwnerHistory 线索归属变更历史。
func (s *LeadService) OwnerHistory(ctx context.Context, id uint) ([]crmmodel.CrmLeadOwnerHistory, error) {
	return s.historyRepo.ListByLead(ctx, id)
}

// ── 转化为客户 ──

// Convert 将线索转化为客户:创建 CrmCustomer(复制基本信息),回写线索转化状态。
// 已转化的线索不可重复转化。
func (s *LeadService) Convert(ctx context.Context, leadID, currentUserID uint) (*crmmodel.CrmCustomer, error) {
	lead, err := s.repo.GetByID(ctx, leadID)
	if err != nil {
		return nil, notFoundOr(err, "线索不存在")
	}
	if lead.ConvertedCustomerID != nil {
		return nil, errors.New("该线索已转化,不可重复转化")
	}

	now := time.Now()
	// 线索转客户:也给客户生成编号
	convertedCustomerNo, _ := numbergen.Generate(ctx, "customer")
	customer := &crmmodel.CrmCustomer{
		Name:           lead.Name,
		CustomerNo:     convertedCustomerNo,
		Level:          lead.Level,
		Source:         lead.Source,
		Industry:       lead.Industry,
		Status:         crmmodel.CustomerStatusNormal,
		OwnerID:        lead.OwnerID, // 继承线索负责人
		InPool:         crmmodel.InPoolPrivate,
		CollectionTime: xtime.NewNullDateTimeFromTime(now),
	}

	err = repository.Transaction(ctx, func(ctx context.Context) error {
		if err := s.custRepo.Create(ctx, customer); err != nil {
			return err
		}
		lead.ConvertedCustomerID = &customer.ID
		lead.ConvertedAt = xtime.NewNullDateTimeFromTime(now)
		lead.Status = crmmodel.LeadStatusConverted
		return s.repo.Update(ctx, lead)
	})
	if err != nil {
		return nil, err
	}
	return customer, nil
}
