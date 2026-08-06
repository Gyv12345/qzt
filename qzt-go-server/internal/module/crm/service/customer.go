package service

import (
	"context"
	"errors"
	"time"

	"gorm.io/gorm"

	"qzt-go-server/internal/model"
	crmmodel "qzt-go-server/internal/model/crm"
	"qzt-go-server/internal/pkg/datascope"
	"qzt-go-server/internal/pkg/diff"
	"qzt-go-server/internal/pkg/numbergen"
	crrepo "qzt-go-server/internal/repository/crm"
	"qzt-go-server/internal/repository"
	"qzt-go-server/pkg/xtime"
)

// customerFieldDefs 客户可对比的业务字段(CrmCustomer 实际存在的字段)。
var customerFieldDefs = []diff.FieldDef{
	{Name: "Name", Label: "客户名称"},
	{Name: "Level", Label: "级别"},
	{Name: "Source", Label: "来源"},
	{Name: "Industry", Label: "行业"},
	{Name: "Status", Label: "状态"},
}

// customer.go 客户服务:CRUD + 联系人 + 协作 + 公海操作 + 自定义字段。

// CustomerService 客户服务。
type CustomerService struct {
	repo      *crrepo.CustomerRepo
	contactRepo *crrepo.CustomerContactRepo
	collabRepo  *crrepo.CustomerCollaborationRepo
	historyRepo *crrepo.CustomerOwnerHistoryRepo
	fieldSvc    *CustomFieldService
}

func NewCustomerService() *CustomerService {
	return &CustomerService{
		repo:        crrepo.NewCustomerRepo(),
		contactRepo: crrepo.NewCustomerContactRepo(),
		collabRepo:  crrepo.NewCustomerCollaborationRepo(),
		historyRepo: crrepo.NewCustomerOwnerHistoryRepo(),
		fieldSvc:    NewCustomFieldService(),
	}
}

// CreateCustomerRequest 创建客户请求。
type CreateCustomerRequest struct {
	Name       string `json:"name" binding:"required"`
	CustomerNo string `json:"customer_no"` // 留空则自动生成
	Level      string `json:"level"`
	Source     string `json:"source"`
	Industry   string `json:"industry"`
	OwnerID    *uint  `json:"owner_id"`
	Fields     []FieldValue `json:"fields"`
}

// Create 创建客户(默认私海,owner 默认当前用户;写自定义字段值)。
func (s *CustomerService) Create(ctx context.Context, req *CreateCustomerRequest, currentUserID uint) (*crmmodel.CrmCustomer, error) {
	// 名称唯一性预检
	exists, err := s.repo.Exists(ctx, &repository.QueryOptions{Where: map[string]interface{}{"name": req.Name}})
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, errors.New("客户名称已存在")
	}

	ownerID := req.OwnerID
	if ownerID == nil {
		ownerID = &currentUserID // 默认创建人为负责人
	}
	now := time.Now()
	// 自动生成客户编号(用户填了用手填的,留空才自动)
	customerNo := req.CustomerNo
	if customerNo == "" {
		customerNo, _ = numbergen.Generate(ctx, "customer")
	}
	customer := &crmmodel.CrmCustomer{
		Name:    req.Name,
		CustomerNo: customerNo,
		Level:   req.Level,
		Source:  req.Source,
		Industry: req.Industry,
		Status:  crmmodel.CustomerStatusNormal,
		OwnerID: ownerID,
		InPool:  crmmodel.InPoolPrivate,
		CollectionTime: xtime.NewNullDateTimeFromTime(now),
	}

	err = repository.Transaction(ctx, func(ctx context.Context) error {
		if err := s.repo.Create(ctx, customer); err != nil {
			if errors.Is(err, gorm.ErrDuplicatedKey) {
				return errors.New("客户名称已存在")
			}
			return err
		}
		// 写自定义字段值
		if len(req.Fields) > 0 {
			if err := s.fieldSvc.SaveCustomerValues(ctx, formatResourceID(customer.ID), req.Fields); err != nil {
				return err
			}
		}
		// 归属历史
		return s.historyRepo.Create(ctx, &crmmodel.CrmCustomerOwnerHistory{
			CustomerID: customer.ID, OwnerID: ownerID, Action: crmmodel.OwnerActionTake,
			OperatorID: currentUserID,
		})
	})
	if err != nil {
		return nil, err
	}
	return customer, nil
}

// ── 公开(免鉴权)接口 ──

// PublicPartnerDTO 公开合作方/客户视图。仅暴露对外可展示字段,不含负责人/跟进人等内部信息。
type PublicPartnerDTO struct {
	ID       uint   `json:"id"`
	Name     string `json:"name"`
	Level    string `json:"level"`
	Industry string `json:"industry"`
	Source   string `json:"source"`
}

