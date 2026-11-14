package service

import (
	"context"
	"errors"
	"fmt"
	"strings"

	apprmodel "qzt-go-server/internal/model/approval"
	"qzt-go-server/internal/repository"
	"qzt-go-server/pkg/xevent"
)

// addsign.go 加签(BEFORE 前加签 / AFTER 后加签)与减签。
//
// 链语义(成员按 user_ids 顺序即 Sort 升序串行):
//   - 前加签 BEFORE:在当前任务之前插入串行加签链,原任务置 SUSPENDED(挂起,展示"加签中");
//     链成员全部 APPROVED 后原任务恢复 APPROVING,由原审批人继续。
//   - 后加签 AFTER :当前任务先正常通过但流程不推进;链成员全部 PENDING 排队,原任务通过后
//     才激活链首(onTaskApproved → resumeAfterSignChain);链尾 APPROVED 后流程从原节点继续。
//   - 链首创建时立即 APPROVING(BEFORE)/等原任务通过后激活(AFTER),其余 PENDING;
//     前一个 APPROVED 后激活下一个(待办列表只展示 APPROVING,PENDING 不打扰)。
//
// 链记录落 approval_add_sign_task(root_task_id=链根=被加签的原任务;initiator_id=发起人,
// 减签权限依据);每次加签/减签写 approval_record(ADD_SIGN/REMOVE_SIGN)审计。
// 节点完成判定忽略 SN 任务;节点上有未走完的加签链时流程暂缓推进(hasBlockingAddSign)。

// AddSignRequest 加签请求。
type AddSignRequest struct {
	TaskID  uint   `json:"task_id" binding:"required"`
	UserIDs []uint `json:"user_ids" binding:"required"`
	Mode    string `json:"mode" binding:"required"` // BEFORE(前加签)/AFTER(后加签)
	Comment string `json:"comment"`
}

// RemoveSignRequest 减签请求。
type RemoveSignRequest struct {
	TaskID  uint   `json:"task_id" binding:"required"` // 要撤销的加签任务ID
	Comment string `json:"comment"`
}

// validateAddSign 加签参数校验(纯函数,便于单测):mode 仅 BEFORE/AFTER;
// user_ids 非空、不含操作人本人、无重复、无非法 ID。
func validateAddSign(mode string, userIDs []uint, operatorID uint) error {
	if mode != apprmodel.AddSignBefore && mode != apprmodel.AddSignAfter {
		return errors.New("加签类型仅支持前加签(BEFORE)/后加签(AFTER)")
	}
	if len(userIDs) == 0 {
		return errors.New("加签人不能为空")
	}
	seen := make(map[uint]bool, len(userIDs))
	for _, id := range userIDs {
		if id == 0 {
			return errors.New("加签人ID不合法")
		}
		if id == operatorID {
			return errors.New("不能加签给自己")
		}
		if seen[id] {
			return errors.New("加签人不能重复")
		}
		seen[id] = true
	}
	return nil
}

// validateRemoveSign 减签校验(纯函数):仅加签任务可减(链根/常规任务类型即拦)、
// 仅加签发起人可撤、仅未轮到(PENDING)的可减——进行中/已批的不可减。
func validateRemoveSign(taskType, taskStatus string, initiatorID, operatorID uint) error {
	if taskType != apprmodel.TaskTypeSign {
		return errors.New("仅加签任务可减签")
	}
	if initiatorID != operatorID {
		return errors.New("仅加签发起人可减签")
	}
	if taskStatus != apprmodel.TaskStatusPending {
		return errors.New("仅待处理(未轮到)的加签任务可减签")
	}
	return nil
}

// nextPendingMember 链上下一个待激活成员(按 Sort 升序;有进行中成员时不激活,保证串行)。
func nextPendingMember(chain []apprmodel.ApprovalAddSignTask, statuses map[uint]string) (uint, bool) {
	for _, m := range chain {
		if statuses[m.TaskID] == apprmodel.TaskStatusApproving {
			return 0, false // 串行:有人正在审批时不激活下一个
		}
	}
	for _, m := range chain {
		if statuses[m.TaskID] == apprmodel.TaskStatusPending {
			return m.TaskID, true
		}
	}
	return 0, false
}

// chainSettled 链是否已收尾(无 PENDING/APPROVING 成员)。
func chainSettled(statuses map[uint]string) bool {
	for _, st := range statuses {
		if st == apprmodel.TaskStatusPending || st == apprmodel.TaskStatusApproving {
			return false
		}
	}
	return true
}

