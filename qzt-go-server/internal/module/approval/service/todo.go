package service

import (
	"context"
	"errors"
	"fmt"
	"strings"

	apprmodel "qzt-go-server/internal/model/approval"
	"qzt-go-server/internal/repository"
	apprrepo "qzt-go-server/internal/repository/approval"
)

// todo.go 审批待办服务。
// 待办列表 / 已办 / 我发起的 / 审批详情。
// 列表接口返回 enrichment 数据(含 resource_title / form_type_label),方便前端展示。

// formTypeLabel 表单类型中文映射。
var formTypeLabel = map[string]string{
	"CONTRACT":        "合同",
	"QUOTATION":       "报价单",
	"ORDER":           "订单",
	"INVOICE":         "发票",
	"PURCHASE_ORDER":  "采购单",
	"SALES_ORDER":     "销售单",
	"PURCHASE_RETURN": "采购退货",
	"SALES_RETURN":    "销售退货",
	"EXPENSE":         "报销单",
	"LEAVE":           "请假单",
	"TRIP":            "出差申请",
	"LOAN":            "借款单",
	"MEETING_BOOKING": "会议预订",
	"OA_CUSTOM":       "自定义表单",
}

// resourceTitleColumn 每种业务表的标题列(服务端常量,可为列名或 SQL 表达式)。
var resourceTitleColumn = map[string]string{
	"crm_contract":        "name",
	"crm_quotation":       "title",
	"crm_order":           "order_no",
	"fin_invoice":         "invoice_no",
	"psi_purchase_order":  "order_no",
	"psi_sales_order":     "order_no",
	"psi_purchase_return": "return_no",
	"psi_sales_return":    "return_no",
	"oa_expense":          "title",
	"hrm_leave":           "CONCAT_WS(' ', NULLIF(reason, ''), NULLIF(leave_no, ''))",
	"oa_business_trip":    "title",
	"oa_loan":             "title",
	"oa_meeting_booking":  "title",
	"oa_form_data":        "CONCAT_WS(' ', NULLIF(template_name, ''), NULLIF(data_no, ''))",
}

// enrichInstance 给实例附加 resource_title(从业务表查标题)。
type enrichedInstance struct {
	apprmodel.ApprovalInstance
	ResourceTitle string `json:"resource_title"`
	FormTypeLabel string `json:"form_type_label"`
}

// enrichTask 给任务附加 instance 信息 + resource_title。
type enrichedTask struct {
	apprmodel.ApprovalTask
	Instance *enrichedInstance `json:"instance"`
}

// TodoService 审批待办服务。
type TodoService struct {
	taskRepo     *apprrepo.TaskRepo
	instanceRepo *apprrepo.InstanceRepo
	recordRepo   *apprrepo.RecordRepo
	flowRepo     *apprrepo.FlowRepo
	versionRepo  *apprrepo.FlowVersionRepo
	nodeRepo     *apprrepo.NodeRepo
	linkRepo     *apprrepo.NodeLinkRepo
	approverRepo *apprrepo.NodeApproverRepo
	userRepo     *repository.UserRepo
}

func NewTodoService() *TodoService {
	return &TodoService{
		taskRepo:     apprrepo.NewTaskRepo(),
		instanceRepo: apprrepo.NewInstanceRepo(),
		recordRepo:   apprrepo.NewRecordRepo(),
		flowRepo:     apprrepo.NewFlowRepo(),
		versionRepo:  apprrepo.NewFlowVersionRepo(),
		nodeRepo:     apprrepo.NewNodeRepo(),
		linkRepo:     apprrepo.NewNodeLinkRepo(),
		approverRepo: apprrepo.NewNodeApproverRepo(),
		userRepo:     repository.NewUserRepo(),
	}
}

