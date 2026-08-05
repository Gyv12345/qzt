package service

import (
	"context"
	"errors"
	"time"

	"gorm.io/gorm"

	crmmodel "qzt-go-server/internal/model/crm"
	"qzt-go-server/internal/module/crm/pool"
	"qzt-go-server/internal/repository"
	crrepo "qzt-go-server/internal/repository/crm"
	"qzt-go-server/pkg/xtime"
)

// lead_pool.go 线索公海池服务:池配置 + 领取/回收规则(1:1 upsert) + 手动回收。
// 镜像 pool.go(客户公海);回收引擎 pool.ShouldRecycle 零改动复用,用 recyclableLead 适配。

// LeadPoolService 线索公海池服务。
type LeadPoolService struct {
	poolRepo        *crrepo.LeadPoolRepo
	pickRuleRepo    *crrepo.LeadPoolPickRuleRepo
	recycleRuleRepo *crrepo.LeadPoolRecycleRuleRepo
	leadRepo        *crrepo.LeadRepo
}

func NewLeadPoolService() *LeadPoolService {
	return &LeadPoolService{
		poolRepo:        crrepo.NewLeadPoolRepo(),
		pickRuleRepo:    crrepo.NewLeadPoolPickRuleRepo(),
		recycleRuleRepo: crrepo.NewLeadPoolRecycleRuleRepo(),
		leadRepo:        crrepo.NewLeadRepo(),
	}
}

// ── 线索池配置 ──

// CreateLeadPoolRequest 创建线索公海池请求。Enabled 为 nil 时默认启用。
type CreateLeadPoolRequest struct {
	Name         string `json:"name" binding:"required"`
	ScopeDeptIDs string `json:"scope_dept_ids"`
	ScopeRoleIDs string `json:"scope_role_ids"`
	AdminUserIDs string `json:"admin_user_ids"`
	Enabled      *int8  `json:"enabled"`
	AutoRecycle  int8   `json:"auto_recycle"`
}

func (s *LeadPoolService) CreatePool(ctx context.Context, req *CreateLeadPoolRequest) (*crmmodel.CrmLeadPool, error) {
	enabled := int8(1)
	if req.Enabled != nil {
		enabled = *req.Enabled
	}
	p := &crmmodel.CrmLeadPool{
		Name: req.Name, ScopeDeptIDs: req.ScopeDeptIDs, ScopeRoleIDs: req.ScopeRoleIDs,
		AdminUserIDs: req.AdminUserIDs, Enabled: enabled, AutoRecycle: req.AutoRecycle,
	}
	if err := s.poolRepo.Create(ctx, p); err != nil {
		return nil, err
	}
	return p, nil
}

func (s *LeadPoolService) GetPool(ctx context.Context, id uint) (*crmmodel.CrmLeadPool, error) {
	p, err := s.poolRepo.GetByID(ctx, id)
	return p, notFoundOr(err, "线索公海池不存在")
}

// UpdateLeadPoolRequest 更新线索公海池请求。
type UpdateLeadPoolRequest struct {
	Name         string `json:"name" binding:"required"`
	ScopeDeptIDs string `json:"scope_dept_ids"`
	ScopeRoleIDs string `json:"scope_role_ids"`
	AdminUserIDs string `json:"admin_user_ids"`
	Enabled      int8   `json:"enabled"`
	AutoRecycle  int8   `json:"auto_recycle"`
}

func (s *LeadPoolService) UpdatePool(ctx context.Context, id uint, req *UpdateLeadPoolRequest) error {
	p, err := s.poolRepo.GetByID(ctx, id)
	if err != nil {
		return notFoundOr(err, "线索公海池不存在")
	}
	p.Name = req.Name
	p.ScopeDeptIDs = req.ScopeDeptIDs
	p.ScopeRoleIDs = req.ScopeRoleIDs
	p.AdminUserIDs = req.AdminUserIDs
	p.Enabled = req.Enabled
	p.AutoRecycle = req.AutoRecycle
	return s.poolRepo.Update(ctx, p)
}

