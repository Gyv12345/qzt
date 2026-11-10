package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	apprmodel "qzt-go-server/internal/model/approval"
	"qzt-go-server/internal/repository"
	apprrepo "qzt-go-server/internal/repository/approval"
	hrmrepo "qzt-go-server/internal/repository/hrm"
	oarepo "qzt-go-server/internal/repository/oa"
	"qzt-go-server/pkg/xevent"
	"qzt-go-server/pkg/xlogger"
	"qzt-go-server/pkg/xtime"
)

// approval.go 审批引擎核心:提审 + 审批操作(通过/驳回/撤回/转办/委托) + 节点流转。
// 移植自 qztcrm ApprovalResourceService + ApprovalActionService(简化版)。
// 支持会签(ALL)/或签(ANY)/依次(SEQUENTIAL);转办/委托已支持,加签/退回后续扩展。

// ApprovalService 审批引擎核心服务。
type ApprovalService struct {
	flowRepo     *apprrepo.FlowRepo
	nodeRepo     *apprrepo.NodeRepo
	approverRepo *apprrepo.NodeApproverRepo
	condRepo     *apprrepo.NodeConditionRepo
	linkRepo     *apprrepo.NodeLinkRepo
	instanceRepo *apprrepo.InstanceRepo
	taskRepo     *apprrepo.TaskRepo
	recordRepo   *apprrepo.RecordRepo
	formDataRepo *oarepo.FormDataRepo
	userRepo     *repository.UserRepo
	deptRepo     *hrmrepo.DepartmentRepo
}

func NewApprovalService() *ApprovalService {
	return &ApprovalService{
		flowRepo:     apprrepo.NewFlowRepo(),
		nodeRepo:     apprrepo.NewNodeRepo(),
		approverRepo: apprrepo.NewNodeApproverRepo(),
		condRepo:     apprrepo.NewNodeConditionRepo(),
		linkRepo:     apprrepo.NewNodeLinkRepo(),
		instanceRepo: apprrepo.NewInstanceRepo(),
		taskRepo:     apprrepo.NewTaskRepo(),
		recordRepo:   apprrepo.NewRecordRepo(),
		formDataRepo: oarepo.NewFormDataRepo(),
		userRepo:     repository.NewUserRepo(),
		deptRepo:     hrmrepo.NewDepartmentRepo(),
	}
}

// PushRequest 提审请求。
type PushRequest struct {
	FormType      string `json:"form_type" binding:"required"`
	ResourceID    uint   `json:"resource_id" binding:"required"`
	Comment       string `json:"comment"`
	ExecuteTiming string `json:"execute_timing"`
}

// Push 提审:创建实例 → 找 START → 找下一节点 → 分配任务或直接完成。
func (s *ApprovalService) Push(ctx context.Context, req *PushRequest, submitterID uint) (*apprmodel.ApprovalInstance, error) {
	if !isValidFormType(req.FormType) {
		return nil, errors.New("不支持的表单类型: " + req.FormType)
	}
	// 资源存在性校验(R24 观察①):单据不存在或已软删时拒绝提审,避免悬挂实例与幽灵待办。
	// QUOTATION/ORDER 等表未建时 Scan 报错,按「无法校验」降级放行(与原单摘要 Found=false 口径一致)。
	if table, ok := apprmodel.FormTable[req.FormType]; ok {
		var row map[string]any
		if err := apprrepo.ScanBusinessRow(ctx, table, req.ResourceID, &row); err == nil && len(row) == 0 {
			return nil, fmt.Errorf("单据不存在或已删除,无法发起审批: %s#%d", req.FormType, req.ResourceID)
		}
	}
	// 防重复提审:审批中/已通过的资源不允许再次提交(驳回/撤回后可重新发起,创建新实例)
	if approving, err := s.instanceRepo.HasApproving(ctx, req.FormType, req.ResourceID); err == nil && approving {
		return nil, errors.New("该单据已有审批中的流程,请勿重复提交(可先撤回)")
	}
	if approved, err := s.instanceRepo.HasApproved(ctx, req.FormType, req.ResourceID); err == nil && approved {
		return nil, errors.New("该单据已审批通过,无需重复提交")
	}
	// OA_CUSTOM 按 resource 查 template_key,实现每个表单模板一条独立审批流;
	// 找不到模板专属启用流程时回退到 OA_CUSTOM 通用流程(form_key='')。
	formKey := ""
	if req.FormType == apprmodel.FormTypeCustomForm {
		if fd, err := s.formDataRepo.GetByID(ctx, req.ResourceID); err == nil && fd != nil {
			formKey = fd.TemplateKey
		}
	}
	flow, err := s.flowRepo.GetEnabledFlow(ctx, req.FormType, formKey)
	if err != nil && formKey != "" {
		flow, err = s.flowRepo.GetEnabledFlow(ctx, req.FormType, "")
	}
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
	nextNode, err := s.getNextNode(ctx, instance, startNode.ID)
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
		s.saveAutoPassRecord(ctx, instance.ID, nextNode.ID, 1, "流程无审批节点,系统自动通过")
		s.sendFinishNotice(ctx, instance, resultApprove, "")
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
		// P17:节点级驳回后操作(字段更新+自定义 webhook),失败不阻断主流程
		if rejectCfg, err := s.approverRepo.GetByNodeID(ctx, task.NodeID); err == nil && rejectCfg != nil {
			ApplyPostConfig(ctx, rejectCfg.RejectPostConfig, instance, "reject")
		}
		// 资源状态写回
		s.updateResourceStatus(ctx, instance.Type, instance.ResourceID, apprmodel.StatusUnapproved)
		s.sendFinishNotice(ctx, instance, resultReject, req.Comment)
		return nil
	})
}

