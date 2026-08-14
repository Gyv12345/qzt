package project

import (
	"qzt-go-server/internal/model/base"
	"qzt-go-server/pkg/xtime"
)

// project.go 项目与任务 model。
// 表由 docs/sql/project.sql 建立,不用 AutoMigrate。

// 项目状态。
const (
	ProjectStatusPlanning  = 1 // 规划中
	ProjectStatusInProgress = 2 // 进行中
	ProjectStatusPaused    = 3 // 暂停
	ProjectStatusCompleted = 4 // 已完成
	ProjectStatusCanceled  = 5 // 已取消
)

// 项目优先级。
const (
	PriorityLow    = 1 // 低
	PriorityNormal = 2 // 中
	PriorityHigh   = 3 // 高
	PriorityUrgent = 4 // 紧急
)

// ProjProject 项目。
type ProjProject struct {
	ID             uint            `json:"id" gorm:"primaryKey"`
	// 项目编号
	ProjectNo      string          `json:"project_no" gorm:"size:64;uniqueIndex;not null;comment:项目编号"`
	// 项目名称
	Name           string          `json:"name" gorm:"size:200;not null;comment:项目名称"`
	// 项目描述
	Description    string          `json:"description" gorm:"size:2000;comment:项目描述"`
	// 关联客户ID
	CustomerID     *uint           `json:"customer_id" gorm:"index;comment:关联客户ID"`
	// 客户名称(冗余)
	CustomerName   string          `json:"customer_name" gorm:"size:200;comment:客户名称(冗余)"`
	// 关联合同ID
	ContractID     *uint           `json:"contract_id" gorm:"index;comment:关联合同ID"`
	// 项目经理ID
	ManagerID      *uint           `json:"manager_id" gorm:"index;comment:项目经理ID"`
	// 成员ID(逗号分隔)
	MemberIDs      string          `json:"member_ids" gorm:"size:500;comment:成员ID(逗号分隔)"`
	// 1规划2进行3暂停4完成5取消
	Status         int8            `json:"status" gorm:"default:1;index;comment:1规划2进行3暂停4完成5取消"`
	// 1低2中3高4紧急
	Priority       int8            `json:"priority" gorm:"default:2;comment:1低2中3高4紧急"`
	// 开始日期
	StartDate      xtime.DateTime  `json:"start_date" gorm:"type:date;comment:开始日期"`
	// 计划完成日期
	EndDate        xtime.NullDateTime `json:"end_date" gorm:"type:date;comment:计划完成日期"`
	// 进度(0-100)
	Progress       int8            `json:"progress" gorm:"default:0;comment:进度(0-100)"`
	// 标签(逗号分隔)
	Tags           string          `json:"tags" gorm:"size:200;comment:标签(逗号分隔)"`
	base.BaseModel
}

func (ProjProject) TableName() string { return "proj_project" }

// 任务状态。
const (
	TaskStatusTodo      = 1 // 待办
	TaskStatusInProgress = 2 // 进行中
	TaskStatusDone      = 3 // 已完成
	TaskStatusCanceled  = 4 // 已取消
)

// ProjTask 任务。
type ProjTask struct {
	ID          uint            `json:"id" gorm:"primaryKey"`
	// 所属项目ID
	ProjectID   uint            `json:"project_id" gorm:"index;not null;comment:所属项目ID"`
	// 任务标题
	Title       string          `json:"title" gorm:"size:200;not null;comment:任务标题"`
	// 任务描述
	Description string          `json:"description" gorm:"size:2000;comment:任务描述"`
	// 负责人ID
	AssigneeID  *uint           `json:"assignee_id" gorm:"index;comment:负责人ID"`
	// 1待办2进行3完成4取消
	Status      int8            `json:"status" gorm:"default:1;index;comment:1待办2进行3完成4取消"`
	// 1低2中3高4紧急
	Priority    int8            `json:"priority" gorm:"default:2;comment:1低2中3高4紧急"`
	// 排序
	SortOrder   int             `json:"sort_order" gorm:"default:0;comment:排序"`
	// 截止日期
	DueDate     xtime.NullDateTime `json:"due_date" gorm:"type:date;comment:截止日期"`
	// 完成时间
	DoneAt      xtime.NullDateTime `json:"done_at" gorm:"type:datetime;comment:完成时间"`
	base.BaseModel
}

func (ProjTask) TableName() string { return "proj_task" }

// ProjectDetail 项目详情(含任务列表)。
type ProjectDetail struct {
	Project ProjProject `json:"project"`
	Tasks   []ProjTask  `json:"tasks"`
}
