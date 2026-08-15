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

// pool.go 公海池服务:池配置 + 领取/回收规则(1:1 upsert)+ 手动回收。
// 回收对象:私海客户(in_pool=0 且 owner 非空)中长期未跟进者。
// 客户 model 未实现 pool.Recyclable,用 recyclableCustomer 适配器包装。

// PoolService 公海池服务。
type PoolService struct {
	poolRepo        *crrepo.CustomerPoolRepo
	pickRuleRepo    *crrepo.PoolPickRuleRepo
	recycleRuleRepo *crrepo.PoolRecycleRuleRepo
	customerRepo    *crrepo.CustomerRepo
}

func NewPoolService() *PoolService {
	return &PoolService{
		poolRepo:        crrepo.NewCustomerPoolRepo(),
		pickRuleRepo:    crrepo.NewPoolPickRuleRepo(),
		recycleRuleRepo: crrepo.NewPoolRecycleRuleRepo(),
		customerRepo:    crrepo.NewCustomerRepo(),
	}
}

// ── 公海池配置 ──

// CreatePoolRequest 创建公海池请求。Enabled 为 nil 时默认启用。
type CreatePoolRequest struct {
	Name         string `json:"name" binding:"required"`
	ScopeDeptIDs string `json:"scope_dept_ids"`
	ScopeRoleIDs string `json:"scope_role_ids"`
	AdminUserIDs string `json:"admin_user_ids"`
	Enabled      *int8  `json:"enabled"`
	AutoRecycle  int8   `json:"auto_recycle"`
}

// CreatePool 创建公海池(Enabled 未传时默认启用)。
func (s *PoolService) CreatePool(ctx context.Context, req *CreatePoolRequest) (*crmmodel.CrmCustomerPool, error) {
	enabled := int8(1)
	if req.Enabled != nil {
		enabled = *req.Enabled
	}
	p := &crmmodel.CrmCustomerPool{
		Name: req.Name, ScopeDeptIDs: req.ScopeDeptIDs, ScopeRoleIDs: req.ScopeRoleIDs,
		AdminUserIDs: req.AdminUserIDs, Enabled: enabled, AutoRecycle: req.AutoRecycle,
	}
	if err := s.poolRepo.Create(ctx, p); err != nil {
		return nil, err
	}
	return p, nil
}

// GetPool 公海池详情。
func (s *PoolService) GetPool(ctx context.Context, id uint) (*crmmodel.CrmCustomerPool, error) {
	p, err := s.poolRepo.GetByID(ctx, id)
	return p, repository.NotFoundOr(err, "公海池不存在")
}

// UpdatePoolRequest 更新公海池请求。
type UpdatePoolRequest struct {
	Name         string `json:"name" binding:"required"`
	ScopeDeptIDs string `json:"scope_dept_ids"`
	ScopeRoleIDs string `json:"scope_role_ids"`
	AdminUserIDs string `json:"admin_user_ids"`
	Enabled      int8   `json:"enabled"`
	AutoRecycle  int8   `json:"auto_recycle"`
}

// UpdatePool 更新公海池。
func (s *PoolService) UpdatePool(ctx context.Context, id uint, req *UpdatePoolRequest) error {
	p, err := s.poolRepo.GetByID(ctx, id)
	if err != nil {
		return repository.NotFoundOr(err, "公海池不存在")
	}
	p.Name = req.Name
	p.ScopeDeptIDs = req.ScopeDeptIDs
	p.ScopeRoleIDs = req.ScopeRoleIDs
	p.AdminUserIDs = req.AdminUserIDs
	p.Enabled = req.Enabled
	p.AutoRecycle = req.AutoRecycle
	return s.poolRepo.Update(ctx, p)
}

// DeletePool 删除公海池(默认池不可删)。
func (s *PoolService) DeletePool(ctx context.Context, id uint) error {
	pool, err := s.poolRepo.GetByID(ctx, id)
	if err != nil {
		return repository.NotFoundOr(err, "公海池不存在")
	}
	if pool.IsDefault == 1 {
		return errors.New("默认公海池不可删除")
	}
	return s.poolRepo.Delete(ctx, id)
}

// ListEnabledPools 列出启用的公海池。
func (s *PoolService) ListEnabledPools(ctx context.Context) ([]crmmodel.CrmCustomerPool, error) {
	return s.poolRepo.ListEnabled(ctx)
}

// ListPools 列出全部公海池(含禁用,管理端用)。
func (s *PoolService) ListPools(ctx context.Context) ([]crmmodel.CrmCustomerPool, error) {
	return s.poolRepo.ListAll(ctx)
}

// ── 领取/回收规则(1:1,pool_id 主键,upsert) ──

// SetPickRule 设置池的领取规则(存在则更新,不存在则创建)。
func (s *PoolService) SetPickRule(ctx context.Context, poolID uint, rule *crmmodel.CrmCustomerPoolPickRule) error {
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

// SetRecycleRule 设置池的回收规则(存在则更新,不存在则创建)。
func (s *PoolService) SetRecycleRule(ctx context.Context, poolID uint, rule *crmmodel.CrmCustomerPoolRecycleRule) error {
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

// ManualRecycle 手动触发回收:取池的回收规则,扫描全部私海客户(in_pool=0),
// 对 owner 非空的客户用 pool.ShouldRecycle 判断,满足则回收到该池。返回回收数量。
func (s *PoolService) ManualRecycle(ctx context.Context, poolID, operatorID uint) (int, error) {
	rule, err := s.recycleRuleRepo.GetByPool(ctx, poolID)
	if err != nil {
		return 0, repository.NotFoundOr(err, "回收规则不存在")
	}
	customers, err := s.customerRepo.List(ctx, &repository.QueryOptions{
		Where: map[string]any{"in_pool": crmmodel.InPoolPrivate},
	})
	if err != nil {
		return 0, err
	}
	now := time.Now()
	count := 0
	for i := range customers {
		c := &customers[i]
		if c.OwnerID == nil {
			continue
		}
		target := recyclableCustomer{followTime: c.FollowTime.Ptr(), storageTime: c.CollectionTime.Ptr()}
		if !pool.ShouldRecycle(rule.Operator, rule.Conditions, target, now) {
			continue
		}
		if err := s.releaseToPoolInternal(ctx, c, poolID, operatorID); err != nil {
			return count, err
		}
		count++
	}
	return count, nil
}

// releaseToPoolInternal 将私海客户回收到指定公海池(置公海、清 owner、记原因)。
func (s *PoolService) releaseToPoolInternal(ctx context.Context, c *crmmodel.CrmCustomer, poolID, operatorID uint) error {
	return repository.Transaction(ctx, func(ctx context.Context) error {
		c.InPool = crmmodel.InPoolPublic
		c.PoolID = &poolID
		c.OwnerID = nil
		c.CollectionTime = xtime.NullDateTime{}
		c.PoolReason = "超期未跟进自动回收"
		return s.customerRepo.Update(ctx, c)
	})
}

// recyclableCustomer 把 CrmCustomer 适配为 pool.Recyclable。
type recyclableCustomer struct {
	followTime  *time.Time
	storageTime *time.Time
}

func (r recyclableCustomer) GetLastFollowTime() *time.Time { return r.followTime }
func (r recyclableCustomer) GetStorageTime() *time.Time    { return r.storageTime }