// ── 转办/委托 ──

// TransferRequest 转办/委托请求。
type TransferRequest struct {
	TaskID       uint   `json:"task_id" binding:"required"`
	TargetUserID uint   `json:"target_user_id" binding:"required"`
	Mode         string `json:"mode"`    // TRANSFER(默认)/DELEGATE
	Comment      string `json:"comment"` // 转办/委托说明(可空)
}

// Transfer 转办/委托:把当前审批人的任务让渡给目标用户(原地改 task.approver_id)。
//   - TRANSFER(转办):任务让渡出队,责任完全转移;
//   - DELEGATE(委托):受托人代审,责任仍在委托人(task.delegator_id 留痕)。
//
// 两者机械动作一致,差异在审计记录(result=TRANSFER/DELEGATE)与 delegator_id 留痕。
func (s *ApprovalService) Transfer(ctx context.Context, req *TransferRequest, userID uint) error {
	mode := req.Mode
	if mode == "" {
		mode = apprmodel.ActionTransfer
	}
	if mode != apprmodel.ActionTransfer && mode != apprmodel.ActionDelegate {
		return errors.New("不支持的操作类型,仅支持转办(TRANSFER)/委托(DELEGATE)")
	}
	return repository.Transaction(ctx, func(ctx context.Context) error {
		task, err := s.loadAndCheckTask(ctx, req.TaskID, userID, apprmodel.TaskStatusApproving)
		if err != nil {
			return err
		}
		instance, err := s.instanceRepo.GetByID(ctx, task.InstanceID)
		if err != nil {
			return errors.New("审批实例不存在")
		}
		if instance.ApprovalStatus != apprmodel.StatusApproving {
			return errors.New("仅审批中的实例可转办/委托")
		}
		if err := validateTransferTarget(req.TargetUserID, userID, instance.SubmitterID); err != nil {
			return err
		}
		// 目标用户须存在且启用
		target, err := s.userRepo.GetByID(ctx, req.TargetUserID)
		if err != nil || target == nil {
			return errors.New("目标审批人不存在")
		}
		if target.Status != 1 {
			return errors.New("目标审批人已禁用")
		}
		// 防重复:目标在该节点已有活跃任务(含已批)时不允许再转,避免同节点同人两条待办
		nodeTasks, err := s.taskRepo.ListByInstanceNode(ctx, task.InstanceID, task.NodeID)
		if err != nil {
			return err
		}
		for _, t := range nodeTasks {
			if t.ID != task.ID && t.ApproverID == req.TargetUserID {
				return errors.New("该用户在此审批节点已有任务,不能重复转办")
			}
		}
		// 原地改审批人;delegator_id 记上一手(转办=让渡,委托=受托代审责任仍在委托人)
		fromID := task.ApproverID
		task.ApproverID = req.TargetUserID
		task.DelegatorID = &fromID
		if err := s.taskRepo.Update(ctx, task); err != nil {
			return err
		}
		// 审计记录(result=TRANSFER/DELEGATE)
		fromName, toName := userDisplayName(ctx, s.userRepo, fromID), userDisplayName(ctx, s.userRepo, req.TargetUserID)
		var label string
		if mode == apprmodel.ActionDelegate {
			label = fmt.Sprintf("「%s」委托「%s」代审,责任仍在「%s」", fromName, toName, fromName)
		} else {
			label = fmt.Sprintf("「%s」转办给「%s」", fromName, toName)
		}
		if req.Comment != "" {
			label += ":" + req.Comment
		}
		if err := s.recordRepo.Create(ctx, &apprmodel.ApprovalRecord{
			InstanceID: task.InstanceID,
			TaskID:     &task.ID,
			NodeID:     task.NodeID,
			NodeRound:  task.NodeRound,
			Result:     mode,
			Comment:    label,
		}); err != nil {
			return err
		}
		// 通知新审批人(站内信+SSE+企微,复用任务分配事件)
		xevent.Publish(ctx, "approval.task.assigned", map[string]any{
			"approver_id":   req.TargetUserID,
			"instance_id":   instance.ID,
			"resource_type": instance.Type,
			"resource_id":   instance.ResourceID,
		})
		return nil
	})
}

