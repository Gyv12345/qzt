package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	apprmodel "qzt-go-server/internal/model/approval"
	apprrepo "qzt-go-server/internal/repository/approval"
	"qzt-go-server/internal/repository"
	"qzt-go-server/pkg/xevent"
	"qzt-go-server/pkg/xlogger"
	"qzt-go-server/pkg/xtime"
)

// approval.go 审批引擎核心:提审 + 审批操作 + 节点流转。
// 移植自 qztcrm ApprovalResourceService + ApprovalActionService(简化版)。
// 支持会签(ALL)/或签(ANY)/依次(SEQUENTIAL),加签/退回后续扩展。

// ApprovalService 审批引擎核心服务。
type ApprovalService struct {
	flowRepo     *apprrepo.FlowRepo
	nodeRepo     *apprrepo.NodeRepo
	approverRepo *apprrepo.NodeApproverRepo
	linkRepo     *apprrepo.NodeLinkRepo
	instanceRepo *apprrepo.InstanceRepo
	taskRepo     *apprrepo.TaskRepo
	recordRepo   *apprrepo.RecordRepo
}

func NewApprovalService() *ApprovalService {
	return &ApprovalService{
		flowRepo:     apprrepo.NewFlowRepo(),
		nodeRepo:     apprrepo.NewNodeRepo(),
		approverRepo: apprrepo.NewNodeApproverRepo(),
		linkRepo:     apprrepo.NewNodeLinkRepo(),
		instanceRepo: apprrepo.NewInstanceRepo(),
		taskRepo:     apprrepo.NewTaskRepo(),
		recordRepo:   apprrepo.NewRecordRepo(),
	}
}

// PushRequest 提审请求。
type PushRequest struct {
	FormType     string `json:"form_type" binding:"required"`
	ResourceID   uint   `json:"resource_id" binding:"required"`
	Comment      string `json:"comment"`
	ExecuteTiming string `json:"execute_timing"`
}

// Push 提审:创建实例 → 找 START → 找下一节点 → 分配任务或直接完成。
func (s *ApprovalService) Push(ctx context.Context, req *PushRequest, submitterID uint) (*apprmodel.ApprovalInstance, error) {
	if !isValidFormType(req.FormType) {
		return nil, errors.New("不支持的表单类型: " + req.FormType)
	}
	flow, err := s.flowRepo.GetEnabledFlow(ctx, req.FormType)
	if err != nil {
		return nil, errors.New("未启用审批流程: " + req.FormType)
	}
	if flow.CurrentVersionID == nil {
		return nil, errors.New("流程未设计节点图")
	}
	timing := req.ExecuteTiming
	if timing == "" {
		timing = apprmodel.TimingCreate
	}

	vid := *flow.CurrentVersionID
	startNode, err := s.nodeRepo.FindStartNode(ctx, vid, timing)
	if err != nil {
		return nil, errors.New("缺少 START 节点")
	}

	// 创建实例
	instance := &apprmodel.ApprovalInstance{
		FlowVersionID:  vid,
		Type:           req.FormType,
		ResourceID:     req.ResourceID,
		SubmitterID:    submitterID,
		ApprovalStatus: apprmodel.StatusApproving,
		SubmitTime:     xtime.Now(),
		ExecuteTiming:  timing,
		Comment:        req.Comment,
	}
	if err := s.instanceRepo.Create(ctx, instance); err != nil {
		return nil, err
	}

	// 资源状态写回 → APPROVING
	s.updateResourceStatus(ctx, req.FormType, req.ResourceID, apprmodel.StatusApproving)

	// 找 START 的下一节点
	nextNode, err := s.getNextNode(ctx, vid, startNode.ID)
	if err != nil {
		return nil, fmt.Errorf("查找首节点失败: %w", err)
	}

	// 处理首节点
	if nextNode.NodeType == apprmodel.NodeTypeEnd || nextNode.NodeType == apprmodel.NodeTypeException {
		// 无审批人或全 AUTO_PASS,直接完成
		instance.ApprovalStatus = apprmodel.StatusApproved
		instance.ApprovalTime = xtime.Now()
		instance.CurrentNodeID = &nextNode.ID
		s.instanceRepo.Update(ctx, instance)
		s.updateResourceStatus(ctx, req.FormType, req.ResourceID, apprmodel.StatusApproved)
		s.sendFinishNotice(ctx, instance, "审批通过")
		return instance, nil
	}

	// 正常审批:分配首节点任务
	instance.CurrentNodeID = &nextNode.ID
	s.instanceRepo.Update(ctx, instance)

	if err := s.createNodeTasks(ctx, nextNode, instance, submitterID); err != nil {
		return nil, fmt.Errorf("分配审批任务失败: %w", err)
	}

	return instance, nil
}

