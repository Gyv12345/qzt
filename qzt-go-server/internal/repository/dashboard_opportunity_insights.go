package repository

import (
	"context"
	"time"

	crmmodel "qzt-go-server/internal/model/crm"
)

// OpportunityInsightSource 返回阶段配置与带数据权限的历史,供 Service 计算洞察。
func (r *DashboardRepo) OpportunityInsightSource(ctx context.Context, since time.Time, ds *Cond) (string, []crmmodel.StageRecord, error) {
	var config crmmodel.StageConfig
	if err := dbFrom(ctx).Table("stage_config").
		Select("id, biz_type, stages_json").
		Where("biz_type = ? AND enabled = 1", crmmodel.StageBizOpportunity).
		Limit(1).Scan(&config).Error; err != nil {
		return "", nil, err
	}

	q := dbFrom(ctx).Table("stage_record AS sr").
		Joins("JOIN crm_opportunity AS o ON o.id = sr.resource_id AND o.deleted_at IS NULL").
		Where("sr.biz_type = ?", crmmodel.StageBizOpportunity).
		Where("sr.created_at IS NOT NULL AND sr.created_at >= ?", since)
	if ds != nil {
		q = q.Where(ds.Query, ds.Args...)
	}
	var records []crmmodel.StageRecord
	err := q.Select("sr.id, sr.biz_type, sr.resource_id, sr.from_stage, sr.to_stage, sr.operator_id, sr.reason, sr.lost_reason, sr.created_at").
		Order("sr.resource_id ASC, sr.created_at ASC, sr.id ASC").
		Scan(&records).Error
	return config.StagesJSON, records, err
}