// validateTransferTarget 校验转办/委托目标(纯函数,便于单测):不能转给自己或提交人。
func validateTransferTarget(targetUserID, operatorID, submitterID uint) error {
	if targetUserID == operatorID {
		return errors.New("不能转办给自己")
	}
	if submitterID > 0 && targetUserID == submitterID {
		return errors.New("不能转办/委托给提交人")
	}
	return nil
}

// userDisplayName 用户显示名(昵称优先,回退用户名,查无返回 #id)。包级函数,引擎与待办服务共用。
func userDisplayName(ctx context.Context, userRepo *repository.UserRepo, userID uint) string {
	if u, err := userRepo.GetByID(ctx, userID); err == nil && u != nil {
		if u.Nickname != "" {
			return u.Nickname
		}
		return u.Username
	}
	return fmt.Sprintf("#%d", userID)
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
		// P17:撤回 → 发布 approval.revoked(出站 webhook 转发)
		xevent.Publish(ctx, "approval.revoked", map[string]any{
			"instance_id":   instance.ID,
			"resource_type": instance.Type,
			"resource_id":   instance.ResourceID,
			"submitter_id":  instance.SubmitterID,
		})
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
	var apprCfg *apprmodel.ApprovalNodeApprover
	if cfg, err := s.approverRepo.GetByNodeID(ctx, task.NodeID); err == nil && cfg != nil {
		apprCfg = cfg
		if cfg.MultiApproverMode != "" {
			mode = cfg.MultiApproverMode
		}
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
	// P17:节点级通过后操作(字段更新+自定义 webhook),失败不阻断流转
	if apprCfg != nil {
		ApplyPostConfig(ctx, apprCfg.PassPostConfig, instance, "pass")
	}

	// 找下一节点
	nextNode, err := s.getNextNode(ctx, instance, task.NodeID)
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
		// 全通过:通知提交人 + 所有参与审批人(审批人也需知晓流程最终结果)
		s.sendFinishNoticeToAll(ctx, instance, resultApprove, "")
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
		nextNode, err := s.getNextNode(ctx, instance, node.ID)
		if err != nil {
			return err
		}
		if nextNode.NodeType == apprmodel.NodeTypeEnd {
			instance.ApprovalStatus = apprmodel.StatusApproved
			instance.ApprovalTime = xtime.Now()
			instance.CurrentNodeID = &nextNode.ID
			s.instanceRepo.Update(ctx, instance)
			s.updateResourceStatus(ctx, instance.Type, instance.ResourceID, apprmodel.StatusApproved)
			s.saveAutoPassRecord(ctx, instance.ID, nextNode.ID, 1, "流程无审批节点,系统自动通过")
			s.sendFinishNotice(ctx, instance, resultApprove, "")
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
		return s.handleEmptyApprover(ctx, node, instance, operator)
	}
	return s.createTasks(ctx, node, instance, approverIDs)
}

// createTasks 为节点创建审批任务并通知审批人。
func (s *ApprovalService) createTasks(ctx context.Context, node *apprmodel.ApprovalNode, instance *apprmodel.ApprovalInstance, approverIDs []uint) error {
	round := s.getNodeRound(ctx, instance.ID, node.ID)
	// 节点首次激活时抄送通知(退回重审 round>1 不重复打扰)
	if round == 1 {
		s.notifyCc(ctx, node, instance)
	}
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
		xevent.Publish(ctx, "approval.task.assigned", map[string]any{
			"approver_id":   aid,
			"instance_id":   instance.ID,
			"resource_type": instance.Type,
			"resource_id":   instance.ResourceID,
		})
	}
	return nil
}

