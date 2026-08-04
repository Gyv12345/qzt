package approval

import (
	"qzt-go-server/internal/model/base"
)

// flow.go 审批流程定义(6 张表)。
// 流程设计:flow → version → node(link/approver/condition)。
// 版本设计:编辑流程时创建新版本,不影响在跑的实例。

// ApprovalFlow 流程主表。
type ApprovalFlow struct {
	ID                   uint   `json:"id" gorm:"primaryKey"`
	CurrentVersionID     *uint  `json:"current_version_id" gorm:"comment:当前激活版本ID"`
	Number               string `json:"number" gorm:"size:50;comment:流程编号"`
	Name                 string `json:"name" gorm:"size:255;not null;comment:流程名称"`
	FormType             string `json:"form_type" gorm:"size:50;not null;uniqueIndex:uk_flow_form_type;comment:表单类型(CONTRACT/QUOTATION/ORDER/INVOICE)"`
	CreateExecute        int8   `json:"create_execute" gorm:"default:1;comment:新建触发(1启用0禁用)"`
	UpdateExecute        int8   `json:"update_execute" gorm:"default:1;comment:更新触发"`
	SubmitterCanRevoke   int8   `json:"submitter_can_revoke" gorm:"default:1;comment:提交人可撤回"`
	AllowBatchProcess    int8   `json:"allow_batch_process" gorm:"default:0;comment:允许批量处理"`
	AllowWithdraw        int8   `json:"allow_withdraw" gorm:"default:0;comment:允许撤回"`
	AllowAddSign         int8   `json:"allow_add_sign" gorm:"default:0;comment:允许加签"`
	DuplicateApproverRule string `json:"duplicate_approver_rule" gorm:"size:20;default:FIRST_ONLY;comment:重复审批人规则"`
	RequireComment       int8   `json:"require_comment" gorm:"default:0;comment:强制备注"`
	Enable               int8   `json:"enable" gorm:"default:1;index;comment:启用(1是0否)"`
	StatusPermissions    string `json:"status_permissions" gorm:"type:text;comment:基于业务状态的字段权限JSON"`
	Description          string `json:"description" gorm:"size:3000;comment:描述"`
	base.BaseModel
}

func (ApprovalFlow) TableName() string { return "approval_flow" }

// ApprovalFlowVersion 流程版本。编辑流程时创建新版本,在跑实例仍用旧版本。
type ApprovalFlowVersion struct {
	ID     uint `json:"id" gorm:"primaryKey"`
	FlowID uint `json:"flow_id" gorm:"index;not null;comment:所属流程ID"`
	base.BaseModel
}

func (ApprovalFlowVersion) TableName() string { return "approval_flow_version" }

// ApprovalNode 审批节点。
type ApprovalNode struct {
	ID            uint   `json:"id" gorm:"primaryKey"`
	FlowVersionID uint   `json:"flow_version_id" gorm:"index;not null;comment:所属版本ID"`
	Number        string `json:"number" gorm:"size:50;comment:节点编号"`
	Name          string `json:"name" gorm:"size:255;comment:节点名称"`
	NodeType      string `json:"node_type" gorm:"size:50;not null;comment:节点类型(START/APPROVER/CONDITION/DEFAULT/END)"`
	ExecuteTiming string `json:"execute_timing" gorm:"size:30;comment:触发时机(CREATE/UPDATE/DELETE)"`
	Sort          int    `json:"sort" gorm:"default:0;comment:排序"`
	base.BaseModel
}

func (ApprovalNode) TableName() string { return "approval_node" }

// ApprovalNodeApprover 节点审批人配置(PK 与 ApprovalNode 共享主键)。
type ApprovalNodeApprover struct {
	ID                  uint   `json:"id" gorm:"primaryKey;comment:PK=approval_node.id(共享主键)"`
	FlowVersionID       uint   `json:"flow_version_id" gorm:"index;not null"`
	ApprovalType        string `json:"approval_type" gorm:"size:20;default:AUTO_PASS;comment:审批类型"`
	MultiApproverMode   string `json:"multi_approver_mode" gorm:"size:20;comment:多审批人模式(ALL/ANY/SEQUENTIAL)"`
	EmptyApproverAction string `json:"empty_approver_action" gorm:"size:20;default:AUTO_PASS;comment:空审批人处理"`
	FallbackApprover    *uint  `json:"fallback_approver" gorm:"comment:兜底审批人ID"`
	SameSubmitterAction string `json:"same_submitter_action" gorm:"size:20;default:SKIP;comment:提交人本人处理(SKIP/ALLOW/ASSIGN_SUPERIOR)"`
	ApproverType        string `json:"approver_type" gorm:"size:50;comment:审批人类型(MEMBER/SUPERIOR/ROLE 等)"`
	ApproverDirection   string `json:"approver_direction" gorm:"size:20;default:BOTTOM_UP;comment:解析方向"`
	CcType              string `json:"cc_type" gorm:"size:50;comment:抄送人类型"`
	CcList              string `json:"cc_list" gorm:"type:text;comment:抄送人JSON数组"`
	ApproverList        string `json:"approver_list" gorm:"type:text;comment:审批人JSON数组(按approver_type不同解析)"`
	PassPostConfig      string `json:"pass_post_config" gorm:"type:text;comment:通过后操作配置JSON(字段更新+webhook)"`
	RejectPostConfig    string `json:"reject_post_config" gorm:"type:text;comment:驳回后操作配置JSON"`
	FieldPermissions    string `json:"field_permissions" gorm:"type:text;comment:字段权限JSON数组"`
	base.BaseModel
}

func (ApprovalNodeApprover) TableName() string { return "approval_node_approver" }

// ApprovalNodeCondition 节点条件配置(PK 与 ApprovalNode 共享主键)。
type ApprovalNodeCondition struct {
	ID              uint   `json:"id" gorm:"primaryKey;comment:PK=approval_node.id(共享主键)"`
	FlowVersionID   uint   `json:"flow_version_id" gorm:"index;not null"`
	ConditionConfig string `json:"condition_config" gorm:"type:text;comment:条件配置JSON(分支匹配规则)"`
	base.BaseModel
}

func (ApprovalNodeCondition) TableName() string { return "approval_node_condition" }

// ApprovalNodeLink 节点连线(流转路径)。
type ApprovalNodeLink struct {
	ID            uint `json:"id" gorm:"primaryKey"`
	FlowVersionID uint `json:"flow_version_id" gorm:"index;not null;comment:所属版本ID"`
	FromNodeID    uint `json:"from_node_id" gorm:"index;not null;comment:起始节点ID"`
	ToNodeID      uint `json:"to_node_id" gorm:"not null;comment:目标节点ID"`
	Sort          int  `json:"sort" gorm:"default:0;comment:排序"`
	base.BaseModel
}

func (ApprovalNodeLink) TableName() string { return "approval_node_link" }