// ApproveRequest 审批通过请求。
type ApproveRequest struct {
	TaskID  uint   `json:"task_id" binding:"required"`
	Comment string `json:"comment"`
}

// Approve 审批通过。
func (s *ApprovalService) Approve(ctx context.Context, req *ApproveRequest, userID uint) error {
	return repository.Transaction(ctx, func(ctx context.Context) error {
		task, err := s.loadAndCheckTask(ctx, req.TaskID, userID, apprmodel.TaskStatusApproving)
		if err != nil {
			return err
		}
		// 标记任务通过
		task.Status = apprmodel.TaskStatusApproved
		task.Action = apprmodel.ActionApprove
		if err := s.taskRepo.Update(ctx, task); err != nil {
			return err
		}
		// 写审批记录
		if err := s.saveRecord(ctx, task, apprmodel.ActionApprove, req.Comment); err != nil {
			return err
		}
		// 检查节点是否完成,流转
		return s.onTaskApproved(ctx, task, userID)
	})
}

// RejectRequest 驳回请求。
type RejectRequest struct {
	TaskID  uint   `json:"task_id" binding:"required"`
	Comment string `json:"comment" binding:"required"`
}

// Reject 驳回(任一驳回即整实例驳回)。
func (s *ApprovalService) Reject(ctx context.Context, req *RejectRequest, userID uint) error {
	return repository.Transaction(ctx, func(ctx context.Context) error {
		task, err := s.loadAndCheckTask(ctx, req.TaskID, userID, apprmodel.TaskStatusApproving)
		if err != nil {
			return err
		}
		task.Status = apprmodel.TaskStatusUnapproved
		task.Action = apprmodel.ActionReject
		if err := s.taskRepo.Update(ctx, task); err != nil {
			return err
		}
		if err := s.saveRecord(ctx, task, apprmodel.ActionReject, req.Comment); err != nil {
			return err
		}

		// 实例 → 驳回
		instance, err := s.instanceRepo.GetByID(ctx, task.InstanceID)
		if err != nil {
			return err
		}
		instance.ApprovalStatus = apprmodel.StatusUnapproved
		instance.ApprovalTime = xtime.Now()
		if err := s.instanceRepo.Update(ctx, instance); err != nil {
			return err
		}
		// 清当前节点其他待办
		s.taskRepo.SoftDeleteByInstanceNode(ctx, task.InstanceID, task.NodeID)
		// 资源状态写回
		s.updateResourceStatus(ctx, instance.Type, instance.ResourceID, apprmodel.StatusUnapproved)
		s.sendFinishNotice(ctx, instance, "审批驳回: "+req.Comment)
		return nil
	})
}