// fetchResourceTitles 批量查资源标题。
// 传入 (formType, resourceID) 列表,返回 "formType:resourceID" → 标题 的 map。
func fetchResourceTitles(ctx context.Context, instances []apprmodel.ApprovalInstance) map[string]string {
	if len(instances) == 0 {
		return nil
	}
	// 按 form_type 分组,减少查询次数
	byType := make(map[string][]uint)
	for _, inst := range instances {
		byType[inst.Type] = append(byType[inst.Type], inst.ResourceID)
	}

	result := make(map[string]string)
	for formType, ids := range byType {
		table, ok := apprmodel.FormTable[formType]
		if !ok || table == "" {
			continue
		}
		col, ok := resourceTitleColumn[table]
		if !ok || col == "" {
			continue
		}
		// 查标题
		titles, err := apprrepo.ScanResourceTitles(ctx, table, col, ids)
		if err != nil {
			continue
		}
		for id, title := range titles {
			key := fmt.Sprintf("%s:%d", formType, id)
			result[key] = title
		}
	}
	return result
}

// ListTodo 待办列表(approverID + status=APPROVING)。
func (s *TodoService) ListTodo(ctx context.Context, page, pageSize int, userID uint) ([]enrichedTask, int64, error) {
	tasks, total, err := s.taskRepo.PageByApprover(ctx, page, pageSize, userID, apprmodel.TaskStatusApproving)
	if err != nil {
		return nil, total, err
	}
	if len(tasks) == 0 {
		return []enrichedTask{}, total, nil
	}

	// 收集 instance IDs,批量查实例
	instIDs := make([]uint, 0, len(tasks))
	for _, t := range tasks {
		if t.InstanceID > 0 {
			instIDs = append(instIDs, t.InstanceID)
		}
	}

	var instances []apprmodel.ApprovalInstance
	if len(instIDs) > 0 {
		instances, _ = s.instanceRepo.ListByIDs(ctx, instIDs)
	}
	titleMap := fetchResourceTitles(ctx, instances)
	instMap := make(map[uint]*enrichedInstance, len(instances))
	for i := range instances {
		inst := &instances[i]
		key := fmt.Sprintf("%s:%d", inst.Type, inst.ResourceID)
		instMap[inst.ID] = &enrichedInstance{
			ApprovalInstance: *inst,
			ResourceTitle:    titleMap[key],
			FormTypeLabel:    formTypeLabel[inst.Type],
		}
	}

	out := make([]enrichedTask, 0, len(tasks))
	for _, t := range tasks {
		et := enrichedTask{ApprovalTask: t}
		if inst, ok := instMap[t.InstanceID]; ok {
			et.Instance = inst
		}
		out = append(out, et)
	}
	return out, total, nil
}

// ListProcessed 已办列表。
func (s *TodoService) ListProcessed(ctx context.Context, page, pageSize int, userID uint) ([]enrichedTask, int64, error) {
	tasks, total, err := s.taskRepo.PageByApprover(ctx, page, pageSize, userID, "")
	if err != nil {
		return nil, total, err
	}
	if len(tasks) == 0 {
		return []enrichedTask{}, total, nil
	}

	instIDs := make([]uint, 0, len(tasks))
	for _, t := range tasks {
		if t.InstanceID > 0 {
			instIDs = append(instIDs, t.InstanceID)
		}
	}
	var instances []apprmodel.ApprovalInstance
	if len(instIDs) > 0 {
		instances, _ = s.instanceRepo.ListByIDs(ctx, instIDs)
	}
	titleMap := fetchResourceTitles(ctx, instances)
	instMap := make(map[uint]*enrichedInstance, len(instances))
	for i := range instances {
		inst := &instances[i]
		key := fmt.Sprintf("%s:%d", inst.Type, inst.ResourceID)
		instMap[inst.ID] = &enrichedInstance{
			ApprovalInstance: *inst,
			ResourceTitle:    titleMap[key],
			FormTypeLabel:    formTypeLabel[inst.Type],
		}
	}

	out := make([]enrichedTask, 0, len(tasks))
	for _, t := range tasks {
		et := enrichedTask{ApprovalTask: t}
		if inst, ok := instMap[t.InstanceID]; ok {
			et.Instance = inst
		}
		out = append(out, et)
	}
	return out, total, nil
}

