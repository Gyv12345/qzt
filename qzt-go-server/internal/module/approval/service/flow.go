package service

import (
	"context"
	"errors"

	apprmodel "qzt-go-server/internal/model/approval"
	apprrepo "qzt-go-server/internal/repository/approval"
	"qzt-go-server/internal/repository"
)

// flow.go 审批流程设计服务。
// 设计流程:创建 flow → 创建 version → 保存节点图(nodes + approvers + conditions + links)。
// 编辑流程:创建新 version(不影响在跑实例),保存新节点图,更新 flow.current_version_id。

// FlowService 流程设计服务。
type FlowService struct {
	flowRepo     *apprrepo.FlowRepo
	versionRepo  *apprrepo.FlowVersionRepo
	nodeRepo     *apprrepo.NodeRepo
	approverRepo *apprrepo.NodeApproverRepo
	condRepo     *apprrepo.NodeConditionRepo
	linkRepo     *apprrepo.NodeLinkRepo
}

func NewFlowService() *FlowService {
	return &FlowService{
		flowRepo:     apprrepo.NewFlowRepo(),
		versionRepo:  apprrepo.NewFlowVersionRepo(),
		nodeRepo:     apprrepo.NewNodeRepo(),
		approverRepo: apprrepo.NewNodeApproverRepo(),
		condRepo:     apprrepo.NewNodeConditionRepo(),
		linkRepo:     apprrepo.NewNodeLinkRepo(),
	}
}

// FlowDetail 流程详情(含版本+节点图),供前端流程设计器加载。
type FlowDetail struct {
	apprmodel.ApprovalFlow
	Nodes    []apprmodel.ApprovalNode         `json:"nodes"`
	Approvers []apprmodel.ApprovalNodeApprover `json:"approvers"`
	Conditions []apprmodel.ApprovalNodeCondition `json:"conditions"`
	Links    []apprmodel.ApprovalNodeLink     `json:"links"`
}

// CreateFlowRequest 创建流程请求。
type CreateFlowRequest struct {
	Name      string `json:"name" binding:"required"`
	FormType  string `json:"form_type" binding:"required"`
	Number    string `json:"number"`
	Enable    int8   `json:"enable"`
}

// Create 创建流程(默认启用,无节点图,需后续 SaveDesign)。
func (s *FlowService) Create(ctx context.Context, req *CreateFlowRequest) (*apprmodel.ApprovalFlow, error) {
	if !isValidFormType(req.FormType) {
		return nil, errors.New("不支持的表单类型: " + req.FormType)
	}
	// 检查 formType 是否已有流程(每个 formType 仅一个)
	if existing, err := s.flowRepo.GetEnabledFlow(ctx, req.FormType); err == nil && existing != nil {
		return nil, errors.New("表单类型 " + req.FormType + " 已有流程")
	}
	enable := int8(1)
	if req.Enable == 0 {
		enable = 0
	}
	flow := &apprmodel.ApprovalFlow{
		Name:    req.Name,
		FormType: req.FormType,
		Number:  req.Number,
		Enable:  enable,
	}
	if err := s.flowRepo.Create(ctx, flow); err != nil {
		return nil, err
	}
	return flow, nil
}

// GetByID 流程详情(含当前版本的节点图)。
func (s *FlowService) GetByID(ctx context.Context, id uint) (*FlowDetail, error) {
	flow, err := s.flowRepo.GetByID(ctx, id)
	if err != nil {
		return nil, errors.New("流程不存在")
	}
	detail := &FlowDetail{ApprovalFlow: *flow}
	if flow.CurrentVersionID == nil {
		return detail, nil // 无版本,返回空节点图
	}
	vid := *flow.CurrentVersionID
	if detail.Nodes, err = s.nodeRepo.ListByVersion(ctx, vid); err != nil {
		return nil, err
	}
	if detail.Links, err = s.linkRepo.ListByVersion(ctx, vid); err != nil {
		return nil, err
	}
	// approvers/conditions 按 nodeID 逐个取(共享主键)
	for _, n := range detail.Nodes {
		if appr, err := s.approverRepo.GetByNodeID(ctx, n.ID); err == nil {
			detail.Approvers = append(detail.Approvers, *appr)
		}
		if cond, err := s.condRepo.GetByNodeID(ctx, n.ID); err == nil {
			detail.Conditions = append(detail.Conditions, *cond)
		}
	}
	return detail, nil
}