// AddSign 加签:为当前任务(user_ids 顺序串行)插入加签链。
func (s *ApprovalService) AddSign(ctx context.Context, req *AddSignRequest, userID uint) error {
	if err := validateAddSign(req.Mode, req.UserIDs, userID); err != nil {
		return err
	}
	return repository.Transaction(ctx, func(ctx context.Context) error {
		task, err := s.loadOperableTask(ctx, req.TaskID, userID,
			[]string{apprmodel.TaskStatusApproving, apprmodel.TaskStatusPending})
		if err != nil {
			return err
		}
		if task.Type != apprmodel.TaskTypeNormal {
			return errors.New("仅常规审批任务可加签")
		}
		instance, err := s.instanceRepo.GetByID(ctx, task.InstanceID)
		if err != nil {
			return errors.New("审批实例不存在")
		}
		if instance.ApprovalStatus != apprmodel.StatusApproving {
			return errors.New("仅审批中的实例可加签")
		}
		// 加签人须存在且启用
		for _, uid := range req.UserIDs {
			u, err := s.userRepo.GetByID(ctx, uid)
			if err != nil || u == nil {
				return errors.New("加签人不存在")
			}
			if u.Status != 1 {
				return fmt.Errorf("加签人「%s」已禁用", userDisplayName(ctx, s.userRepo, uid))
			}
		}
		if err := s.checkNodeDuplicateApprover(ctx, instance.ID, task.NodeID, req.UserIDs); err != nil {
			return err
		}
		// 同一根任务同时只允许一条进行中的加签链(链状态机按单链设计,禁止混链);
		// 历史已收尾的链不拦截,允许同一任务先后多次加签
		if existing, err := s.addSignRepo.ListByRootTaskID(ctx, task.ID); err == nil && len(existing) > 0 {
			statuses := s.chainTaskStatuses(ctx, existing)
			if !chainSettled(statuses) {
				return errors.New("该任务已有进行中的加签链,请等链走完或先减签")
			}
		}

		rootID := task.ID
		// 前加签:原任务挂起,链全批后恢复(settleChainIfDone)
		if req.Mode == apprmodel.AddSignBefore {
			task.Status = apprmodel.TaskStatusSuspended
			if err := s.taskRepo.Update(ctx, task); err != nil {
				return err
			}
		}
		// 建链:BEFORE 链首立即激活;AFTER 全员 PENDING 排队,原任务通过后由 resumeAfterSignChain 激活
		names := make([]string, 0, len(req.UserIDs))
		for i, uid := range req.UserIDs {
			status := apprmodel.TaskStatusPending
			if i == 0 && req.Mode == apprmodel.AddSignBefore {
				status = apprmodel.TaskStatusApproving
			}
			chainTask := &apprmodel.ApprovalTask{
				NodeID:     task.NodeID,
				NodeRound:  task.NodeRound,
				InstanceID: instance.ID,
				ApproverID: uid,
				Status:     status,
				Type:       apprmodel.TaskTypeSign,
			}
			if err := s.taskRepo.Create(ctx, chainTask); err != nil {
				return err
			}
			if err := s.addSignRepo.Create(ctx, &apprmodel.ApprovalAddSignTask{
				Type:        req.Mode,
				TaskID:      chainTask.ID,
				SignTaskID:  rootID,
				RootTaskID:  &rootID,
				InitiatorID: userID,
				Sort:        int64(i),
				Comment:     req.Comment,
			}); err != nil {
				return err
			}
			names = append(names, userDisplayName(ctx, s.userRepo, uid))
		}
		// 审计记录
		modeLabel := "后加签"
		if req.Mode == apprmodel.AddSignBefore {
			modeLabel = "前加签"
		}
		comment := fmt.Sprintf("「%s」发起%s,加签人:%s", userDisplayName(ctx, s.userRepo, userID), modeLabel, strings.Join(names, "、"))
		if req.Comment != "" {
			comment += ":" + req.Comment
		}
		if err := s.recordRepo.Create(ctx, &apprmodel.ApprovalRecord{
			InstanceID: instance.ID,
			TaskID:     &task.ID,
			NodeID:     task.NodeID,
			NodeRound:  task.NodeRound,
			Result:     apprmodel.ActionAddSign,
			Comment:    comment,
		}); err != nil {
			return err
		}
		// 前加签链首立即进入待办;后加签全员排队等原任务通过后再激活
		if req.Mode == apprmodel.AddSignBefore {
			s.notifyTaskAssigned(ctx, instance, req.UserIDs[0])
		}
		return nil
	})
}