// ListPartners 公开合作方分页列表(只返回 status=正常 的客户,作为官网展示的合作客户)。
func (s *CustomerService) ListPartners(ctx context.Context, page, pageSize int, keyword, industry string) ([]PublicPartnerDTO, int64, error) {
	opts := &repository.QueryOptions{
		Where:  map[string]interface{}{"status": crmmodel.CustomerStatusNormal},
		Select: []string{"id", "name", "level", "industry", "source"},
		Order:  []string{"id DESC"},
	}
	if keyword != "" {
		opts.Search = map[string]string{"name": keyword}
	}
	if industry != "" {
		opts.Where["industry"] = industry
	}
	customers, total, err := s.repo.PageList(ctx, page, pageSize, opts)
	if err != nil {
		return nil, 0, err
	}
	out := make([]PublicPartnerDTO, 0, len(customers))
	for _, c := range customers {
		out = append(out, PublicPartnerDTO{
			ID: c.ID, Name: c.Name, Level: c.Level, Industry: c.Industry, Source: c.Source,
		})
	}
	return out, total, nil
}

// GetByID 客户详情(含自定义字段值)。
func (s *CustomerService) GetByID(ctx context.Context, id uint) (*crmmodel.CrmCustomer, map[string]string, error) {
	customer, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, nil, notFoundOr(err, "客户不存在")
	}
	fields, _ := s.fieldSvc.GetCustomerValues(ctx, formatResourceID(id))
	return customer, fields, nil
}

// UpdateCustomerRequest 更新客户请求。
type UpdateCustomerRequest struct {
	Name     string `json:"name" binding:"required"`
	Level    string `json:"level"`
	Source   string `json:"source"`
	Status   *int8  `json:"status"`
	Industry string `json:"industry"`
	Fields   []FieldValue `json:"fields"`
}

// Update 更新客户(含自定义字段值,先删后写)。
func (s *CustomerService) Update(ctx context.Context, id uint, req *UpdateCustomerRequest, operatorID uint) error {
	customer, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return notFoundOr(err, "客户不存在")
	}
	// 名称唯一性(排除自身)
	if req.Name != customer.Name {
		exists, err := s.repo.Exists(ctx, &repository.QueryOptions{
			Conds: []repository.Cond{{Query: "name = ? AND id != ?", Args: []interface{}{req.Name, id}}},
		})
		if err != nil {
			return err
		}
		if exists {
			return errors.New("客户名称已存在")
		}
	}
	// 复制旧值快照(用于 diff)
	oldSnapshot := *customer
	customer.Name = req.Name
	customer.Level = req.Level
	customer.Source = req.Source
	customer.Industry = req.Industry
	if req.Status != nil {
		customer.Status = *req.Status
	}
	// diff 字段变更
	changes := diff.DiffStructs(&oldSnapshot, customer, customerFieldDefs)

	return repository.Transaction(ctx, func(ctx context.Context) error {
		if err := s.repo.Update(ctx, customer); err != nil {
			return err
		}
		recordChanges(ctx, model.BizTypeCustomer, id, operatorID, changes)
		if req.Fields != nil {
			return s.fieldSvc.SaveCustomerValues(ctx, formatResourceID(id), req.Fields)
		}
		return nil
	})
}

// Delete 删除客户(级联软删除联系人/协作,清自定义字段值)。
func (s *CustomerService) Delete(ctx context.Context, id uint) error {
	if _, err := s.repo.GetByID(ctx, id); err != nil {
		return notFoundOr(err, "客户不存在")
	}
	return repository.Transaction(ctx, func(ctx context.Context) error {
		// 软删联系人
		if err := crrepoDeleteContactsByCustomer(ctx, id); err != nil {
			return err
		}
		// 删协作
		if err := crrepoDeleteCollaborationsByCustomer(ctx, id); err != nil {
			return err
		}
		// 删自定义字段值
		if err := s.fieldSvc.DeleteCustomerValues(ctx, formatResourceID(id)); err != nil {
			return err
		}
		return s.repo.Delete(ctx, id)
	})
}

// List 客户列表(分页 + 主字段过滤)。
func (s *CustomerService) List(ctx context.Context, page, pageSize int, keyword, level, source, status, industry string) ([]crmmodel.CrmCustomer, int64, error) {
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
	// 数据权限过滤
	if cond := datascope.BuildCond(ctx, "owner_id"); cond != nil {
		q.Conds = append(q.Conds, *cond)
	}
	return s.repo.PageList(ctx, page, pageSize, q)
}

// ── 公海操作 ──