// ListInitiated 我发起的(submitterID)。
func (s *TodoService) ListInitiated(ctx context.Context, page, pageSize int, userID uint) ([]enrichedInstance, int64, error) {
	instances, total, err := s.instanceRepo.PageBySubmitter(ctx, page, pageSize, userID)
	if err != nil {
		return nil, total, err
	}
	if len(instances) == 0 {
		return []enrichedInstance{}, total, nil
	}

	titleMap := fetchResourceTitles(ctx, instances)
	out := make([]enrichedInstance, 0, len(instances))
	for _, inst := range instances {
		key := fmt.Sprintf("%s:%d", inst.Type, inst.ResourceID)
		out = append(out, enrichedInstance{
			ApprovalInstance: inst,
			ResourceTitle:    titleMap[key],
			FormTypeLabel:    formTypeLabel[inst.Type],
		})
	}
	return out, total, nil
}

// GetDetail 审批详情(实例 + 任务列表 + 审批记录)。
type InstanceDetail struct {
	apprmodel.ApprovalInstance
	ResourceTitle string                     `json:"resource_title"`
	FormTypeLabel string                     `json:"form_type_label"`
	Tasks         []apprmodel.ApprovalTask   `json:"tasks"`
	Records       []apprmodel.ApprovalRecord `json:"records"`
}

func (s *TodoService) GetDetail(ctx context.Context, instanceID uint) (*InstanceDetail, error) {
	instance, err := s.instanceRepo.GetByID(ctx, instanceID)
	if err != nil {
		return nil, err
	}
	detail := &InstanceDetail{
		ApprovalInstance: *instance,
		FormTypeLabel:    formTypeLabel[instance.Type],
	}
	// 查资源标题
	single := []apprmodel.ApprovalInstance{*instance}
	titleMap := fetchResourceTitles(ctx, single)
	key := fmt.Sprintf("%s:%d", instance.Type, instance.ResourceID)
	detail.ResourceTitle = titleMap[key]

	// 查全部任务
	tasks, _ := s.taskRepo.ListByInstance(ctx, instanceID)
	detail.Tasks = tasks

	records, _ := s.recordRepo.ListByInstance(ctx, instanceID)
	detail.Records = records
	return detail, nil
}

// ── 实例流程图(轨迹可视化数据) ──

// approverTypeLabel 审批人类型中文标签(与设计器文案一致)。
var approverTypeLabel = map[string]string{
	apprmodel.ApproverTypeMember:           "指定成员",
	apprmodel.ApproverTypeSuperior:         "直属上级",
	apprmodel.ApproverTypeMultipleSuperior: "多级上级",
	apprmodel.ApproverTypeDeptHead:         "部门负责人",
	apprmodel.ApproverTypeMultipleDeptHead: "多级部门负责人",
	apprmodel.ApproverTypeRole:             "角色",
	apprmodel.ApproverTypeLegacyUser:       "指定成员",
	apprmodel.ApproverTypeLegacyDeptLeader: "部门负责人",
}

// approverDisplayText 解析节点的审批人展示文本:MEMBER 解析用户昵称,其余按类型标签。
func (s *TodoService) approverDisplayText(ctx context.Context, nodeID uint) string {
	cfg, err := s.approverRepo.GetByNodeID(ctx, nodeID)
	if err != nil || cfg == nil || cfg.ApproverType == "" {
		return ""
	}
	if cfg.ApproverType == apprmodel.ApproverTypeMember || cfg.ApproverType == apprmodel.ApproverTypeLegacyUser {
		ids := parseUintArray(cfg.ApproverList)
		names := make([]string, 0, len(ids))
		for _, id := range ids {
			names = append(names, userDisplayName(ctx, s.userRepo, id))
		}
		return "成员:" + strings.Join(names, "、")
	}
	if label, ok := approverTypeLabel[cfg.ApproverType]; ok {
		return label
	}
	return cfg.ApproverType
}

