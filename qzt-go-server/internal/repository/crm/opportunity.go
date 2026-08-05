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

// ListByStage 按阶段分组(看板用)。
func (r *OpportunityRepo) ListByStage(ctx context.Context, stage string) ([]crmmodel.CrmOpportunity, error) {
	q := &repository.QueryOptions{Order: []string{"id DESC"}}
	if stage != "" {
		q.Where = map[string]interface{}{"stage": stage}
	}
	return r.List(ctx, q)
}