// notifyCc 节点开始审批时抄送通知(cc_type=MEMBER 的用户列表)。
// 抄送是纯知会(站内信+SSE+企微),抄送人无需操作;经事件总线由 listener 发送。
func (s *ApprovalService) notifyCc(ctx context.Context, node *apprmodel.ApprovalNode, instance *apprmodel.ApprovalInstance) {
	cfg, err := s.approverRepo.GetByNodeID(ctx, node.ID)
	if err != nil || cfg == nil || cfg.CcType != apprmodel.ApproverTypeMember {
		return
	}
	ccIDs := parseUintArray(cfg.CcList)
	if len(ccIDs) == 0 {
		return
	}
	xevent.Publish(ctx, "approval.cc", map[string]any{
		"cc_ids":      ccIDs,
		"instance_id": instance.ID,
		"message":     s.buildCcNotice(ctx, node, instance),
	})
}

// buildCcNotice 组装抄送通知正文:单据类型「标题」+ 提交人 + 当前节点。
func (s *ApprovalService) buildCcNotice(ctx context.Context, node *apprmodel.ApprovalNode, instance *apprmodel.ApprovalInstance) string {
	typeLabel := formTypeLabel[instance.Type]
	if typeLabel == "" {
		typeLabel = instance.Type
	}
	title := ""
	if titles := fetchResourceTitles(ctx, []apprmodel.ApprovalInstance{*instance}); titles != nil {
		title = titles[fmt.Sprintf("%s:%d", instance.Type, instance.ResourceID)]
	}
	subject := typeLabel
	if title != "" {
		subject = fmt.Sprintf("%s「%s」", typeLabel, title)
	}
	submitterName := ""
	if u, err := s.userRepo.GetByID(ctx, instance.SubmitterID); err == nil && u != nil {
		submitterName = u.Nickname
		if submitterName == "" {
			submitterName = u.Username
		}
	}
	content := fmt.Sprintf("【抄送】%s已进入审批,当前节点「%s」", subject, node.Name)
	if submitterName != "" {
		content += ",提交人:" + submitterName
	}
	return content + "。请知悉,无需操作。"
}

// handleEmptyApprover 审批节点无可用审批人时,按节点 empty_approver_action 配置处理:
//   - 节点完全没有审批人配置行:审批链未配置,fail-fast 自动驳回,不默认放行(R11-②)
//   - AUTO_PASS: 自动通过(仅限设计器显式配置)
//   - ASSIGN_SPECIFIC: 转交兜底人(fallback_approver);未配则退化为自动通过
//   - ASSIGN_ADMIN: 转交超管(id=1)
//   - REJECT 或未知: 实例判驳回,避免静默放行打穿审批
func (s *ApprovalService) handleEmptyApprover(ctx context.Context, node *apprmodel.ApprovalNode, instance *apprmodel.ApprovalInstance, operator uint) error {
	var cfg *apprmodel.ApprovalNodeApprover
	if c, err := s.approverRepo.GetByNodeID(ctx, node.ID); err == nil {
		cfg = c
	}
	if cfg == nil {
		return s.failInstance(ctx, instance, "审批节点「"+node.Name+"」未配置审批人,已自动驳回,请联系管理员修复审批流程")
	}
	action := apprmodel.EmptyApproverAutoPass
	if cfg.EmptyApproverAction != "" {
		action = cfg.EmptyApproverAction
	}
	switch action {
	case apprmodel.EmptyApproverAssignSpecific:
		if cfg != nil && cfg.FallbackApprover != nil && *cfg.FallbackApprover > 0 {
			return s.createTasks(ctx, node, instance, []uint{*cfg.FallbackApprover})
		}
		return s.autoPassNode(ctx, node, instance, operator)
	case apprmodel.EmptyApproverAssignAdmin:
		return s.createTasks(ctx, node, instance, []uint{1})
	case apprmodel.EmptyApproverAutoPass:
		return s.autoPassNode(ctx, node, instance, operator)
	default:
		return s.failInstance(ctx, instance, "审批节点「"+node.Name+"」无可用审批人,已自动驳回")
	}
}