// Revoke 撤回(提交人)。
func (s *ApprovalService) Revoke(ctx context.Context, instanceID, submitterID uint) error {
	return repository.Transaction(ctx, func(ctx context.Context) error {
		instance, err := s.instanceRepo.GetByID(ctx, instanceID)
		if err != nil {
			return errors.New("审批实例不存在")
		}
		if instance.SubmitterID != submitterID {
			return errors.New("仅提交人可撤回")
		}
		if instance.ApprovalStatus != apprmodel.StatusApproving {
			return errors.New("仅审批中的实例可撤回")
		}
		instance.ApprovalStatus = apprmodel.StatusRevoked
		instance.ApprovalTime = xtime.Now()
		if err := s.instanceRepo.Update(ctx, instance); err != nil {
			return err
		}
		if instance.CurrentNodeID != nil {
			s.taskRepo.SoftDeleteByInstanceNode(ctx, instanceID, *instance.CurrentNodeID)
		}
		s.updateResourceStatus(ctx, instance.Type, instance.ResourceID, apprmodel.StatusRevoked)
		return nil
	})
}

// ── 内部:节点流转 ──

// onTaskApproved 单个任务通过后,检查节点是否完成并流转。
func (s *ApprovalService) onTaskApproved(ctx context.Context, task *apprmodel.ApprovalTask, userID uint) error {
	instance, err := s.instanceRepo.GetByID(ctx, task.InstanceID)
	if err != nil {
		return err
	}

	// 获取节点的审批人配置(判断 ALL/ANY/SEQUENTIAL)
	mode := apprmodel.MultiModeAny // 默认或签
	if apprCfg, err := s.approverRepo.GetByNodeID(ctx, task.NodeID); err == nil && apprCfg.MultiApproverMode != "" {
		mode = apprCfg.MultiApproverMode
	}

	// 检查节点是否完成
	tasks, err := s.taskRepo.ListByInstanceNode(ctx, task.InstanceID, task.NodeID)
	if err != nil {
		return err
	}

	nodeDone := false
	switch mode {
	case apprmodel.MultiModeAny:
		// 或签:任一通过即完成
		nodeDone = true
	case apprmodel.MultiModeAll:
		// 会签:全部通过才完成
		nodeDone = true
		for _, t := range tasks {
			if t.Status != apprmodel.TaskStatusApproved {
				nodeDone = false
				break
			}
		}
	case apprmodel.MultiModeSequential:
		// 依次:当前通过的已经是最后一个待审批的
		hasApproving := false
		for _, t := range tasks {
			if t.Status == apprmodel.TaskStatusApproving {
				hasApproving = true
				break
			}
		}
		nodeDone = !hasApproving
	}

	if !nodeDone {
		return nil // 节点未完成,等待其他审批人
	}

	// 节点完成:清当前节点待办
	s.taskRepo.SoftDeleteByInstanceNode(ctx, task.InstanceID, task.NodeID)

	// 找下一节点
	nextNode, err := s.getNextNode(ctx, instance.FlowVersionID, task.NodeID)
	if err != nil {
		return fmt.Errorf("查找下一节点失败: %w", err)
	}

	if nextNode.NodeType == apprmodel.NodeTypeEnd || nextNode.NodeType == apprmodel.NodeTypeException {
		// 流程完成
		instance.ApprovalStatus = apprmodel.StatusApproved
		instance.ApprovalTime = xtime.Now()
		instance.CurrentNodeID = &nextNode.ID
		s.instanceRepo.Update(ctx, instance)
		s.updateResourceStatus(ctx, instance.Type, instance.ResourceID, apprmodel.StatusApproved)
		s.sendFinishNotice(ctx, instance, "审批通过")
		return nil
	}

	// 流转到下一节点
	instance.CurrentNodeID = &nextNode.ID
	s.instanceRepo.Update(ctx, instance)
	return s.createNodeTasks(ctx, nextNode, instance, userID)
}