// List 分页查询流程。
func (s *FlowService) List(ctx context.Context, page, pageSize int) ([]apprmodel.ApprovalFlow, int64, error) {
	return s.flowRepo.PageList(ctx, page, pageSize, nil)
}

// SaveDesignRequest 保存流程设计(节点图)。每次保存创建新版本。
// 节点用 Number 字段作为前端标识,Links 的 FromNodeID/ToNodeID 填前端节点的 Number(转 uint)。
// 也可以直接传已保存的真实 NodeID(编辑已有版本时)。
type SaveDesignRequest struct {
	Nodes      []NodeDesign      `json:"nodes" binding:"required"`
	Approvers  []ApproversDesign `json:"approvers"`
	Conditions []ConditionsDesign `json:"conditions"`
	Links      []LinkDesign      `json:"links"`
}

// NodeDesign 节点设计(含临时标识 temp_id,供 links 引用)。
type NodeDesign struct {
	Number       string `json:"number"`
	Name         string `json:"name"`
	NodeType     string `json:"node_type"`
	ExecuteTiming string `json:"execute_timing"`
	Sort         int    `json:"sort"`
}

// ApproversDesign 审批人配置设计(node_number 关联到节点)。
type ApproversDesign struct {
	NodeNumber         string `json:"node_number"`
	ApprovalType       string `json:"approval_type"`
	MultiApproverMode  string `json:"multi_approver_mode"`
	EmptyApproverAction string `json:"empty_approver_action"`
	FallbackApprover   *uint  `json:"fallback_approver"`
	SameSubmitterAction string `json:"same_submitter_action"`
	ApproverType       string `json:"approver_type"`
	ApproverDirection  string `json:"approver_direction"`
	CcType             string `json:"cc_type"`
	CcList             string `json:"cc_list"`
	ApproverList       string `json:"approver_list"`
}

// ConditionsDesign 条件配置设计(node_number 关联到节点)。
type ConditionsDesign struct {
	NodeNumber      string `json:"node_number"`
	ConditionConfig string `json:"condition_config"`
}

// LinkDesign 连线设计(from/to 用 node_number)。
type LinkDesign struct {
	FromNodeNumber string `json:"from_node_number"`
	ToNodeNumber   string `json:"to_node_number"`
	Sort           int    `json:"sort"`
}