// autoPassNode 节点自动通过(空审批人 + AUTO_PASS,或 ASSIGN_SPECIFIC 未配兜底人时退化)。
func (s *ApprovalService) autoPassNode(ctx context.Context, node *apprmodel.ApprovalNode, instance *apprmodel.ApprovalInstance, operator uint) error {
	round := s.getNodeRound(ctx, instance.ID, node.ID)
	s.saveAutoPassRecord(ctx, instance.ID, node.ID, round, "节点「"+node.Name+"」无审批人,系统自动通过")
	return s.onTaskApproved(ctx, &apprmodel.ApprovalTask{
		InstanceID: instance.ID, NodeID: node.ID, NodeRound: round,
	}, operator)
}

// failInstance 将实例标记为驳回(无可用审批人等异常终态)。
// 写入驳回状态后返回 nil —— 驳回是正常终态,需提交事务而非回滚。
func (s *ApprovalService) failInstance(ctx context.Context, instance *apprmodel.ApprovalInstance, reason string) error {
	instance.ApprovalStatus = apprmodel.StatusUnapproved
	instance.ApprovalTime = xtime.Now()
	if err := s.instanceRepo.Update(ctx, instance); err != nil {
		return err
	}
	s.updateResourceStatus(ctx, instance.Type, instance.ResourceID, apprmodel.StatusUnapproved)
	s.sendFinishNotice(ctx, instance, resultReject, reason)
	xlogger.ErrorfCtx(ctx, "审批实例 %d 自动驳回: %s", instance.ID, reason)
	return nil
}

// resolveApprovers 解析节点的审批人列表。
func (s *ApprovalService) resolveApprovers(ctx context.Context, node *apprmodel.ApprovalNode, submitterID uint) ([]uint, error) {
	cfg, err := s.approverRepo.GetByNodeID(ctx, node.ID)
	if err != nil {
		return nil, nil // 无配置 = 空审批人
	}

	// 按 approverType 解析(含历史遗留枚举别名,兼容旧版本快照)
	switch cfg.ApproverType {
	case apprmodel.ApproverTypeMember, apprmodel.ApproverTypeLegacyUser:
		return parseUintArray(cfg.ApproverList), nil
	case apprmodel.ApproverTypeDeptHead, apprmodel.ApproverTypeMultipleDeptHead, apprmodel.ApproverTypeLegacyDeptLeader:
		// DEPT_HEAD:提交人 → sys_user.dept_id → hrm_department.leader
		return s.resolveDeptHead(ctx, submitterID)
	case apprmodel.ApproverTypeRole:
		// ROLE 类型:approverList 是 role_id 数组,需查 sys_user_role 解析
		return nil, nil
	case apprmodel.ApproverTypeSuperior:
		// SUPERIOR:查提交人的直属上级(sys_user.leader_id)
		return s.resolveSuperior(ctx, submitterID)
	default:
		return parseUintArray(cfg.ApproverList), nil
	}
}

// resolveDeptHead 解析部门负责人:submitterID → sys_user.dept_id → hrm_department.leader。
func (s *ApprovalService) resolveDeptHead(ctx context.Context, submitterID uint) ([]uint, error) {
	if submitterID == 0 {
		return nil, nil
	}
	deptID := s.userRepo.GetDeptID(ctx, submitterID)
	if deptID == nil || *deptID == 0 {
		return nil, nil
	}
	leaderID := s.deptRepo.LeaderID(ctx, *deptID)
	if leaderID == nil || *leaderID == 0 {
		return nil, nil
	}
	return []uint{*leaderID}, nil
}

// resolveSuperior 解析直属上级:查 sys_user.leader_id。
func (s *ApprovalService) resolveSuperior(ctx context.Context, submitterID uint) ([]uint, error) {
	if submitterID == 0 {
		return nil, nil
	}
	leaderID := s.userRepo.GetLeaderID(ctx, submitterID)
	if leaderID == nil || *leaderID == 0 {
		return nil, nil
	}
	return []uint{*leaderID}, nil
}

