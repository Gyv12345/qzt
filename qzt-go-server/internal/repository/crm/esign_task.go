package crm

import (
	"context"
	"time"

	crmmodel "qzt-go-server/internal/model/crm"
	"qzt-go-server/internal/repository"
)

// esign_task.go 电子签任务 repository。
// 嵌入 BaseRepo[CrmEsignTask] 获得通用 CRUD;补 cron 扫表与状态机流转所需查询。
// 表由 docs/sql/esign.sql 建立,不用 AutoMigrate。

type EsignTaskRepo struct {
	repository.BaseRepo[crmmodel.CrmEsignTask]
}

func NewEsignTaskRepo() *EsignTaskRepo { return &EsignTaskRepo{} }

// GetByContractID 取合同最新一条电子签任务(按 id DESC)。
// 一个合同可能有多条历史任务(失败重发等),取最新一条展示当前签署状态。
func (r *EsignTaskRepo) GetByContractID(ctx context.Context, contractID uint) (*crmmodel.CrmEsignTask, error) {
	return r.GetOne(ctx, &repository.QueryOptions{
		Where: map[string]any{"contract_id": contractID},
		Order: []string{"id DESC"},
	})
}

// GetByFlowID 按 e签宝流程 ID 查任务(签署回调定位用)。
func (r *EsignTaskRepo) GetByFlowID(ctx context.Context, flowID string) (*crmmodel.CrmEsignTask, error) {
	return r.GetOne(ctx, &repository.QueryOptions{
		Where: map[string]any{"flow_id": flowID},
	})
}

// ListRetryable 列出待 cron 处理的任务:
//   - status=PENDING:新任务,立即渲染 PDF;
//   - status=FAILED 且 next_retry_at 为空或已到期(before):退避到期重试。
//
// 按 id ASC 顺序处理,limit 控制单批规模(避免单次拉满)。
func (r *EsignTaskRepo) ListRetryable(ctx context.Context, before time.Time, limit int) ([]crmmodel.CrmEsignTask, error) {
	var tasks []crmmodel.CrmEsignTask
	err := repoDB(ctx).
		Where("status = ? OR (status = ? AND (next_retry_at IS NULL OR next_retry_at <= ?))",
			crmmodel.EsignTaskPending, crmmodel.EsignTaskFailed, before).
		Order("id ASC").Limit(limit).Find(&tasks).Error
	return tasks, err
}

// MarkRunning 原子置 RUNNING,仅当当前处于 PENDING/FAILED(非终态)。
// 返回受影响行数:0 表示已被其他 worker 抢占或状态已变,调用方应跳过。
func (r *EsignTaskRepo) MarkRunning(ctx context.Context, id uint) (int64, error) {
	res := repoDB(ctx).Model(&crmmodel.CrmEsignTask{}).
		Where("id = ? AND status IN ?", id, []string{crmmodel.EsignTaskPending, crmmodel.EsignTaskFailed}).
		Update("status", crmmodel.EsignTaskRunning)
	return res.RowsAffected, res.Error
}

// UpdateColumns 批量更新指定列(状态机流转、回填 flow_id/file_key/sign_url/signers 等)。
func (r *EsignTaskRepo) UpdateColumns(ctx context.Context, id uint, cols map[string]any) error {
	return repoDB(ctx).Model(&crmmodel.CrmEsignTask{}).Where("id = ?", id).UpdateColumns(cols).Error
}

// HasActiveTask 判断合同是否存在未到终态(READY/INITIATED/COMPLETED 之前)的任务。
// 用于审批通过插任务前查重,避免重复发起。
func (r *EsignTaskRepo) HasActiveTask(ctx context.Context, contractID uint) (bool, error) {
	count, err := r.Count(ctx, &repository.QueryOptions{
		Where: map[string]any{
			"contract_id": contractID,
			"status": []string{
				crmmodel.EsignTaskPending,
				crmmodel.EsignTaskRunning,
				crmmodel.EsignTaskReady,
				crmmodel.EsignTaskInitiated,
			},
		},
	})
	return count > 0, err
}
