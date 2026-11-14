// Package workflow 自动化工作流 repository(P27)。
// 嵌入 repository.BaseRepo[T] 获得通用 CRUD;按需补充特定查询。
package workflow

import (
	"context"
	"time"

	"gorm.io/gorm"

	wfmodel "qzt-go-server/internal/model/workflow"
	"qzt-go-server/internal/repository"
)

// DefinitionRepo 工作流定义仓储。
type DefinitionRepo struct {
	repository.BaseRepo[wfmodel.WorkflowDefinition]
}
func NewDefinitionRepo() *DefinitionRepo { return &DefinitionRepo{} }

// Update 覆写:白名单列(防全量覆盖)。
func (r *DefinitionRepo) Update(ctx context.Context, m *wfmodel.WorkflowDefinition) error {
	return r.BaseRepo.Update(ctx, m,
		"Name", "Description", "TriggerType", "TriggerConfig", "Graph", "Enabled")
}

// UpdateRunStats 回填最近运行时间与累计次数(引擎执行后回写)。
func (r *DefinitionRepo) UpdateRunStats(ctx context.Context, id uint, lastRunAt time.Time) error {
	return repository.DBFrom(ctx).Model(&wfmodel.WorkflowDefinition{}).
		Where("id = ?", id).
		Updates(map[string]any{
			"last_run_at": lastRunAt,
			"run_count":   gorm.Expr("run_count + 1"),
		}).Error
}

// RunRepo 执行记录仓储。
type RunRepo struct {
	repository.BaseRepo[wfmodel.WorkflowRun]
}

func NewRunRepo() *RunRepo { return &RunRepo{} }

// Update 覆写:白名单列。
func (r *RunRepo) Update(ctx context.Context, m *wfmodel.WorkflowRun) error {
	return r.BaseRepo.Update(ctx, m, "Status", "NodeTrace", "Error", "CostMs")
}

// Finish 回填终态(成功/失败)。
func (r *RunRepo) Finish(ctx context.Context, id uint, status, trace, errMsg string, costMs int64) error {
	return repository.DBFrom(ctx).Model(&wfmodel.WorkflowRun{}).
		Where("id = ?", id).
		Updates(map[string]any{
			"status":     status,
			"node_trace": trace,
			"error":      errMsg,
			"cost_ms":    costMs,
		}).Error
}

// ListByDefinition 该工作流的全部执行记录(带上限)。
func (r *RunRepo) ListByDefinition(ctx context.Context, defID uint, limit int) ([]wfmodel.WorkflowRun, error) {
	var list []wfmodel.WorkflowRun
	err := repository.DBFrom(ctx).
		Where("definition_id = ?", defID).
		Order("id DESC").Limit(limit).Find(&list).Error
	return list, err
}