// RemoveSign 减签:撤销链上一条仍未轮到(PENDING)的加签任务。
// 撤销后若链上已无待处理/进行中成员则链提前收尾(BEFORE 恢复原任务;AFTER 恢复推进)。
func (s *ApprovalService) RemoveSign(ctx context.Context, req *RemoveSignRequest, userID uint) error {
	return repository.Transaction(ctx, func(ctx context.Context) error {
		task, err := s.taskRepo.GetByID(ctx, req.TaskID)
		if err != nil {
			return errors.New("任务不存在")
		}
		if task.NodeRound < 0 {
			return errors.New("任务已失效") // 已随流转作废的旧链成员不可减
		}
		row, err := s.addSignRepo.GetByTaskID(ctx, req.TaskID)
		if err != nil || row == nil {
			return errors.New("该任务不是加签任务")
		}
		if err := validateRemoveSign(task.Type, task.Status, row.InitiatorID, userID); err != nil {
			return err
		}
		instance, err := s.instanceRepo.GetByID(ctx, task.InstanceID)
		if err != nil {
			return errors.New("审批实例不存在")
		}
		if instance.ApprovalStatus != apprmodel.StatusApproving {
			return errors.New("仅审批中的实例可减签")
		}
		// 撤销该加签任务
		task.Status = apprmodel.TaskStatusRevoked
		task.Action = apprmodel.ActionRemoveSign
		if err := s.taskRepo.Update(ctx, task); err != nil {
			return err
		}
		targetName := userDisplayName(ctx, s.userRepo, task.ApproverID)
		comment := fmt.Sprintf("「%s」减签,撤销「%s」的加签任务", userDisplayName(ctx, s.userRepo, userID), targetName)
		if req.Comment != "" {
			comment += ":" + req.Comment
		}
		if err := s.recordRepo.Create(ctx, &apprmodel.ApprovalRecord{
			InstanceID: instance.ID,
			TaskID:     &task.ID,
			NodeID:     task.NodeID,
			NodeRound:  task.NodeRound,
			Result:     apprmodel.ActionRemoveSign,
			Comment:    comment,
		}); err != nil {
			return err
		}
		rootID := task.ID
		if row.RootTaskID != nil && *row.RootTaskID > 0 {
			rootID = *row.RootTaskID
		}
		return s.settleChainIfDone(ctx, instance, rootID, row.Type)
	})
}

// checkNodeDuplicateApprover 目标用户在该节点已有活跃常规任务时不允许加签(避免同人双待办)。
func (s *ApprovalService) checkNodeDuplicateApprover(ctx context.Context, instanceID, nodeID uint, userIDs []uint) error {
	tasks, err := s.taskRepo.ListByInstanceNode(ctx, instanceID, nodeID)
	if err != nil {
		return err
	}
	ids := make(map[uint]bool, len(userIDs))
	for _, id := range userIDs {
		ids[id] = true
	}
	for _, t := range tasks {
		if t.Type != apprmodel.TaskTypeNormal {
			continue // 加签链成员允许(链内已去重)
		}
		if ids[t.ApproverID] && (t.Status == apprmodel.TaskStatusApproving || t.Status == apprmodel.TaskStatusPending) {
			return errors.New("该用户在此审批节点已有任务,不能重复加签")
		}
	}
	return nil
}

// loadOperableTask 加载任务并校验:审批人本人 + 状态在允许集合内 + 未失效。
func (s *ApprovalService) loadOperableTask(ctx context.Context, taskID, userID uint, allowedStatuses []string) (*apprmodel.ApprovalTask, error) {
	task, err := s.taskRepo.GetByID(ctx, taskID)
	if err != nil {
		return nil, errors.New("任务不存在")
	}
	if task.ApproverID != userID {
		return nil, errors.New("您不是该任务的审批人")
	}
	allowed := false
	for _, st := range allowedStatuses {
		if task.Status == st {
			allowed = true
			break
		}
	}
	if !allowed {
		return nil, errors.New("任务状态不允许此操作")
	}
	if task.NodeRound < 0 {
		return nil, errors.New("任务已失效")
	}
	return task, nil
}

// onAddSignTaskApproved 加签链成员通过:激活下一个 PENDING 成员;链尾按模式收尾。
func (s *ApprovalService) onAddSignTaskApproved(ctx context.Context, task *apprmodel.ApprovalTask, userID uint) error {
	instance, err := s.instanceRepo.GetByID(ctx, task.InstanceID)
	if err != nil {
		return err
	}
	row, err := s.addSignRepo.GetByTaskID(ctx, task.ID)
	if err != nil || row == nil {
		return errors.New("加签链记录缺失")
	}
	rootID := task.ID
	if row.RootTaskID != nil && *row.RootTaskID > 0 {
		rootID = *row.RootTaskID
	}
	chain, err := s.addSignRepo.ListByRootTaskID(ctx, rootID)
	if err != nil {
		return err
	}
	statuses := s.chainTaskStatuses(ctx, chain)
	if nextID, ok := nextPendingMember(chain, statuses); ok {
		return s.activateChainMember(ctx, instance, nextID)
	}
	return s.settleChainIfDone(ctx, instance, rootID, row.Type)
}

