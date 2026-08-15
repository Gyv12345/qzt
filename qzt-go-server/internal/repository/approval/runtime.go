package approval

import (
	"context"

	apprmodel "qzt-go-server/internal/model/approval"
	"qzt-go-server/internal/repository"
)

// runtime.go 审批运行时 repository(instance/task/record/addsign/returnback)。

// ── 实例 ──

type InstanceRepo struct {
	repository.BaseRepo[apprmodel.ApprovalInstance]
}

func NewInstanceRepo() *InstanceRepo { return &InstanceRepo{} }

// PageByApprover 按审批人分页查询待办(approval_task JOIN approval_instance)。
func (r *InstanceRepo) PageByApprover(ctx context.Context, page, pageSize int, approverID uint, taskStatus string) ([]apprmodel.ApprovalInstance, int64, error) {
	var list []apprmodel.ApprovalInstance
	var total int64

	subQuery := repoDB(ctx).Model(&apprmodel.ApprovalTask{}).
		Select("DISTINCT instance_id").
		Where("approver_id = ? AND node_round >= 0", approverID)
	if taskStatus != "" {
		subQuery = subQuery.Where("status = ?", taskStatus)
	}

	db := repoDB(ctx).Model(&apprmodel.ApprovalInstance{}).Where("id IN (?)", subQuery)
	if err := db.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	if err := db.Order("id DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&list).Error; err != nil {
		return nil, 0, err
	}
	return list, total, nil
}

// PageBySubmitter 按提交人分页查询(我发起的)。
func (r *InstanceRepo) PageBySubmitter(ctx context.Context, page, pageSize int, submitterID uint) ([]apprmodel.ApprovalInstance, int64, error) {
	q := &repository.QueryOptions{
		Where: map[string]any{"submitter_id": submitterID},
		Order: []string{"id DESC"},
	}
	return r.PageList(ctx, page, pageSize, q)
}

// Update 覆写。
func (r *InstanceRepo) Update(ctx context.Context, m *apprmodel.ApprovalInstance) error {
	return r.BaseRepo.Update(ctx, m, "CurrentNodeID", "ApprovalStatus", "ApprovalTime", "Comment")
}

// HasInstance 判断某业务资源是否已有审批实例(任何状态)。
// 供各业务模块的 Delete 调用:已进入审批流程的记录不允许删除,避免出现孤儿审批实例。
func HasInstance(ctx context.Context, formType string, resourceID uint) bool {
	var cnt int64
	repoDB(ctx).Model(&apprmodel.ApprovalInstance{}).
		Where("type = ? AND resource_id = ?", formType, resourceID).
		Count(&cnt)
	return cnt > 0
}

// ── 任务 ──

type TaskRepo struct {
	repository.BaseRepo[apprmodel.ApprovalTask]
}

func NewTaskRepo() *TaskRepo { return &TaskRepo{} }

// ListByInstanceNode 按 instance + node 列出有效任务(node_round >= 0)。
func (r *TaskRepo) ListByInstanceNode(ctx context.Context, instanceID, nodeID uint) ([]apprmodel.ApprovalTask, error) {
	var tasks []apprmodel.ApprovalTask
	err := repoDB(ctx).Where("instance_id = ? AND node_id = ? AND node_round >= 0", instanceID, nodeID).
		Order("id ASC").Find(&tasks).Error
	return tasks, err
}

// PageByApprover 按审批人分页查询任务。
func (r *TaskRepo) PageByApprover(ctx context.Context, page, pageSize int, approverID uint, status string) ([]apprmodel.ApprovalTask, int64, error) {
	var list []apprmodel.ApprovalTask
	var total int64
	db := repoDB(ctx).Model(&apprmodel.ApprovalTask{}).Where("approver_id = ? AND node_round >= 0", approverID)
	if status != "" {
		db = db.Where("status = ?", status)
	}
	if err := db.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	if err := db.Order("id DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&list).Error; err != nil {
		return nil, 0, err
	}
	return list, total, nil
}

// Update 覆写。
func (r *TaskRepo) Update(ctx context.Context, m *apprmodel.ApprovalTask) error {
	return r.BaseRepo.Update(ctx, m, "Status", "Action", "NodeRound")
}

// SoftDeleteByInstanceNode 软删指定实例+节点的任务(node_round 置 -1)。
func (r *TaskRepo) SoftDeleteByInstanceNode(ctx context.Context, instanceID, nodeID uint) error {
	return repoDB(ctx).Model(&apprmodel.ApprovalTask{}).
		Where("instance_id = ? AND node_id = ?", instanceID, nodeID).
		Update("node_round", -1).Error
}

// ── 审批记录 ──

type RecordRepo struct {
	repository.BaseRepo[apprmodel.ApprovalRecord]
}

func NewRecordRepo() *RecordRepo { return &RecordRepo{} }

// ListByInstance 按实例列出审批记录(按 id ASC,即时间顺序)。
func (r *RecordRepo) ListByInstance(ctx context.Context, instanceID uint) ([]apprmodel.ApprovalRecord, error) {
	var records []apprmodel.ApprovalRecord
	err := repoDB(ctx).Where("instance_id = ?", instanceID).Order("id ASC").Find(&records).Error
	return records, err
}

// ── 加签任务 ──

type AddSignTaskRepo struct {
	repository.BaseRepo[apprmodel.ApprovalAddSignTask]
}

func NewAddSignTaskRepo() *AddSignTaskRepo { return &AddSignTaskRepo{} }

// ── 退回记录 ──

type ReturnBackRecordRepo struct {
	repository.BaseRepo[apprmodel.ApprovalReturnBackRecord]
}

func NewReturnBackRecordRepo() *ReturnBackRecordRepo { return &ReturnBackRecordRepo{} }

// ListByInstance 按实例列出退回记录。
func (r *ReturnBackRecordRepo) ListByInstance(ctx context.Context, instanceID uint) ([]apprmodel.ApprovalReturnBackRecord, error) {
	var records []apprmodel.ApprovalReturnBackRecord
	err := repoDB(ctx).Where("instance_id = ?", instanceID).Order("id ASC").Find(&records).Error
	return records, err
}
