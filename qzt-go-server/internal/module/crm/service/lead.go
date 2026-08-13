package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"qzt-go-server/internal/model"
	"qzt-go-server/internal/model/base"
	crmmodel "qzt-go-server/internal/model/crm"
	"qzt-go-server/internal/pkg/datascope"
	"qzt-go-server/internal/pkg/diff"
	"qzt-go-server/internal/pkg/numbergen"
	"qzt-go-server/internal/repository"
	crrepo "qzt-go-server/internal/repository/crm"
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
	contactRepo *crrepo.CustomerContactRepo
	fieldSvc    *CustomFieldService
}

func NewLeadService() *LeadService {
	return &LeadService{
		repo:        crrepo.NewLeadRepo(),
		historyRepo: crrepo.NewLeadOwnerHistoryRepo(),
		custRepo:    crrepo.NewCustomerRepo(),
		contactRepo: crrepo.NewCustomerContactRepo(),
		fieldSvc:    NewCustomFieldService(),
	}
}

// CreateLeadRequest 创建线索请求。
type CreateLeadRequest struct {
	Name        string       `json:"name" binding:"required"`
	LeadNo      string       `json:"lead_no"` // 留空则自动生成
	ContactName string       `json:"contact_name"`
	Phone       string       `json:"phone"`
	Email       string       `json:"email"`
	Company     string       `json:"company"`
	Level       string       `json:"level"`
	Source      string       `json:"source"`
	Industry    string       `json:"industry"`
	OwnerID     *uint        `json:"owner_id"`
	Remark      string       `json:"remark"`
	Fields      []FieldValue `json:"fields"`
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
		Name:           req.Name,
		LeadNo:         leadNo,
		ContactName:    req.ContactName,
		Phone:          req.Phone,
		Email:          req.Email,
		Company:        req.Company,
		Level:          req.Level,
		Source:         req.Source,
		Industry:       req.Industry,
		Status:         crmmodel.LeadStatusNew,
		OwnerID:        ownerID,
		InPool:         crmmodel.InPoolPrivate,
		CollectionTime: xtime.NewNullDateTimeFromTime(now),
		Remark:         req.Remark,
	}
	err := repository.Transaction(ctx, func(ctx context.Context) error {
		if err := s.repo.Create(ctx, lead); err != nil {
			return err
		}
		// 写自定义字段值
		if len(req.Fields) > 0 {
			if err := s.fieldSvc.SaveLeadValues(ctx, formatResourceID(lead.ID), req.Fields); err != nil {
				return err
			}
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

// GetByID 线索详情(含自定义字段值)。
func (s *LeadService) GetByID(ctx context.Context, id uint) (*crmmodel.CrmLead, map[string]string, error) {
	lead, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, nil, notFoundOr(err, "线索不存在")
	}
	fields, _ := s.fieldSvc.GetLeadValues(ctx, formatResourceID(id))
	return lead, fields, nil
}

// UpdateLeadRequest 更新线索请求。
type UpdateLeadRequest struct {
	Name        string       `json:"name" binding:"required"`
	ContactName string       `json:"contact_name"`
	Phone       string       `json:"phone"`
	Email       string       `json:"email"`
	Company     string       `json:"company"`
	Level       string       `json:"level"`
	Source      string       `json:"source"`
	Status      *int8        `json:"status"`
	Industry    string       `json:"industry"`
	Fields      []FieldValue `json:"fields"`
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
		if req.Fields != nil {
			return s.fieldSvc.SaveLeadValues(ctx, formatResourceID(id), req.Fields)
		}
		return nil
	})
}

// Delete 删除线索(清自定义字段值)。
func (s *LeadService) Delete(ctx context.Context, id uint) error {
	if _, err := s.repo.GetByID(ctx, id); err != nil {
		return notFoundOr(err, "线索不存在")
	}
	// 校验业务引用:存在关联跟进记录/计划则拒绝删除,避免悬空引用。
	if err := rejectIfLeadReferenced(ctx, id); err != nil {
		return err
	}
	return repository.Transaction(ctx, func(ctx context.Context) error {
		if err := s.fieldSvc.DeleteLeadValues(ctx, formatResourceID(id)); err != nil {
			return err
		}
		return s.repo.Delete(ctx, id)
	})
}

