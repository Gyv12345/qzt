package service

import (
	"context"
	"errors"
	"fmt"

	apprmodel "qzt-go-server/internal/model/approval"
	"qzt-go-server/internal/repository"
)

// returnback.go 退回(打回重审):把实例打回到指定已审节点,该节点按轮次+1 重建任务,
// 打回节点之后的旧任务(含加签链)整体作废。打回节点重新审批通过后流程正常续走。
//
// 轮次语义:任务表软删会把 node_round 置 -1 丢失代次,重建轮次以审批记录表(不可变审计)
// 的历史最大轮次为准(rebuildNodeRound = max(记录,任务) + 1),与 createTasksWithRound 闭合。

// ReturnBackRequest 退回请求。
type ReturnBackRequest struct {
	TaskID         uint   `json:"task_id" binding:"required"`
	ReturnToNodeID uint   `json:"return_to_node_id" binding:"required"` // 退回目标节点(前端提供已审节点列表)
	Comment        string `json:"comment"`
}

// validateReturnTarget 退回目标合法性(纯函数,便于单测):
// 目标必须是当前节点的前序节点(sort 更小)、已完成(不能退回到未来节点)、不能是当前节点本身。
// 仅限前序:D2 修复——退回到「后序已访节点」(此前退回链产生的到访)会让当前审批人跳过自己的
// 重审直接把流程弹回下游,重审语义被绕过(R63 回归实例 252 复现)。
func validateReturnTarget(currentNodeID uint, currentNodeSort int, returnToNodeID uint, targetNodeSort int, completedNodeIDs []uint) error {
	if returnToNodeID == 0 {
		return errors.New("请选择退回目标节点")
	}
	if returnToNodeID == currentNodeID {
		return errors.New("不能退回到当前节点")
	}
	for _, id := range completedNodeIDs {
		if id == returnToNodeID {
			// 已到访但非前序(此前退回链产生的后序到访)——D2 修复点
			if targetNodeSort >= currentNodeSort {
				return errors.New("仅可退回到当前节点的前序节点")
			}
			return nil
		}
	}
	return errors.New("目标节点尚未审批,不能退回到未来节点")
}

