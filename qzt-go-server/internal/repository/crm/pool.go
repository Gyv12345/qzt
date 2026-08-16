package crm

import (
	"context"

	crmmodel "qzt-go-server/internal/model/crm"
	"qzt-go-server/internal/repository"
)

// pool.go 公海池 repository(配置/规则/隐藏字段/容量/归属历史)。

type CustomerPoolRepo struct {
	repository.BaseRepo[crmmodel.CrmCustomerPool]
}

func NewCustomerPoolRepo() *CustomerPoolRepo { return &CustomerPoolRepo{} }

// Create 覆盖泛型版本:model 的 Enabled 已去掉 gorm default tag,
// 零值 0(禁用)能正常写入。service 层保证未传时默认为 1。
func (r *CustomerPoolRepo) Create(ctx context.Context, m *crmmodel.CrmCustomerPool) error {
	return repoDB(ctx).Create(m).Error
}

func (r *CustomerPoolRepo) Update(ctx context.Context, m *crmmodel.CrmCustomerPool) error {
	return r.BaseRepo.Update(ctx, m, "Name", "ScopeDeptIDs", "ScopeRoleIDs", "AdminUserIDs", "Enabled", "AutoRecycle")
}

// ListAutoRecycleIDs 列出启用自动回收的公海池 ID(定时回收任务用)。
func (r *CustomerPoolRepo) ListAutoRecycleIDs(ctx context.Context) ([]uint, error) {
	var ids []uint
	err := repoDB(ctx).Model(&crmmodel.CrmCustomerPool{}).
		Where("auto_recycle = ?", 1).
		Pluck("id", &ids).Error
	return ids, err
}

// ListEnabled 列出启用的公海池(enabled=1)。
func (r *CustomerPoolRepo) ListEnabled(ctx context.Context) ([]crmmodel.CrmCustomerPool, error) {
	return r.List(ctx, &repository.QueryOptions{
		Where: map[string]any{"enabled": 1},
		Order: []string{"id ASC"},
	})
}

// ListAll 列出全部公海池(含禁用,管理端用)。
func (r *CustomerPoolRepo) ListAll(ctx context.Context) ([]crmmodel.CrmCustomerPool, error) {
	return r.List(ctx, &repository.QueryOptions{
		Order: []string{"enabled DESC", "id ASC"},
	})
}

// ── 领取规则 ──

type PoolPickRuleRepo struct {
	repository.BaseRepo[crmmodel.CrmCustomerPoolPickRule]
}

func NewPoolPickRuleRepo() *PoolPickRuleRepo { return &PoolPickRuleRepo{} }

func (r *PoolPickRuleRepo) GetByPool(ctx context.Context, poolID uint) (*crmmodel.CrmCustomerPoolPickRule, error) {
	return r.GetOne(ctx, &repository.QueryOptions{Where: map[string]any{"pool_id": poolID}})
}

// ── 回收规则 ──

type PoolRecycleRuleRepo struct {
	repository.BaseRepo[crmmodel.CrmCustomerPoolRecycleRule]
}

func NewPoolRecycleRuleRepo() *PoolRecycleRuleRepo { return &PoolRecycleRuleRepo{} }

func (r *PoolRecycleRuleRepo) GetByPool(ctx context.Context, poolID uint) (*crmmodel.CrmCustomerPoolRecycleRule, error) {
	return r.GetOne(ctx, &repository.QueryOptions{Where: map[string]any{"pool_id": poolID}})
}

// ── 归属历史 ──

type CustomerOwnerHistoryRepo struct {
	repository.BaseRepo[crmmodel.CrmCustomerOwnerHistory]
}

func NewCustomerOwnerHistoryRepo() *CustomerOwnerHistoryRepo { return &CustomerOwnerHistoryRepo{} }

// ListByCustomer 按客户列归属变更历史。
func (r *CustomerOwnerHistoryRepo) ListByCustomer(ctx context.Context, customerID uint) ([]crmmodel.CrmCustomerOwnerHistory, error) {
	return r.List(ctx, &repository.QueryOptions{
		Where: map[string]any{"customer_id": customerID},
		Order: []string{"id DESC"},
	})
}
