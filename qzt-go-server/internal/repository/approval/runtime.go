package approval

import (
	"context"

	apprmodel "qzt-go-server/internal/model/approval"
	"qzt-go-server/internal/repository"
	"qzt-go-server/pkg/xtime"
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

// ListByIDs 按 ID 列表批量查实例(待办/已办列表 enrichment 用)。
func (r *InstanceRepo) ListByIDs(ctx context.Context, ids []uint) ([]apprmodel.ApprovalInstance, error) {
	var list []apprmodel.ApprovalInstance
	err := repoDB(ctx).Where("id IN ?", ids).Find(&list).Error
	return list, err
}

// HasApproving 判断某业务资源是否存在审批中的活跃实例。
// 供 Push 防重复提审:审批中不允许再次提交;驳回/撤回后可重新发起。
func (r *InstanceRepo) HasApproving(ctx context.Context, formType string, resourceID uint) (bool, error) {
	var count int64
	err := repoDB(ctx).Model(&apprmodel.ApprovalInstance{}).
		Where("type = ? AND resource_id = ? AND approval_status = ?", formType, resourceID, apprmodel.StatusApproving).
		Count(&count).Error
	return count > 0, err
}

// HasApproved 判断某业务资源是否已存在审批通过的实例。
// 供 Push 防重复提审:已通过是业务终态(单据状态已落地,如合同 SIGNED),
// 再次 push 会生成与落地状态冲突的新实例,且驳回会污染已通过状态(R11-③)。
func (r *InstanceRepo) HasApproved(ctx context.Context, formType string, resourceID uint) (bool, error) {
	var count int64
	err := repoDB(ctx).Model(&apprmodel.ApprovalInstance{}).
		Where("type = ? AND resource_id = ? AND approval_status = ?", formType, resourceID, apprmodel.StatusApproved).
		Count(&count).Error
	return count > 0, err
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

// ListByInstance 按实例列出全部有效任务(node_round >= 0,按 id ASC)。审批详情用。
func (r *TaskRepo) ListByInstance(ctx context.Context, instanceID uint) ([]apprmodel.ApprovalTask, error) {
	var tasks []apprmodel.ApprovalTask
	err := repoDB(ctx).Where("instance_id = ? AND node_round >= 0", instanceID).
		Order("id ASC").Find(&tasks).Error
	return tasks, err
}

// ListAllByInstance 按实例列出全部任务(含流转后被软删的 node_round<0)。
// 供"全通过通知所有参与审批人"收集参与者——节点完成后任务即被软删,只能查全量。
func (r *TaskRepo) ListAllByInstance(ctx context.Context, instanceID uint) ([]apprmodel.ApprovalTask, error) {
	var tasks []apprmodel.ApprovalTask
	err := repoDB(ctx).Where("instance_id = ?", instanceID).
		Order("id ASC").Find(&tasks).Error
	return tasks, err
}

// MaxNodeRound 某实例某节点的当前最大轮次(0 表示首次)。
func (r *TaskRepo) MaxNodeRound(ctx context.Context, instanceID, nodeID uint) int {
	var maxRound int
	repoDB(ctx).Model(&apprmodel.ApprovalTask{}).
		Where("instance_id = ? AND node_id = ?", instanceID, nodeID).
		Select("COALESCE(MAX(node_round), 0)").Scan(&maxRound)
	return maxRound
}

// Update 覆写。
func (r *TaskRepo) Update(ctx context.Context, m *apprmodel.ApprovalTask) error {
	return r.BaseRepo.Update(ctx, m, "Status", "Action", "NodeRound", "DelegatorID", "ApproverID", "RemindedAt")
}

// SoftDeleteByInstanceNode 软删指定实例+节点的任务(node_round 置 -1)。
func (r *TaskRepo) SoftDeleteByInstanceNode(ctx context.Context, instanceID, nodeID uint) error {
	return repoDB(ctx).Model(&apprmodel.ApprovalTask{}).
		Where("instance_id = ? AND node_id = ?", instanceID, nodeID).
		Update("node_round", -1).Error
}

// ListTimeoutPending 列出超时未处理且未提醒过的任务(超时提醒定时任务用)。
// 只取活跃实例(APPROVING)下 PENDING/APPROVING 且 node_round>=0 的任务,
// updated_at 早于 before 且 reminded_at 为空(保证每任务只提醒一次)。
func (r *TaskRepo) ListTimeoutPending(ctx context.Context, before xtime.DateTime, limit int) ([]apprmodel.ApprovalTask, error) {
	var tasks []apprmodel.ApprovalTask
	err := repoDB(ctx).
		Joins("JOIN approval_instance ON approval_instance.id = approval_task.instance_id AND approval_instance.approval_status = ? AND approval_instance.deleted_at IS NULL", apprmodel.StatusApproving).
		Where("approval_task.status IN ? AND approval_task.node_round >= 0", []string{apprmodel.TaskStatusPending, apprmodel.TaskStatusApproving}).
		Where("approval_task.reminded_at IS NULL").
		Where("approval_task.updated_at < ?", before).
		Order("approval_task.updated_at ASC").
		Limit(limit).
		Find(&tasks).Error
	return tasks, err
}

// MarkReminded 批量置 reminded_at=now(超时提醒已发送)。
func (r *TaskRepo) MarkReminded(ctx context.Context, taskIDs []uint, now xtime.DateTime) error {
	if len(taskIDs) == 0 {
		return nil
	}
	return repoDB(ctx).Model(&apprmodel.ApprovalTask{}).
		Where("id IN ?", taskIDs).
		Update("reminded_at", now).Error
}

// RevokeActiveByInstance 将实例下全部活跃任务(PENDING/APPROVING/SUSPENDED)置 REVOKED 并软删
// (node_round=-1)。退回打回时作废旧任务(含加签链)用。
func (r *TaskRepo) RevokeActiveByInstance(ctx context.Context, instanceID uint) error {
	return repoDB(ctx).Model(&apprmodel.ApprovalTask{}).
		Where("instance_id = ? AND node_round >= 0 AND status IN ?", instanceID,
			[]string{apprmodel.TaskStatusPending, apprmodel.TaskStatusApproving, apprmodel.TaskStatusSuspended}).
		Updates(map[string]any{"status": apprmodel.TaskStatusRevoked, "node_round": -1}).Error
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

// MaxNodeRound 某实例某节点在审批记录中的最大轮次。
// 任务表软删会把 node_round 置 -1 丢失代次信息,审批记录是不可变审计日志,
// 退回重建轮次以记录表为准(见 service.rebuildNodeRound)。
func (r *RecordRepo) MaxNodeRound(ctx context.Context, instanceID, nodeID uint) int {
	var maxRound int
	repoDB(ctx).Model(&apprmodel.ApprovalRecord{}).
		Where("instance_id = ? AND node_id = ?", instanceID, nodeID).
		Select("COALESCE(MAX(node_round), 0)").Scan(&maxRound)
	return maxRound
}

// ── 加签任务 ──

type AddSignTaskRepo struct {
	repository.BaseRepo[apprmodel.ApprovalAddSignTask]
}

func NewAddSignTaskRepo() *AddSignTaskRepo { return &AddSignTaskRepo{} }

// GetByTaskID 按加签生成的任务ID取链记录(每条加签任务对应一行)。
func (r *AddSignTaskRepo) GetByTaskID(ctx context.Context, taskID uint) (*apprmodel.ApprovalAddSignTask, error) {
	var m apprmodel.ApprovalAddSignTask
	if err := repoDB(ctx).Where("task_id = ?", taskID).Order("id ASC").First(&m).Error; err != nil {
		return nil, err
	}
	return &m, nil
}

// ListByRootTaskID 列出加签链全部成员(链推进/详情展示用,按 Sort 升序)。
func (r *AddSignTaskRepo) ListByRootTaskID(ctx context.Context, rootTaskID uint) ([]apprmodel.ApprovalAddSignTask, error) {
	var list []apprmodel.ApprovalAddSignTask
	err := repoDB(ctx).Where("root_task_id = ?", rootTaskID).Order("sort ASC, id ASC").Find(&list).Error
	return list, err
}

// ListByTaskIDs 按任务ID集合取链记录(审批详情批量 enrich 用)。
func (r *AddSignTaskRepo) ListByTaskIDs(ctx context.Context, taskIDs []uint) ([]apprmodel.ApprovalAddSignTask, error) {
	if len(taskIDs) == 0 {
		return nil, nil
	}
	var list []apprmodel.ApprovalAddSignTask
	err := repoDB(ctx).Where("task_id IN ?", taskIDs).Order("sort ASC, id ASC").Find(&list).Error
	return list, err
}

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
