package crm

import (
	"context"

	crmmodel "qzt-go-server/internal/model/crm"
	"qzt-go-server/internal/repository"
)

// lead.go 线索 + 线索公海池 repository。
// 嵌入 repository.BaseRepo[T] 获得通用 CRUD;按需覆写带特定查询的方法。
// 线索公海镜像客户公海(pool.go),规则表 1:1(pool_id 主键)。

// ── 线索 ──

type LeadRepo struct {
	repository.BaseRepo[crmmodel.CrmLead]
}

func NewLeadRepo() *LeadRepo { return &LeadRepo{} }

// GetByID 覆写:无需预加载。
func (r *LeadRepo) GetByID(ctx context.Context, id uint) (*crmmodel.CrmLead, error) {
	return r.BaseRepo.GetByID(ctx, id)
}

// Update 覆写:白名单含全部公海字段 + 转化字段,确保公海状态变更能持久化。
func (r *LeadRepo) Update(ctx context.Context, m *crmmodel.CrmLead) error {
	return r.BaseRepo.Update(ctx, m,
		"Name", "LeadNo", "ContactName", "Phone", "Email", "Company",
		"Level", "Source", "Status", "Industry",
		"OwnerID", "FollowerID", "FollowTime", "InPool", "PoolID", "CollectionTime", "PoolReason",
		"ConvertedCustomerID", "ConvertedAt")
}

// CountByOwner 统计某用户私海线索数(容量校验用)。
func (r *LeadRepo) CountByOwner(ctx context.Context, ownerID uint) (int64, error) {
	return r.Count(ctx, &repository.QueryOptions{
		Where: map[string]any{"owner_id": ownerID, "in_pool": crmmodel.InPoolPrivate},
	})
}

// CountByNoPrefix 统计 lead_no LIKE 前缀% 且非空的记录数(自动编号规则 X 推算用)。
func (r *LeadRepo) CountByNoPrefix(ctx context.Context, prefix string) (int64, error) {
	var n int64
	err := repoDB(ctx).Model(&crmmodel.CrmLead{}).
		Where("lead_no LIKE ?", prefix+"%").
		Where("lead_no != ''").
		Count(&n).Error
	return n, err
}

// ── 线索归属历史 ──

type LeadOwnerHistoryRepo struct {
	repository.BaseRepo[crmmodel.CrmLeadOwnerHistory]
}

func NewLeadOwnerHistoryRepo() *LeadOwnerHistoryRepo { return &LeadOwnerHistoryRepo{} }

// ListByLead 按线索列归属变更历史。
func (r *LeadOwnerHistoryRepo) ListByLead(ctx context.Context, leadID uint) ([]crmmodel.CrmLeadOwnerHistory, error) {
	return r.List(ctx, &repository.QueryOptions{
		Where: map[string]any{"lead_id": leadID},
		Order: []string{"id DESC"},
	})
}

// ── 线索公海池 ──

type LeadPoolRepo struct {
	repository.BaseRepo[crmmodel.CrmLeadPool]
}

func NewLeadPoolRepo() *LeadPoolRepo { return &LeadPoolRepo{} }

// Create 覆盖泛型版本(同 customer pool:Enabled 零值 0 能正常写入,service 层默认 1)。
func (r *LeadPoolRepo) Create(ctx context.Context, m *crmmodel.CrmLeadPool) error {
	return repoDB(ctx).Create(m).Error
}

func (r *LeadPoolRepo) Update(ctx context.Context, m *crmmodel.CrmLeadPool) error {
	return r.BaseRepo.Update(ctx, m, "Name", "ScopeDeptIDs", "ScopeRoleIDs", "AdminUserIDs", "Enabled", "AutoRecycle")
}

// ListAutoRecycleIDs 列出启用自动回收的线索公海池 ID(定时回收任务用)。
func (r *LeadPoolRepo) ListAutoRecycleIDs(ctx context.Context) ([]uint, error) {
	var ids []uint
	err := repoDB(ctx).Model(&crmmodel.CrmLeadPool{}).
		Where("auto_recycle = ?", 1).
		Pluck("id", &ids).Error
	return ids, err
}

// ListEnabled 列出启用的线索公海池(enabled=1)。
func (r *LeadPoolRepo) ListEnabled(ctx context.Context) ([]crmmodel.CrmLeadPool, error) {
	return r.List(ctx, &repository.QueryOptions{
		Where: map[string]any{"enabled": 1},
		Order: []string{"id ASC"},
	})
}

// ListAll 列出全部线索公海池(含禁用,管理端用)。
func (r *LeadPoolRepo) ListAll(ctx context.Context) ([]crmmodel.CrmLeadPool, error) {
	return r.List(ctx, &repository.QueryOptions{
		Order: []string{"enabled DESC", "id ASC"},
	})
}

// ── 线索领取规则 ──

type LeadPoolPickRuleRepo struct {
	repository.BaseRepo[crmmodel.CrmLeadPoolPickRule]
}

func NewLeadPoolPickRuleRepo() *LeadPoolPickRuleRepo { return &LeadPoolPickRuleRepo{} }

func (r *LeadPoolPickRuleRepo) GetByPool(ctx context.Context, poolID uint) (*crmmodel.CrmLeadPoolPickRule, error) {
	return r.GetOne(ctx, &repository.QueryOptions{Where: map[string]any{"pool_id": poolID}})
}

// ── 线索回收规则 ──

type LeadPoolRecycleRuleRepo struct {
	repository.BaseRepo[crmmodel.CrmLeadPoolRecycleRule]
}

func NewLeadPoolRecycleRuleRepo() *LeadPoolRecycleRuleRepo { return &LeadPoolRecycleRuleRepo{} }

func (r *LeadPoolRecycleRuleRepo) GetByPool(ctx context.Context, poolID uint) (*crmmodel.CrmLeadPoolRecycleRule, error) {
	return r.GetOne(ctx, &repository.QueryOptions{Where: map[string]any{"pool_id": poolID}})
}
