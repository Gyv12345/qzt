package crm

import (
	"context"

	crmmodel "qzt-go-server/internal/model/crm"
	"qzt-go-server/internal/repository"
)

// stage.go 阶段配置 + 阶段变更记录 repository。

type StageConfigRepo struct {
	repository.BaseRepo[crmmodel.StageConfig]
}

func NewStageConfigRepo() *StageConfigRepo { return &StageConfigRepo{} }

func (r *StageConfigRepo) Update(ctx context.Context, m *crmmodel.StageConfig) error {
	return r.BaseRepo.Update(ctx, m, "Name", "StagesJSON", "Enabled")
}

// GetByBizType 按业务类型取阶段配置。
func (r *StageConfigRepo) GetByBizType(ctx context.Context, bizType string) (*crmmodel.StageConfig, error) {
	return r.GetOne(ctx, &repository.QueryOptions{Where: map[string]any{"biz_type": bizType}})
}

// ── 阶段记录 ──

type StageRecordRepo struct {
	repository.BaseRepo[crmmodel.StageRecord]
}

func NewStageRecordRepo() *StageRecordRepo { return &StageRecordRepo{} }

// ListByResource 按业务类型+资源ID列阶段变更历史。
func (r *StageRecordRepo) ListByResource(ctx context.Context, bizType string, resourceID uint) ([]crmmodel.StageRecord, error) {
	return r.List(ctx, &repository.QueryOptions{
		Where: map[string]any{"biz_type": bizType, "resource_id": resourceID},
		Order: []string{"id DESC"},
	})
}