// getNodeRound 获取节点当前轮次(该实例该节点的最大 round + 1,首次为 1)。
func (s *ApprovalService) getNodeRound(ctx context.Context, instanceID, nodeID uint) int {
	maxRound := s.taskRepo.MaxNodeRound(ctx, instanceID, nodeID)
	if maxRound < 0 {
		maxRound = 0
	}
	return maxRound + 1
}

// getNextNode 获取下一节点。
//
// 流转规则:
//   - 0 条出边 → END(流程结束)
//   - 出边目标全是普通节点 → 走 sort 第一条(普通顺序流转)
//   - 出边目标含 CONDITION 节点(条件分叉) → 用业务表单数据(buildFormData)逐个求值,
//     第一个 conditionConfig 匹配的 CONDITION 节点胜出(由 createNodeTasks 穿透到真正审批节点);
//     全不匹配时,若存在非 CONDITION 目标则走它作兜底,否则返回 error("条件分支无匹配")。
func (s *ApprovalService) getNextNode(ctx context.Context, instance *apprmodel.ApprovalInstance, fromNodeID uint) (*apprmodel.ApprovalNode, error) {
	links, err := s.linkRepo.ListByFromNode(ctx, instance.FlowVersionID, fromNodeID)
	if err != nil || len(links) == 0 {
		// 无连线 → END
		return &apprmodel.ApprovalNode{NodeType: apprmodel.NodeTypeEnd}, nil
	}

	// 预取目标节点,判断是否条件分叉
	targets := make([]*apprmodel.ApprovalNode, 0, len(links))
	for _, l := range links {
		tgt, e := s.nodeRepo.GetByID(ctx, l.ToNodeID)
		if e != nil {
			continue
		}
		targets = append(targets, tgt)
	}
	hasCondition := false
	for _, t := range targets {
		if t.NodeType == apprmodel.NodeTypeCondition {
			hasCondition = true
			break
		}
	}
	if !hasCondition {
		// 普通流转:走第一条(已按 sort 排序)
		if len(targets) > 0 {
			return targets[0], nil
		}
		return &apprmodel.ApprovalNode{NodeType: apprmodel.NodeTypeEnd}, nil
	}

	// 条件分叉:逐个求值 CONDITION 节点
	data := s.buildFormData(ctx, instance)
	var fallback *apprmodel.ApprovalNode // 第一个非 CONDITION 目标作兜底
	for _, tgt := range targets {
		if tgt.NodeType == apprmodel.NodeTypeCondition {
			cond, e := s.condRepo.GetByNodeID(ctx, tgt.ID)
			if e == nil && cond != nil && evalCondition(cond.ConditionConfig, data) {
				return tgt, nil // 匹配,返回 CONDITION(由 createNodeTasks 穿透)
			}
			continue
		}
		if fallback == nil {
			fallback = tgt
		}
	}
	if fallback != nil {
		return fallback, nil // 兜底分支
	}
	return nil, errors.New("条件分支无匹配,请检查审批流条件配置")
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

// saveAutoPassRecord 写一条"自动通过"审批记录(无审批人操作的节点/流程完成时留痕),
// 让审批详情能完整呈现「提交 → 自动通过 → 完成」轨迹,而非空白。
func (s *ApprovalService) saveAutoPassRecord(ctx context.Context, instanceID, nodeID uint, nodeRound int, comment string) {
	record := &apprmodel.ApprovalRecord{
		InstanceID: instanceID,
		TaskID:     nil, // 自动通过无审批任务
		NodeID:     nodeID,
		NodeRound:  nodeRound,
		Result:     "AUTO_PASS",
		Comment:    comment,
	}
	if err := s.recordRepo.Create(ctx, record); err != nil {
		xlogger.ErrorfCtx(ctx, "写自动通过审批记录失败 instance=%d node=%d: %v", instanceID, nodeID, err)
	}
}

// updateResourceStatus 更新业务资源的审批状态(白名单表名,防注入)。
func (s *ApprovalService) updateResourceStatus(ctx context.Context, formType string, resourceID uint, status string) {
	table, ok := apprmodel.FormTable[formType]
	if !ok {
		return
	}
	if err := apprrepo.UpdateResourceApprovalStatus(ctx, table, resourceID, status); err != nil {
		xlogger.ErrorfCtx(ctx, "更新资源审批状态失败 table=%s id=%d status=%s: %v",
			table, resourceID, status, err)
	}
}

// 审批结果(用于事件 payload 的 result 字段;消费端据此判断是否触发业务回调,
// 不再靠 message 里是否含"通过"来猜测,避免审批意见里出现"通过"二字时误触发)。
const (
	resultApprove = "approved"
	resultReject  = "rejected"
)

// sendFinishNotice 审批完成通知(站内信,经事件总线)。
// result 为 resultApprove/resultReject;comment 为审批意见/驳回原因(可空)。
// 通知正文会带上单据类型与单据名称,让提交人知道是哪份单据出了结果。
func (s *ApprovalService) sendFinishNotice(ctx context.Context, instance *apprmodel.ApprovalInstance, result, comment string) {
	s.sendFinishNoticeWithParticipants(ctx, instance, result, comment, nil)
}

// sendFinishNoticeToAll 全通过时的完成通知:提交人 + 所有参与审批人。
// 参与审批人也需要知晓流程最终结果(自己批完之后流程是否走完)。
func (s *ApprovalService) sendFinishNoticeToAll(ctx context.Context, instance *apprmodel.ApprovalInstance, result, comment string) {
	s.sendFinishNoticeWithParticipants(ctx, instance, result, comment, s.collectParticipants(ctx, instance))
}

// sendFinishNoticeWithParticipants 带额外参与者的完成通知。
// participantIds 为参与审批人(已排除提交人,提交人恒为通知主体);空则只通知提交人。
func (s *ApprovalService) sendFinishNoticeWithParticipants(ctx context.Context, instance *apprmodel.ApprovalInstance, result, comment string, participantIds []uint) {
	content := buildFinishNotice(ctx, instance, result, comment)
	xevent.Publish(ctx, "approval.finished", map[string]any{
		"submitter_id":    instance.SubmitterID,
		"instance_id":     instance.ID,
		"resource_type":   instance.Type,
		"resource_id":     instance.ResourceID,
		"result":          result,
		"message":         content,
		"participant_ids": participantIds,
	})
}

// collectParticipants 收集实例的参与审批人(全部任务去重,含流转后软删的;
// 排除提交人——他以发起人身份已单独收到结果通知,不重复)。
func (s *ApprovalService) collectParticipants(ctx context.Context, instance *apprmodel.ApprovalInstance) []uint {
	tasks, err := s.taskRepo.ListAllByInstance(ctx, instance.ID)
	if err != nil {
		return nil
	}
	seen := map[uint]bool{instance.SubmitterID: true}
	ids := make([]uint, 0, len(tasks))
	for _, t := range tasks {
		if t.ApproverID > 0 && !seen[t.ApproverID] {
			seen[t.ApproverID] = true
			ids = append(ids, t.ApproverID)
		}
	}
	return ids
}

// buildFinishNotice 组装审批结果通知正文:结果 + 单据类型「单据名称」+ 意见/原因。
func buildFinishNotice(ctx context.Context, instance *apprmodel.ApprovalInstance, result, comment string) string {
	typeLabel := formTypeLabel[instance.Type]
	if typeLabel == "" {
		typeLabel = instance.Type
	}
	// 反查单据名称(可空,如自定义表单无标题列)
	title := ""
	if titles := fetchResourceTitles(ctx, []apprmodel.ApprovalInstance{*instance}); titles != nil {
		title = titles[fmt.Sprintf("%s:%d", instance.Type, instance.ResourceID)]
	}
	subject := typeLabel
	if title != "" {
		subject = fmt.Sprintf("%s「%s」", typeLabel, title)
	}

	var headline, opinionLabel string
	switch result {
	case resultApprove:
		headline, opinionLabel = subject+"审批通过", "审批意见"
	case resultReject:
		headline, opinionLabel = subject+"审批驳回", "驳回原因"
	default:
		headline, opinionLabel = subject+" 审批结果:"+result, "说明"
	}
	content := headline
	if comment != "" {
		content += "\n" + opinionLabel + ":" + comment
	}
	return content
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