// ReleaseToPool 释放客户到公海(退回公海)。
func (s *CustomerService) ReleaseToPool(ctx context.Context, id, poolID, operatorID uint, reason string) error {
	customer, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return notFoundOr(err, "客户不存在")
	}
	if customer.InPool == crmmodel.InPoolPublic {
		return errors.New("客户已在公海")
	}
	return repository.Transaction(ctx, func(ctx context.Context) error {
		customer.InPool = crmmodel.InPoolPublic
		customer.PoolID = &poolID
		customer.OwnerID = nil
		customer.CollectionTime = xtime.NullDateTime{}
		customer.PoolReason = reason
		if err := s.repo.Update(ctx, customer); err != nil {
			return err
		}
		return s.historyRepo.Create(ctx, &crmmodel.CrmCustomerOwnerHistory{
			CustomerID: id, OwnerID: nil, Action: crmmodel.OwnerActionRelease,
			OperatorID: operatorID, Reason: reason,
		})
	})
}

// PickFromPool 从公海领取客户。
func (s *CustomerService) PickFromPool(ctx context.Context, id, operatorID uint) error {
	customer, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return notFoundOr(err, "客户不存在")
	}
	if customer.InPool != crmmodel.InPoolPublic {
		return errors.New("客户不在公海")
	}
	now := time.Now()
	return repository.Transaction(ctx, func(ctx context.Context) error {
		customer.InPool = crmmodel.InPoolPrivate
		customer.PoolID = nil
		customer.OwnerID = &operatorID
		customer.CollectionTime = xtime.NewNullDateTimeFromTime(now)
		customer.PoolReason = ""
		if err := s.repo.Update(ctx, customer); err != nil {
			return err
		}
		return s.historyRepo.Create(ctx, &crmmodel.CrmCustomerOwnerHistory{
			CustomerID: id, OwnerID: &operatorID, Action: crmmodel.OwnerActionTake,
			OperatorID: operatorID,
		})
	})
}

// Transfer 转移客户给其他用户。
func (s *CustomerService) Transfer(ctx context.Context, id, toUserID, operatorID uint) error {
	customer, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return notFoundOr(err, "客户不存在")
	}
	if customer.InPool == crmmodel.InPoolPublic {
		return errors.New("公海客户不可直接转移,请先领取")
	}
	return repository.Transaction(ctx, func(ctx context.Context) error {
		customer.OwnerID = &toUserID
		if err := s.repo.Update(ctx, customer); err != nil {
			return err
		}
		return s.historyRepo.Create(ctx, &crmmodel.CrmCustomerOwnerHistory{
			CustomerID: id, OwnerID: &toUserID, Action: crmmodel.OwnerActionTransfer,
			OperatorID: operatorID,
		})
	})
}

// OwnerHistory 客户归属变更历史。
func (s *CustomerService) OwnerHistory(ctx context.Context, id uint) ([]crmmodel.CrmCustomerOwnerHistory, error) {
	return s.historyRepo.ListByCustomer(ctx, id)
}

// UpdateFollow 更新客户的跟进人/跟进时间(跟进记录创建后由 follow service 调用)。
func (s *CustomerService) UpdateFollow(ctx context.Context, id, followerID uint, followTime time.Time) error {
	customer, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil // 客户可能不存在(关联可选),静默忽略
	}
	customer.FollowerID = &followerID
	customer.FollowTime = xtime.NewNullDateTimeFromTime(followTime)
	return s.repo.Update(ctx, customer)
}

// formatResourceID 业务实体 ID(uint)转字符串(自定义字段值表 resource_id 是字符串)。
func formatResourceID(id uint) string {
	return uintToStr(id)
}

// uintToStr uint 转十进制字符串。
func uintToStr(n uint) string {
	if n == 0 {
		return "0"
	}
	var buf [20]byte
	i := len(buf)
	for n > 0 {
		i--
		buf[i] = byte('0' + n%10)
		n /= 10
	}
	return string(buf[i:])
}

// crrepoDeleteContactsByCustomer 软删除某客户的全部联系人。
func crrepoDeleteContactsByCustomer(ctx context.Context, customerID uint) error {
	return crrepoDeleteByColumn(ctx, &crmmodel.CrmCustomerContact{}, "customer_id", customerID)
}

// crrepoDeleteCollaborationsByCustomer 软删除某客户的全部协作。
func crrepoDeleteCollaborationsByCustomer(ctx context.Context, customerID uint) error {
	return crrepoDeleteByColumn(ctx, &crmmodel.CrmCustomerCollaboration{}, "customer_id", customerID)
}

// crrepoDeleteByColumn 按列名软删除(GORM 软删除自动加 deleted_at 条件)。
func crrepoDeleteByColumn(ctx context.Context, model interface{}, column string, value uint) error {
	return crrepo.DeleteByColumn(ctx, model, column, value)
}
