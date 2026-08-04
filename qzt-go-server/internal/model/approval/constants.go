package approval

// constants.go 审批引擎常量(移植自 qztcrm)。
// 状态/类型统一用字符串常量,DB 列用 VARCHAR 存储。

// ApprovalStatus 实例/资源审批状态。
const (
	StatusNone           = "NONE"           // 占位,未触发审批
	StatusPending        = "PENDING"        // 待提交(已生成实例未进入节点)
	StatusApproving      = "APPROVING"      // 审批中
	StatusApproved       = "APPROVED"       // 已通过
	StatusUnapproved     = "UNAPPROVED"     // 已驳回
	StatusRevoked        = "REVOKED"        // 已撤回
	StatusAutoApproved   = "AUTO_APPROVED"  // 自动通过(合成态)
	StatusAutoUnapproved = "AUTO_UNAPPROVED" // 自动驳回(合成态)
)

// NodeType 节点类型。
const (
	NodeTypeStart     = "START"     // 开始
	NodeTypeApprover  = "APPROVER"  // 审批
	NodeTypeCondition = "CONDITION" // 条件分支
	NodeTypeDefault   = "DEFAULT"   // 条件无匹配的兜底出口
	NodeTypeEnd       = "END"       // 结束
	NodeTypeException = "EXCEPTION" // 异常(内存态,不持久化)
)

// TaskType 任务类型。
const (
	TaskTypeCC       = "CC" // 抄送
	TaskTypeSign     = "SN" // 加签
	TaskTypeBack     = "BK" // 退回
	TaskTypeNormal   = "NL" // 常规审批
)

// ApprovalAction 审批动作。
const (
	ActionApprove = "APPROVE" // 同意
	ActionReject  = "REJECT"  // 驳回
	ActionSign    = "SIGN"    // 加签
	ActionBack    = "BACK"    // 退回
	ActionRevoke  = "REVOKE"  // 撤回
)

// ApproverType 审批人类型。
const (
	ApproverTypeMember           = "MEMBER"            // 指定成员
	ApproverTypeSuperior         = "SUPERIOR"          // 直属上级
	ApproverTypeMultipleSuperior = "MULTIPLE_SUPERIOR" // 多级上级
	ApproverTypeDeptHead         = "DEPT_HEAD"         // 部门负责人
	ApproverTypeMultipleDeptHead = "MULTIPLE_DEPT_HEAD" // 多级部门负责人
	ApproverTypeRole             = "ROLE"              // 角色
)

// MultiApproverMode 多审批人模式。
const (
	MultiModeAll       = "ALL"       // 会签:全部同意才通过
	MultiModeAny       = "ANY"       // 或签:任一同意即通过
	MultiModeSequential = "SEQUENTIAL" // 依次:按顺序逐人
)

// FormType 表单类型(绑定的业务实体)。新增业务接入审批时在此扩展。
const (
	FormTypeContract  = "CONTRACT"  // 合同
	FormTypeQuotation = "QUOTATION" // 报价单
	FormTypeOrder     = "ORDER"     // 订单
	FormTypeInvoice   = "INVOICE"   // 发票

	// PSI 进销存单据
	FormTypePurchaseOrder  = "PURCHASE_ORDER"  // 采购订单
	FormTypeSalesOrder     = "SALES_ORDER"     // 销售订单
	FormTypePurchaseReturn = "PURCHASE_RETURN" // 采购退货
	FormTypeSalesReturn    = "SALES_RETURN"    // 销售退货
)

// ExecuteTiming 触发时机。
const (
	TimingCreate = "CREATE"
	TimingUpdate = "UPDATE"
	TimingDelete = "DELETE"
)

// AddSignType 加签类型。
const (
	AddSignBefore = "BEFORE" // 前加签
	AddSignAfter  = "AFTER"  // 后加签
)

// EmptyApproverAction 空审批人处理。
const (
	EmptyApproverAutoPass      = "AUTO_PASS"       // 自动通过
	EmptyApproverAssignSpecific = "ASSIGN_SPECIFIC" // 指定兜底人
	EmptyApproverAssignAdmin   = "ASSIGN_ADMIN"    // 分配给管理员
)

// SameSubmitterAction 提交人本人处理。
const (
	SameSubmitterSkip            = "SKIP"            // 跳过
	SameSubmitterAllow           = "ALLOW"           // 允许
	SameSubmitterAssignSuperior  = "ASSIGN_SUPERIOR" // 转上级
)

// DuplicateApproverRule 重复审批人规则。
const (
	DupRuleFirstOnly     = "FIRST_ONLY"     // 仅首次出现
	DupRuleSequentialAll = "SEQUENTIAL_ALL" // 全部依次
	DupRuleEach          = "EACH"           // 每次独立
)

// TaskStatus 任务状态。
const (
	TaskStatusPending   = "PENDING"   // 待处理
	TaskStatusApproving = "APPROVING" // 进行中
	TaskStatusApproved  = "APPROVED"  // 已通过
	TaskStatusUnapproved = "UNAPPROVED" // 已驳回
	TaskStatusRevoked   = "REVOKED"   // 已撤回
)

// FormTable 表单类型 → 业务表名映射(资源状态写回用,防注入)。
var FormTable = map[string]string{
	FormTypeContract:  "crm_contract",
	FormTypeQuotation: "crm_quotation",
	FormTypeOrder:     "crm_order",
	FormTypeInvoice:   "crm_contract_invoice",

	// PSI 进销存单据(审批引擎据此把 approval_status 写回业务表)
	FormTypePurchaseOrder:  "psi_purchase_order",
	FormTypeSalesOrder:     "psi_sales_order",
	FormTypePurchaseReturn: "psi_purchase_return",
	FormTypeSalesReturn:    "psi_sales_return",
}
