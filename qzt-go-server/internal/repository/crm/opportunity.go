package crm

import (
	"context"

	crmmodel "qzt-go-server/internal/model/crm"
	"qzt-go-server/internal/repository"
)

// opportunity.go 商机 repository。

type OpportunityRepo struct {
	repository.BaseRepo[crmmodel.CrmOpportunity]
}

func NewOpportunityRepo() *OpportunityRepo { return &OpportunityRepo{} }

func (r *OpportunityRepo) Update(ctx context.Context, m *crmmodel.CrmOpportunity) error {
	return r.BaseRepo.Update(ctx, m,
		"Name", "OpportunityNo", "CustomerID", "ExpectedAmount", "ExpectedCloseDate", "Stage", "Probability",
		"OwnerID", "FollowerID", "FollowTime", "SourceClueID", "Description")
}

// CountByNoPrefix 统计 opportunity_no LIKE 前缀% 且非空的记录数(自动编号规则 SJ 推算用)。
func (r *OpportunityRepo) CountByNoPrefix(ctx context.Context, prefix string) (int64, error) {
	var n int64
	err := repoDB(ctx).Unscoped().Model(&crmmodel.CrmOpportunity{}).
		Where("opportunity_no LIKE ?", prefix+"%").
		Where("opportunity_no != ''").
		Count(&n).Error
	return n, err
}

// ListByStage 按阶段分组(看板用)。
func (r *OpportunityRepo) ListByStage(ctx context.Context, stage string) ([]crmmodel.CrmOpportunity, error) {
	q := &repository.QueryOptions{Order: []string{"id DESC"}}
	if stage != "" {
		q.Where = map[string]any{"stage": stage}
	}
	return r.List(ctx, q)
}
