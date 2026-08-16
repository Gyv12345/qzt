package crm

import (
	"context"
	"time"

	crmmodel "qzt-go-server/internal/model/crm"
	"qzt-go-server/internal/repository"
)

// follow.go 跟进记录 + 跟进计划 repository。

type FollowUpRecordRepo struct {
	repository.BaseRepo[crmmodel.FollowUpRecord]
}

func NewFollowUpRecordRepo() *FollowUpRecordRepo { return &FollowUpRecordRepo{} }

func (r *FollowUpRecordRepo) Update(ctx context.Context, m *crmmodel.FollowUpRecord) error {
	return r.BaseRepo.Update(ctx, m, "FollowNo", "Type", "Content", "FollowTime")
}

// CountByNoPrefix 统计 follow_no LIKE 前缀% 且非空的记录数(自动编号规则 GJ 推算用)。
func (r *FollowUpRecordRepo) CountByNoPrefix(ctx context.Context, prefix string) (int64, error) {
	var n int64
	err := repoDB(ctx).Model(&crmmodel.FollowUpRecord{}).
		Where("follow_no LIKE ?", prefix+"%").
		Where("follow_no != ''").
		Count(&n).Error
	return n, err
}

// StaleFollowupRow 跟进提醒扫描行:Baseline 为"未跟进天数"的基准时间(Followed 为 nil 表示从未跟进)。
type StaleFollowupRow struct {
	Name     string
	OwnerID  *uint
	Baseline *time.Time
	Followed *time.Time
}

// ScanStaleFollowup 扫描某实体表中 owner 非空且基准时间早于 cutoff 的记录(跟进逾期提醒用)。
// baselineExpr 为基准时间 SQL 表达式的服务端常量(follow_time 为空回退领取/创建时间),
// extra/extraArgs 为附加过滤(如 in_pool = 私海);model 为 GORM 模型指针。
func ScanStaleFollowup(ctx context.Context, model any, baselineExpr string, cutoff time.Time, extra string, extraArgs []any) ([]StaleFollowupRow, error) {
	var rows []StaleFollowupRow
	q := repoDB(ctx).Model(model).
		Select("name, owner_id, "+baselineExpr+" AS baseline, follow_time AS followed").
		Where("owner_id IS NOT NULL").
		Where(baselineExpr+" < ?", cutoff)
	if extra != "" {
		q = q.Where(extra, extraArgs...)
	}
	err := q.Scan(&rows).Error
	return rows, err
}

// Timeline 按资源(客户/商机/联系人/合同)查跟进记录时间线。
// field 为列名(customer_id/opportunity_id/contact_id/contract_id),value 为资源 ID。
func (r *FollowUpRecordRepo) Timeline(ctx context.Context, field string, value uint) ([]crmmodel.FollowUpRecord, error) {
	return r.List(ctx, &repository.QueryOptions{
		Where: map[string]any{field: value},
		Order: []string{"follow_time DESC"},
	})
}

// ── 跟进计划 ──

type FollowUpPlanRepo struct {
	repository.BaseRepo[crmmodel.FollowUpPlan]
}

func NewFollowUpPlanRepo() *FollowUpPlanRepo { return &FollowUpPlanRepo{} }

func (r *FollowUpPlanRepo) Update(ctx context.Context, m *crmmodel.FollowUpPlan) error {
	return r.BaseRepo.Update(ctx, m, "Type", "Content", "PlanTime", "RemindTime", "Status")
}

// MyTodos 查某用户的待办计划(status=0)。
func (r *FollowUpPlanRepo) MyTodos(ctx context.Context, ownerID uint) ([]crmmodel.FollowUpPlan, error) {
	return r.List(ctx, &repository.QueryOptions{
		Where: map[string]any{"owner_id": ownerID, "status": crmmodel.PlanStatusTodo},
		Order: []string{"plan_time ASC"},
	})
}