// createNodeTasks 为节点创建审批任务(解析审批人)。
func (s *ApprovalService) createNodeTasks(ctx context.Context, node *apprmodel.ApprovalNode, instance *apprmodel.ApprovalInstance, operator uint) error {
	if node.NodeType != apprmodel.NodeTypeApprover {
		// 非 APPROVER 节点(如 DEFAULT),直接尝试流转到下一节点
		nextNode, err := s.getNextNode(ctx, node.FlowVersionID, node.ID)
		if err != nil {
			return err
		}
		if nextNode.NodeType == apprmodel.NodeTypeEnd {
			instance.ApprovalStatus = apprmodel.StatusApproved
			instance.ApprovalTime = xtime.Now()
			instance.CurrentNodeID = &nextNode.ID
			s.instanceRepo.Update(ctx, instance)
			s.updateResourceStatus(ctx, instance.Type, instance.ResourceID, apprmodel.StatusApproved)
			s.sendFinishNotice(ctx, instance, "审批通过")
			return nil
		}
		instance.CurrentNodeID = &nextNode.ID
		s.instanceRepo.Update(ctx, instance)
		return s.createNodeTasks(ctx, nextNode, instance, operator)
	}

	approverIDs, err := s.resolveApprovers(ctx, node, instance.SubmitterID)
	if err != nil {
		return err
	}
	if len(approverIDs) == 0 {
		// 空审批人:自动通过,直接流转
		return s.onTaskApproved(ctx, &apprmodel.ApprovalTask{
			InstanceID: instance.ID, NodeID: node.ID, NodeRound: s.getNodeRound(ctx, instance.ID, node.ID),
		}, operator)
	}

	// 创建任务
	round := s.getNodeRound(ctx, instance.ID, node.ID)
	for _, aid := range approverIDs {
		task := &apprmodel.ApprovalTask{
			NodeID:     node.ID,
			NodeRound:  round,
			InstanceID: instance.ID,
			ApproverID: aid,
			Status:     apprmodel.TaskStatusApproving,
			Type:       apprmodel.TaskTypeNormal,
		}
		if err := s.taskRepo.Create(ctx, task); err != nil {
			return err
		}
		// 发站内信通知(事件总线)
		xevent.Publish(ctx, "approval.task.assigned", map[string]any{
			"approver_id": aid,
			"instance_id": instance.ID,
			"resource_type": instance.Type,
			"resource_id":  instance.ResourceID,
		})
	}
	return nil
}

// resolveApprovers 解析节点的审批人列表。
func (s *ApprovalService) resolveApprovers(ctx context.Context, node *apprmodel.ApprovalNode, submitterID uint) ([]uint, error) {
	cfg, err := s.approverRepo.GetByNodeID(ctx, node.ID)
	if err != nil {
		return nil, nil // 无配置 = 空审批人
	}

	// 按 approverType 解析
	switch cfg.ApproverType {
	case apprmodel.ApproverTypeMember:
		return parseUintArray(cfg.ApproverList), nil
	case apprmodel.ApproverTypeDeptHead, apprmodel.ApproverTypeMultipleDeptHead:
		// DEPT_HEAD:提交人 → sys_user.dept_id → hrm_department.leader_id
		return resolveDeptHead(ctx, submitterID)
	case apprmodel.ApproverTypeRole:
		// ROLE 类型:approverList 是 role_id 数组,需查 sys_user_role 解析
		return nil, nil
	case apprmodel.ApproverTypeSuperior:
		// SUPERIOR:查提交人的 leader_id(sys_user 暂无此字段)
		return nil, nil
	default:
		return parseUintArray(cfg.ApproverList), nil
	}
}

// resolveDeptHead 解析部门负责人:submitterID → sys_user.dept_id → hrm_department.leader_id。
func resolveDeptHead(ctx context.Context, submitterID uint) ([]uint, error) {
	if submitterID == 0 {
		return nil, nil
	}
	var deptID *uint
	repoDB(ctx).Table("sys_user").Where("id = ?", submitterID).Select("dept_id").Scan(&deptID)
	if deptID == nil || *deptID == 0 {
		return nil, nil
	}
	var leaderID *uint
	repoDB(ctx).Table("hrm_department").Where("id = ? AND status = 1", *deptID).Select("leader_id").Scan(&leaderID)
	if leaderID == nil || *leaderID == 0 {
		return nil, nil
	}
	return []uint{*leaderID}, nil
}