// SaveDesign 保存流程设计(创建新版本,事务写入节点图,更新 flow.current_version_id)。
// 建立节点 Number → 真实 ID 映射,修正 links 和 approvers/conditions 的关联。
func (s *FlowService) SaveDesign(ctx context.Context, flowID uint, req *SaveDesignRequest) error {
	flow, err := s.flowRepo.GetByID(ctx, flowID)
	if err != nil {
		return errors.New("流程不存在")
	}

	return repository.Transaction(ctx, func(ctx context.Context) error {
		// 1. 创建新版本
		version := &apprmodel.ApprovalFlowVersion{FlowID: flowID}
		if err := s.versionRepo.Create(ctx, version); err != nil {
			return err
		}
		vid := version.ID

		// 2. 写入节点,建立 Number → ID 映射
		numberToID := make(map[string]uint)
		for i := range req.Nodes {
			n := &apprmodel.ApprovalNode{
				FlowVersionID: vid,
				Number:        req.Nodes[i].Number,
				Name:          req.Nodes[i].Name,
				NodeType:      req.Nodes[i].NodeType,
				ExecuteTiming: req.Nodes[i].ExecuteTiming,
				Sort:          req.Nodes[i].Sort,
			}
			if err := repoDB(ctx).Create(n).Error; err != nil {
				return err
			}
			numberToID[n.Number] = n.ID
		}

		// 3. 写入审批人配置(共享主键 = node.ID,按 node_number 查映射)
		for i := range req.Approvers {
			nodeID, ok := numberToID[req.Approvers[i].NodeNumber]
			if !ok {
				continue
			}
			a := &apprmodel.ApprovalNodeApprover{
				ID:                  nodeID,
				FlowVersionID:       vid,
				ApprovalType:        req.Approvers[i].ApprovalType,
				MultiApproverMode:   req.Approvers[i].MultiApproverMode,
				EmptyApproverAction: req.Approvers[i].EmptyApproverAction,
				FallbackApprover:    req.Approvers[i].FallbackApprover,
				SameSubmitterAction: req.Approvers[i].SameSubmitterAction,
				ApproverType:        req.Approvers[i].ApproverType,
				ApproverDirection:   req.Approvers[i].ApproverDirection,
				CcType:              req.Approvers[i].CcType,
				CcList:              req.Approvers[i].CcList,
				ApproverList:        req.Approvers[i].ApproverList,
			}
			if err := repoDB(ctx).Create(a).Error; err != nil {
				return err
			}
		}

		// 4. 写入条件配置
		for i := range req.Conditions {
			nodeID, ok := numberToID[req.Conditions[i].NodeNumber]
			if !ok {
				continue
			}
			c := &apprmodel.ApprovalNodeCondition{
				ID:              nodeID,
				FlowVersionID:   vid,
				ConditionConfig: req.Conditions[i].ConditionConfig,
			}
			if err := repoDB(ctx).Create(c).Error; err != nil {
				return err
			}
		}

		// 5. 写入连线(from/to 用 number → ID 映射)
		for i := range req.Links {
			fromID, ok1 := numberToID[req.Links[i].FromNodeNumber]
			toID, ok2 := numberToID[req.Links[i].ToNodeNumber]
			if !ok1 || !ok2 {
				continue
			}
			l := &apprmodel.ApprovalNodeLink{
				FlowVersionID: vid,
				FromNodeID:    fromID,
				ToNodeID:      toID,
				Sort:          req.Links[i].Sort,
			}
			if err := repoDB(ctx).Create(l).Error; err != nil {
				return err
			}
		}

		// 6. 更新 flow.current_version_id
		flow.CurrentVersionID = &vid
		return s.flowRepo.Update(ctx, flow)
	})
}

// Enable 启用/禁用流程。
func (s *FlowService) Enable(ctx context.Context, id uint, enable int8) error {
	flow, err := s.flowRepo.GetByID(ctx, id)
	if err != nil {
		return errors.New("流程不存在")
	}
	if enable == 1 && flow.CurrentVersionID == nil {
		return errors.New("流程未设计节点图,无法启用")
	}
	flow.Enable = enable
	return s.flowRepo.Update(ctx, flow)
}

// isValidFormType 校验表单类型。
func isValidFormType(t string) bool {
	switch t {
	case apprmodel.FormTypeContract, apprmodel.FormTypeQuotation,
		apprmodel.FormTypeOrder, apprmodel.FormTypeInvoice,
		// PSI 进销存单据
		apprmodel.FormTypePurchaseOrder, apprmodel.FormTypeSalesOrder,
		apprmodel.FormTypePurchaseReturn, apprmodel.FormTypeSalesReturn,
		// OA 办公流程
		apprmodel.FormTypeExpense,
		apprmodel.FormTypeLeave,
		apprmodel.FormTypeTrip,
		apprmodel.FormTypeLoan,
		apprmodel.FormTypeMeetingBooking,
		apprmodel.FormTypeCustomForm:
		return true
	}
	return false
}