func (s *LeadPoolService) DeletePool(ctx context.Context, id uint) error {
	if _, err := s.poolRepo.GetByID(ctx, id); err != nil {
		return notFoundOr(err, "线索公海池不存在")
	}
	return s.poolRepo.Delete(ctx, id)
}

func (s *LeadPoolService) ListEnabledPools(ctx context.Context) ([]crmmodel.CrmLeadPool, error) {
	return s.poolRepo.ListEnabled(ctx)
}

func (s *LeadPoolService) ListPools(ctx context.Context) ([]crmmodel.CrmLeadPool, error) {
	return s.poolRepo.ListAll(ctx)
}

// ── 领取/回收规则(1:1,pool_id 主键,upsert) ──

func (s *LeadPoolService) SetPickRule(ctx context.Context, poolID uint, rule *crmmodel.CrmLeadPoolPickRule) error {
	rule.PoolID = poolID
	_, err := s.pickRuleRepo.GetByPool(ctx, poolID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return s.pickRuleRepo.Create(ctx, rule)
		}
		return err
	}
	return s.pickRuleRepo.Update(ctx, rule)
}

func (s *LeadPoolService) SetRecycleRule(ctx context.Context, poolID uint, rule *crmmodel.CrmLeadPoolRecycleRule) error {
	rule.PoolID = poolID
	_, err := s.recycleRuleRepo.GetByPool(ctx, poolID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return s.recycleRuleRepo.Create(ctx, rule)
		}
		return err
	}
	return s.recycleRuleRepo.Update(ctx, rule)
}

// ── 手动回收 ──

// ManualRecycle 手动触发线索回收:取池的回收规则,扫描全部私海线索(in_pool=0),
// 对 owner 非空的线索用 pool.ShouldRecycle 判断,满足则回收到该池。返回回收数量。
func (s *LeadPoolService) ManualRecycle(ctx context.Context, poolID, operatorID uint) (int, error) {
	rule, err := s.recycleRuleRepo.GetByPool(ctx, poolID)
	if err != nil {
		return 0, notFoundOr(err, "回收规则不存在")
	}
	leads, err := s.leadRepo.List(ctx, &repository.QueryOptions{
		Where: map[string]interface{}{"in_pool": crmmodel.InPoolPrivate},
	})
	if err != nil {
		return 0, err
	}
	now := time.Now()
	count := 0
	for i := range leads {
		l := &leads[i]
		if l.OwnerID == nil {
			continue
		}
		target := recyclableLead{followTime: l.FollowTime.Ptr(), storageTime: l.CollectionTime.Ptr()}
		if !pool.ShouldRecycle(rule.Operator, rule.Conditions, target, now) {
			continue
		}
		if err := s.releaseToPoolInternal(ctx, l, poolID); err != nil {
			return count, err
		}
		count++
	}
	return count, nil
}

// releaseToPoolInternal 将私海线索回收到指定公海池。
func (s *LeadPoolService) releaseToPoolInternal(ctx context.Context, l *crmmodel.CrmLead, poolID uint) error {
	return repository.Transaction(ctx, func(ctx context.Context) error {
		l.InPool = crmmodel.InPoolPublic
		l.PoolID = &poolID
		l.OwnerID = nil
		l.CollectionTime = xtime.NullDateTime{}
		l.PoolReason = "超期未跟进自动回收"
		return s.leadRepo.Update(ctx, l)
	})
}

// recyclableLead 把 CrmLead 适配为 pool.Recyclable。
type recyclableLead struct {
	followTime  *time.Time
	storageTime *time.Time
}

func (r recyclableLead) GetLastFollowTime() *time.Time { return r.followTime }
func (r recyclableLead) GetStorageTime() *time.Time    { return r.storageTime }