// InstanceGraph 实例的流程图数据:按实例绑定的流程版本取图(非当前版本),附加轨迹状态。
type InstanceGraph struct {
	FlowID         uint                         `json:"flow_id"`
	FlowName       string                       `json:"flow_name"`
	FlowVersionID  uint                         `json:"flow_version_id"`
	ApprovalStatus string                       `json:"approval_status"`
	CurrentNodeID  *uint                        `json:"current_node_id"`
	VisitedNodeIDs []uint                       `json:"visited_node_ids"`
	Nodes          []InstanceGraphNode          `json:"nodes"`
	Links          []apprmodel.ApprovalNodeLink `json:"links"`
}

// InstanceGraphNode 图节点信息(含审批人展示文本,前端只读渲染)。
type InstanceGraphNode struct {
	ID           uint   `json:"id"`
	Number       string `json:"number"`
	Name         string `json:"name"`
	NodeType     string `json:"node_type"`
	ApproverText string `json:"approver_text"`
}

// GetInstanceGraph 实例流程图:流程版本图 + 已走/当前轨迹。
// 轨迹=任务(含软删)+记录的 node_id 去重,保证完整呈现(自动通过节点无任务只有记录)。
func (s *TodoService) GetInstanceGraph(ctx context.Context, instanceID uint) (*InstanceGraph, error) {
	instance, err := s.instanceRepo.GetByID(ctx, instanceID)
	if err != nil {
		return nil, errors.New("审批实例不存在")
	}
	vid := instance.FlowVersionID
	version, err := s.versionRepo.GetByID(ctx, vid)
	if err != nil {
		return nil, errors.New("流程版本不存在")
	}
	flow, err := s.flowRepo.GetByID(ctx, version.FlowID)
	if err != nil {
		return nil, errors.New("流程不存在")
	}
	nodes, err := s.nodeRepo.ListByVersion(ctx, vid)
	if err != nil {
		return nil, err
	}
	links, err := s.linkRepo.ListByVersion(ctx, vid)
	if err != nil {
		return nil, err
	}
	// 轨迹:任务(含软删)+记录的 node_id 去重
	visited := make([]uint, 0, 8)
	seen := make(map[uint]bool)
	tasks, _ := s.taskRepo.ListAllByInstance(ctx, instanceID)
	for _, t := range tasks {
		if t.NodeID > 0 && !seen[t.NodeID] {
			seen[t.NodeID] = true
			visited = append(visited, t.NodeID)
		}
	}
	records, _ := s.recordRepo.ListByInstance(ctx, instanceID)
	for _, r := range records {
		if r.NodeID > 0 && !seen[r.NodeID] {
			seen[r.NodeID] = true
			visited = append(visited, r.NodeID)
		}
	}
	// 节点展示文本
	graphNodes := make([]InstanceGraphNode, 0, len(nodes))
	for _, n := range nodes {
		text := ""
		if n.NodeType == apprmodel.NodeTypeApprover {
			text = s.approverDisplayText(ctx, n.ID)
		}
		graphNodes = append(graphNodes, InstanceGraphNode{
			ID:           n.ID,
			Number:       n.Number,
			Name:         n.Name,
			NodeType:     n.NodeType,
			ApproverText: text,
		})
	}
	return &InstanceGraph{
		FlowID:         flow.ID,
		FlowName:       flow.Name,
		FlowVersionID:  vid,
		CurrentNodeID:  instance.CurrentNodeID,
		ApprovalStatus: instance.ApprovalStatus,
		VisitedNodeIDs: visited,
		Nodes:          graphNodes,
		Links:          links,
	}, nil
}