// leadRefTables 删除线索时需要校验的业务引用表(表名 → 业务名称)。
// 归属历史(crm_lead_owner_history)为审计流水,不阻止删除。
var leadRefTables = []struct {
	table string
	label string
}{
	{"follow_up_record", "跟进记录"},
	{"follow_up_plan", "跟进计划"},
}

// rejectIfLeadReferenced 检查线索是否被未删除的跟进记录/计划引用,有则阻止删除(避免悬空引用)。
func rejectIfLeadReferenced(ctx context.Context, leadID uint) error {
	db := repository.DBFrom(ctx)
	for _, r := range leadRefTables {
		var n int64
		if err := db.Table(r.table).
			Where("lead_id = ?", leadID).
			Where("deleted_at IS NULL").
			Count(&n).Error; err != nil {
			return err
		}
		if n > 0 {
			return fmt.Errorf("该线索存在关联的%s(%d条),无法删除", r.label, n)
		}
	}
	return nil
}

// List 线索列表(分页 + 主字段过滤)。
func (s *LeadService) List(ctx context.Context, page, pageSize int, keyword, level, source, status, industry, poolFilter string, poolID uint) ([]crmmodel.CrmLead, int64, error) {
	q := &repository.QueryOptions{Order: []string{"id DESC"}}
	where := map[string]any{}
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
	// 公海/私海过滤:PUBLIC=公海(跳过 owner 数据权限);PRIVATE=私海;空=默认(走数据权限)
	if poolFilter == "PUBLIC" {
		where["in_pool"] = crmmodel.InPoolPublic
		if poolID > 0 {
			where["pool_id"] = poolID
		}
	} else {
		if poolFilter == "PRIVATE" {
			where["in_pool"] = crmmodel.InPoolPrivate
		}
		if cond := datascope.BuildCond(ctx, "owner_id"); cond != nil {
			q.Conds = append(q.Conds, *cond)
		}
	}
	if len(where) > 0 {
		q.Where = where
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

// UpdateFollow 更新线索的跟进人/跟进时间(跟进记录创建后由 follow service 调用)。
// 这是线索公海自动回收判定的关键依据:follow_time 为 NULL 或过期的线索会被回收到公海。
// 语义与 CustomerService.UpdateFollow 一致:关联可选,GetByID 失败时静默忽略。
func (s *LeadService) UpdateFollow(ctx context.Context, id, followerID uint, followTime time.Time) error {
	lead, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil // 线索可能不存在(关联可选),静默忽略
	}
	lead.FollowerID = &followerID
	lead.FollowTime = xtime.NewNullDateTimeFromTime(followTime)
	return s.repo.Update(ctx, lead)
}

// ── 转化为客户 ──

// Convert 将线索转化为客户:创建 CrmCustomer(复制基本信息),并在线索带有联系人信息时
// 同步创建一条 CrmCustomerContact(电话/邮箱/姓名带过去),最后回写线索转化状态。
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
		// 自定义字段值按映射带转到新客户(线索字段定义上的 convert_target_field)
		if err := s.fieldSvc.ConvertLeadFieldValues(ctx, leadID, customer.ID); err != nil {
			return err
		}
		// 线索带有联系人信息时,同步创建一条联系人(Name 缺失则用线索名兜底,避免丢电话/邮箱)。
		if lead.ContactName != "" || lead.Phone != "" || lead.Email != "" {
			contactName := lead.ContactName
			if contactName == "" {
				contactName = lead.Name
			}
			contactNo, _ := numbergen.Generate(ctx, "contact")
			contact := &crmmodel.CrmCustomerContact{
				CustomerID: customer.ID,
				Name:       contactName,
				ContactNo:  contactNo,
				Phone:      lead.Phone,
				Email:      lead.Email,
				Status:     base.StatusEnabled,
			}
			if err := s.contactRepo.Create(ctx, contact); err != nil {
				return err
			}
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
