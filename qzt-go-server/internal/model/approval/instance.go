package approval

import (
	"qzt-go-server/internal/model/base"
	"qzt-go-server/pkg/xtime"
)

// instance.go 审批运行实例(5 张表)。
// 运行时:instance → task → record(审批记录)/ returnback(退回)/ addsign(加签)。

// ApprovalInstance 业务资源提审实例。
type ApprovalInstance struct {
	ID            uint            `json:"id" gorm:"primaryKey"`
	// 流程版本ID
	FlowVersionID uint            `json:"flow_version_id" gorm:"index;not null;comment:流程版本ID"`
	// 表单类型(CONTRACT/QUOTATION/...)
	Type          string          `json:"type" gorm:"size:20;not null;index:idx_instance_resource;comment:表单类型(CONTRACT/QUOTATION/...)"`
	// 业务资源ID
	ResourceID    uint            `json:"resource_id" gorm:"index:idx_instance_resource;not null;comment:业务资源ID"`
	// 提交人ID
	SubmitterID   uint            `json:"submitter_id" gorm:"index;not null;comment:提交人ID"`
	// 当前节点ID
	CurrentNodeID *uint           `json:"current_node_id" gorm:"comment:当前节点ID"`
	// 审批状态(PENDING/APPROVING/APPROVED/...)
	ApprovalStatus string         `json:"approval_status" gorm:"size:20;not null;comment:审批状态(PENDING/APPROVING/APPROVED/...)"`
	// 提审时间
	SubmitTime    xtime.DateTime  `json:"submit_time" gorm:"type:datetime;comment:提审时间"`
	// 审批完成时间
	ApprovalTime  xtime.DateTime  `json:"approval_time" gorm:"type:datetime;comment:审批完成时间"`
	// 触发时机(CREATE/UPDATE/DELETE)
	ExecuteTiming string          `json:"execute_timing" gorm:"size:30;comment:触发时机(CREATE/UPDATE/DELETE)"`
	// 备注
	Comment       string          `json:"comment" gorm:"size:500;comment:备注"`
	// 本次更新字段(逗号分隔)
	UpdateFields  string          `json:"update_fields" gorm:"size:2000;comment:本次更新字段(逗号分隔)"`
	base.BaseModel
}

func (ApprovalInstance) TableName() string { return "approval_instance" }

// ApprovalTask 审批任务(待办)。
type ApprovalTask struct {
	ID         uint   `json:"id" gorm:"primaryKey"`
	// 节点ID
	NodeID     uint   `json:"node_id" gorm:"index:idx_task_instance_node;not null;comment:节点ID"`
	// 节点轮次(退回重审递增,软删置-1)
	NodeRound  int    `json:"node_round" gorm:"not null;comment:节点轮次(退回重审递增,软删置-1)"`
	// 实例ID
	InstanceID uint   `json:"instance_id" gorm:"index:idx_task_instance_node;not null;comment:实例ID"`
	// 审批人ID
	ApproverID uint   `json:"approver_id" gorm:"index:idx_task_approver;not null;comment:审批人ID"`
	// 任务状态(PENDING/APPROVING/APPROVED/UNAPPROVED/REVOKED)
	Status     string `json:"status" gorm:"size:20;not null;comment:任务状态(PENDING/APPROVING/APPROVED/UNAPPROVED/REVOKED)"`
	// 任务类型(CC抄送/SN加签/BK退回/NL常规)
	Type       string `json:"type" gorm:"size:20;comment:任务类型(CC抄送/SN加签/BK退回/NL常规)"`
	// 审批动作(APPROVE/REJECT/SIGN/BACK/REVOKE)
	Action     string `json:"action" gorm:"size:20;comment:审批动作(APPROVE/REJECT/SIGN/BACK/REVOKE)"`
	base.BaseModel
}

func (ApprovalTask) TableName() string { return "approval_task" }

// ApprovalAddSignTask 加签任务。
type ApprovalAddSignTask struct {
	ID          uint   `json:"id" gorm:"primaryKey"`
	// 加签类型(BEFORE前加签/AFTER后加签)
	Type        string `json:"type" gorm:"size:20;not null;comment:加签类型(BEFORE前加签/AFTER后加签)"`
	// 新加签生成的任务ID
	TaskID      uint   `json:"task_id" gorm:"index;not null;comment:新加签生成的任务ID"`
	// 被加签的原任务ID
	SignTaskID  uint   `json:"sign_task_id" gorm:"index;not null;comment:被加签的原任务ID"`
	// 加签链根任务ID
	RootTaskID  *uint  `json:"root_task_id" gorm:"index;comment:加签链根任务ID"`
	// 加签顺序
	Sort        int64  `json:"sort" gorm:"not null;comment:加签顺序"`
	// 备注
	Comment     string `json:"comment" gorm:"type:text;comment:备注"`
	base.BaseModel
}

func (ApprovalAddSignTask) TableName() string { return "approval_add_sign_task" }

// ApprovalReturnBackRecord 退回记录。
type ApprovalReturnBackRecord struct {
	ID             uint   `json:"id" gorm:"primaryKey"`
	// 实例ID
	InstanceID     uint   `json:"instance_id" gorm:"index;not null;comment:实例ID"`
	// 触发退回的任务ID
	TaskID         uint   `json:"task_id" gorm:"not null;comment:触发退回的任务ID"`
	// 退回到的节点ID
	ReturnToNodeID uint   `json:"return_to_node_id" gorm:"not null;comment:退回到的节点ID"`
	// 退回原因
	ReturnReason   string `json:"return_reason" gorm:"type:text;comment:退回原因"`
	// 退回操作人ID
	ReturnUserID   uint   `json:"return_user_id" gorm:"not null;comment:退回操作人ID"`
	base.BaseModel
}

func (ApprovalReturnBackRecord) TableName() string { return "approval_return_back_record" }

// ApprovalRecord 审批操作记录(不可变审计日志)。
type ApprovalRecord struct {
	ID         uint   `json:"id" gorm:"primaryKey"`
	// 实例ID
	InstanceID uint   `json:"instance_id" gorm:"index;not null;comment:实例ID"`
	// 任务ID(自动通过/拒绝可空)
	TaskID     *uint  `json:"task_id" gorm:"comment:任务ID(自动通过/拒绝可空)"`
	// 节点ID
	NodeID     uint   `json:"node_id" gorm:"not null;comment:节点ID"`
	// 节点轮次
	NodeRound  int    `json:"node_round" gorm:"not null;comment:节点轮次"`
	// 审批结果(含AUTO_APPROVED/AUTO_UNAPPROVED合成态)
	Result     string `json:"result" gorm:"size:255;comment:审批结果(含AUTO_APPROVED/AUTO_UNAPPROVED合成态)"`
	// 审批意见
	Comment    string `json:"comment" gorm:"type:text;comment:审批意见"`
	base.BaseModel
}

func (ApprovalRecord) TableName() string { return "approval_record" }