// ReturnBack 退回:当前任务审批人把实例打回到指定已审节点。
func (s *ApprovalService) ReturnBack(ctx context.Context, req *ReturnBackRequest, userID uint) error {
	return repository.Transaction(ctx, func(ctx context.Context) error {
		task, err := s.loadAndCheckTask(ctx, req.TaskID, userID, apprmodel.TaskStatusApproving)
		if err != nil {
			return err
		}
		if task.Type != apprmodel.TaskTypeNormal {
			return errors.New("加签任务不支持退回,请走减签或等链走完")
		}
		instance, err := s.instanceRepo.GetByID(ctx, task.InstanceID)
		if err != nil {
			return errors.New("审批实例不存在")
		}
		if instance.ApprovalStatus != apprmodel.StatusApproving {
			return errors.New("仅审批中的实例可退回")
		}
		targetNode, err := s.nodeRepo.GetByID(ctx, req.ReturnToNodeID)
		if err != nil || targetNode == nil {
			return errors.New("退回目标节点不存在")
		}
		if targetNode.FlowVersionID != instance.FlowVersionID {
			return errors.New("退回目标节点不属于当前审批流程")
		}
		if targetNode.NodeType != apprmodel.NodeTypeApprover {
			return errors.New("仅审批节点可退回")
		}
		currentNode, err := s.nodeRepo.GetByID(ctx, task.NodeID)
		if err != nil || currentNode == nil {
			return errors.New("当前节点不存在")
		}
		// 已完成节点集合(含已流转软删的任务 + 审计记录的 node_id 去重)
		completed, err := s.completedNodeIDs(ctx, instance.ID)
		if err != nil {
			return err
		}
		if err := validateReturnTarget(task.NodeID, currentNode.Sort, req.ReturnToNodeID, targetNode.Sort, completed); err != nil {
			return err
		}

		// 重建轮次:在作废旧任务前,先按历史记录算好(打回节点按轮次+1 重建)
		rebuildRound := s.rebuildNodeRound(ctx, instance.ID, targetNode.ID)

		// 当前任务标记为退回作废
		task.Status = apprmodel.TaskStatusRevoked
		task.Action = apprmodel.ActionBack
		if err := s.taskRepo.Update(ctx, task); err != nil {
			return err
		}
		// 打回节点之后的旧任务全部作废(当前活跃任务=打回路径上的任务,含加签链整体)
		if err := s.taskRepo.RevokeActiveByInstance(ctx, instance.ID); err != nil {
			return err
		}
		// 退回记录 + 审计记录
		if err := s.returnBackRepo.Create(ctx, &apprmodel.ApprovalReturnBackRecord{
			InstanceID:     instance.ID,
			TaskID:         task.ID,
			ReturnToNodeID: targetNode.ID,
			ReturnReason:   req.Comment,
			ReturnUserID:   userID,
		}); err != nil {
			return err
		}
		comment := fmt.Sprintf("「%s」退回到节点「%s」重审", userDisplayName(ctx, s.userRepo, userID), targetNode.Name)
		if req.Comment != "" {
			comment += ":" + req.Comment
		}
		if err := s.recordRepo.Create(ctx, &apprmodel.ApprovalRecord{
			InstanceID: instance.ID,
			TaskID:     &task.ID,
			NodeID:     task.NodeID,
			NodeRound:  task.NodeRound,
			Result:     apprmodel.ActionReturnBack,
			Comment:    comment,
		}); err != nil {
			return err
		}
		// 实例指向退回节点
		instance.CurrentNodeID = &targetNode.ID
		if err := s.instanceRepo.Update(ctx, instance); err != nil {
			return err
		}
		// 打回节点按轮次+1 重建任务并通知(通过后 onTaskApproved 从该节点正常续走)
		approverIDs, err := s.resolveApprovers(ctx, targetNode, instance.SubmitterID)
		if err != nil {
			return err
		}
		if len(approverIDs) == 0 {
			return s.handleEmptyApprover(ctx, targetNode, instance, userID)
		}
		return s.createTasksWithRound(ctx, targetNode, instance, approverIDs, rebuildRound)
	})
}

// completedNodeIDs 实例的已完成(已到访)审批节点集合:
// 全量任务(含流转后软删)与审批记录的 node_id 去重(自动通过节点只有记录)。
func (s *ApprovalService) completedNodeIDs(ctx context.Context, instanceID uint) ([]uint, error) {
	seen := make(map[uint]bool)
	ids := make([]uint, 0, 8)
	tasks, err := s.taskRepo.ListAllByInstance(ctx, instanceID)
	if err != nil {
		return nil, err
	}
	for _, t := range tasks {
		if t.NodeID > 0 && !seen[t.NodeID] {
			seen[t.NodeID] = true
			ids = append(ids, t.NodeID)
		}
	}
	records, err := s.recordRepo.ListByInstance(ctx, instanceID)
	if err != nil {
		return nil, err
	}
	for _, r := range records {
		if r.NodeID > 0 && !seen[r.NodeID] {
			seen[r.NodeID] = true
			ids = append(ids, r.NodeID)
		}
	}
	return ids, nil
}

// rebuildNodeRound 退回重建轮次 = max(审批记录轮次, 任务表轮次) + 1。
// 任务表软删把 node_round 置 -1 丢失代次,故以不可变的审批记录表为准;
// 两者都无记录(理论上不会发生,节点必然到访过)时从 1 开始。
func (s *ApprovalService) rebuildNodeRound(ctx context.Context, instanceID, nodeID uint) int {
	max := s.taskRepo.MaxNodeRound(ctx, instanceID, nodeID)
	if max < 0 {
		max = 0
	}
	if r := s.recordRepo.MaxNodeRound(ctx, instanceID, nodeID); r > max {
		max = r
	}
	return max + 1
}