// getNodeRound 获取节点当前轮次(该实例该节点的最大 round + 1,首次为 1)。
func (s *ApprovalService) getNodeRound(ctx context.Context, instanceID, nodeID uint) int {
	var maxRound int
	repoDB(ctx).Model(&apprmodel.ApprovalTask{}).
		Where("instance_id = ? AND node_id = ?", instanceID, nodeID).
		Select("COALESCE(MAX(node_round), 0)").Scan(&maxRound)
	if maxRound < 0 {
		maxRound = 0
	}
	return maxRound + 1
}

// getNextNode 获取下一节点(沿 link 找,CONDITION 节点求值分支)。
func (s *ApprovalService) getNextNode(ctx context.Context, versionID, fromNodeID uint) (*apprmodel.ApprovalNode, error) {
	links, err := s.linkRepo.ListByFromNode(ctx, versionID, fromNodeID)
	if err != nil || len(links) == 0 {
		// 无连线 → END
		return &apprmodel.ApprovalNode{NodeType: apprmodel.NodeTypeEnd}, nil
	}
	// 简化:取第一条连线的目标(CONDITION 分支求值后续实现)
	nextID := links[0].ToNodeID
	return s.nodeRepo.GetByID(ctx, nextID)
}

// loadAndCheckTask 加载并校验任务(审批人=当前用户,状态=指定)。
func (s *ApprovalService) loadAndCheckTask(ctx context.Context, taskID, userID uint, expectedStatus string) (*apprmodel.ApprovalTask, error) {
	task, err := s.taskRepo.GetByID(ctx, taskID)
	if err != nil {
		return nil, errors.New("任务不存在")
	}
	if task.ApproverID != userID {
		return nil, errors.New("您不是该任务的审批人")
	}
	if task.Status != expectedStatus {
		return nil, errors.New("任务状态不允许此操作")
	}
	if task.NodeRound < 0 {
		return nil, errors.New("任务已失效")
	}
	return task, nil
}

// saveRecord 写审批记录(不可变审计日志)。
func (s *ApprovalService) saveRecord(ctx context.Context, task *apprmodel.ApprovalTask, result, comment string) error {
	record := &apprmodel.ApprovalRecord{
		InstanceID: task.InstanceID,
		TaskID:     &task.ID,
		NodeID:     task.NodeID,
		NodeRound:  task.NodeRound,
		Result:     result,
		Comment:    comment,
	}
	return s.recordRepo.Create(ctx, record)
}

// updateResourceStatus 更新业务资源的审批状态(白名单表名,防注入)。
func (s *ApprovalService) updateResourceStatus(ctx context.Context, formType string, resourceID uint, status string) {
	table, ok := apprmodel.FormTable[formType]
	if !ok {
		return
	}
	if err := repoDB(ctx).Table(table).Where("id = ?", resourceID).
		Update("approval_status", status).Error; err != nil {
		xlogger.ErrorfCtx(ctx, "更新资源审批状态失败 table=%s id=%d status=%s: %v",
			table, resourceID, status, err)
	}
}

// sendFinishNotice 审批完成通知(站内信,经事件总线)。
func (s *ApprovalService) sendFinishNotice(ctx context.Context, instance *apprmodel.ApprovalInstance, message string) {
	xevent.Publish(ctx, "approval.finished", map[string]any{
		"submitter_id":  instance.SubmitterID,
		"instance_id":   instance.ID,
		"resource_type": instance.Type,
		"resource_id":   instance.ResourceID,
		"message":       message,
	})
}

// parseUintArray 解析 JSON 格式的 uint 数组(如 "[1,2,3]")。
func parseUintArray(s string) []uint {
	if s == "" {
		return nil
	}
	var ids []uint
	if err := json.Unmarshal([]byte(s), &ids); err != nil {
		return nil
	}
	return ids
}
