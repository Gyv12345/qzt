package crm

import (
	"context"

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

// Timeline 按资源(客户/商机/联系人/合同)查跟进记录时间线。
// field 为列名(customer_id/opportunity_id/contact_id/contract_id),value 为资源 ID。
func (r *FollowUpRecordRepo) Timeline(ctx context.Context, field string, value uint) ([]crmmodel.FollowUpRecord, error) {
	return r.List(ctx, &repository.QueryOptions{
		Where: map[string]interface{}{field: value},
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
		Where: map[string]interface{}{"owner_id": ownerID, "status": crmmodel.PlanStatusTodo},
		Order: []string{"plan_time ASC"},
	})
}