// settleChainIfDone 链上已无待处理/进行中成员时收尾:
//   - BEFORE:链根任务从 SUSPENDED 恢复 APPROVING,通知原审批人继续;
//   - AFTER :链根任务已 APPROVED,流程从原节点恢复推进。
func (s *ApprovalService) settleChainIfDone(ctx context.Context, instance *apprmodel.ApprovalInstance, rootTaskID uint, mode string) error {
	chain, err := s.addSignRepo.ListByRootTaskID(ctx, rootTaskID)
	if err != nil || len(chain) == 0 {
		return nil
	}
	if !chainSettled(s.chainTaskStatuses(ctx, chain)) {
		return nil // 链仍在进行,状态机不变
	}
	root, err := s.taskRepo.GetByID(ctx, rootTaskID)
	if err != nil {
		return errors.New("加签链根任务不存在")
	}
	if root.NodeRound < 0 {
		return nil // 链根任务已随流转作废(退回/驳回/或签他人通过),链不再收尾,防止重复推进
	}
	if mode == apprmodel.AddSignBefore {
		if root.Status != apprmodel.TaskStatusSuspended {
			return nil
		}
		root.Status = apprmodel.TaskStatusApproving
		if err := s.taskRepo.Update(ctx, root); err != nil {
			return err
		}
		s.notifyTaskAssigned(ctx, instance, root.ApproverID)
		return nil
	}
	// AFTER:根任务已批,恢复推进(链尾审批人视角继续流转)
	if root.Status != apprmodel.TaskStatusApproved {
		return nil
	}
	return s.onTaskApproved(ctx, root, root.ApproverID)
}

// resumeAfterSignChain 原任务(链根)通过后,若存在未走完的 AFTER 加签链则激活下一个成员。
// 返回 true 表示流程被链接管(本次不推进);false 表示无 AFTER 链或链无需激活,继续常规判定。
func (s *ApprovalService) resumeAfterSignChain(ctx context.Context, instance *apprmodel.ApprovalInstance, task *apprmodel.ApprovalTask) (bool, error) {
	chain, err := s.addSignRepo.ListByRootTaskID(ctx, task.ID)
	if err != nil || len(chain) == 0 {
		return false, nil
	}
	if chain[0].Type != apprmodel.AddSignAfter {
		return false, nil // 前加签链:原任务此时不可能为通过态(SUSPENDED 不允许审批)
	}
	statuses := s.chainTaskStatuses(ctx, chain)
	if nextID, ok := nextPendingMember(chain, statuses); ok {
		if err := s.activateChainMember(ctx, instance, nextID); err != nil {
			return false, err
		}
		return true, nil
	}
	return false, nil
}

// chainTaskStatuses 查链成员任务的当前状态(taskID → status;查不到的成员视为已失效)。
func (s *ApprovalService) chainTaskStatuses(ctx context.Context, chain []apprmodel.ApprovalAddSignTask) map[uint]string {
	statuses := make(map[uint]string, len(chain))
	for _, m := range chain {
		t, err := s.taskRepo.GetByID(ctx, m.TaskID)
		if err != nil || t == nil {
			continue
		}
		statuses[m.TaskID] = t.Status
	}
	return statuses
}

// activateChainMember 激活链成员(PENDING → APPROVING)并通知。
func (s *ApprovalService) activateChainMember(ctx context.Context, instance *apprmodel.ApprovalInstance, chainTaskID uint) error {
	t, err := s.taskRepo.GetByID(ctx, chainTaskID)
	if err != nil {
		return errors.New("加签任务不存在")
	}
	t.Status = apprmodel.TaskStatusApproving
	if err := s.taskRepo.Update(ctx, t); err != nil {
		return err
	}
	s.notifyTaskAssigned(ctx, instance, t.ApproverID)
	return nil
}

// hasBlockingAddSign 节点上是否存在未走完的加签链
// (挂起的原任务 / 待处理或进行中的加签任务)。存在时流程暂缓推进。
func (s *ApprovalService) hasBlockingAddSign(ctx context.Context, instanceID, nodeID uint) bool {
	tasks, err := s.taskRepo.ListByInstanceNode(ctx, instanceID, nodeID)
	if err != nil {
		return false
	}
	for _, t := range tasks {
		if t.Status == apprmodel.TaskStatusSuspended {
			return true
		}
		if t.Type == apprmodel.TaskTypeSign &&
			(t.Status == apprmodel.TaskStatusPending || t.Status == apprmodel.TaskStatusApproving) {
			return true
		}
	}
	return false
}

// notifyTaskAssigned 复用任务分配事件通知审批人(站内信+SSE+企微)。
func (s *ApprovalService) notifyTaskAssigned(ctx context.Context, instance *apprmodel.ApprovalInstance, approverID uint) {
	xevent.Publish(ctx, "approval.task.assigned", map[string]any{
		"approver_id":   approverID,
		"instance_id":   instance.ID,
		"resource_type": instance.Type,
		"resource_id":   instance.ResourceID,
	})
}
