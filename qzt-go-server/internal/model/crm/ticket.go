package crm

import (
	"qzt-go-server/internal/model/base"
	"qzt-go-server/pkg/xtime"
)

// ticket.go CRM 售后工单 model。
// 表由 docs/sql/crm_ticket.sql 建立,不用 AutoMigrate。

// 工单状态。
const (
	TicketStatusOpen       = 1 // 待处理
	TicketStatusProcessing = 2 // 处理中
	TicketStatusResolved   = 3 // 已解决
	TicketStatusClosed     = 4 // 已关闭
	TicketStatusReopened   = 5 // 已重开
)

// 优先级。
const (
	TicketPriorityLow    = 1
	TicketPriorityNormal = 2
	TicketPriorityHigh   = 3
	TicketPriorityUrgent = 4
)

// CrmTicket 售后工单。
type CrmTicket struct {
	ID          uint            `json:"id" gorm:"primaryKey"`
	TicketNo    string          `json:"ticket_no" gorm:"size:64;uniqueIndex;not null;comment:工单编号"`
	Title       string          `json:"title" gorm:"size:200;not null;comment:标题"`
	Description string          `json:"description" gorm:"size:2000;comment:问题描述"`
	CustomerID  *uint           `json:"customer_id" gorm:"index;comment:客户ID"`
	CustomerName string         `json:"customer_name" gorm:"size:200;comment:客户名称"`
	ContractID  *uint           `json:"contract_id" gorm:"index;comment:关联合同ID"`
	ContactName string          `json:"contact_name" gorm:"size:100;comment:联系人"`
	ContactPhone string         `json:"contact_phone" gorm:"size:50;comment:联系电话"`
	Category    string          `json:"category" gorm:"size:32;comment:问题类型(字典 TICKET_CATEGORY)"`
	Priority    int8            `json:"priority" gorm:"default:2;comment:1低2中3高4紧急"`
	Status      int8            `json:"status" gorm:"default:1;index;comment:1待处理2处理中3已解决4已关闭5已重开"`
	HandlerID   *uint           `json:"handler_id" gorm:"index;comment:处理人ID"`
	Solution    string          `json:"solution" gorm:"size:2000;comment:解决方案"`
	ResolvedAt  xtime.NullDateTime `json:"resolved_at" gorm:"type:datetime;comment:解决时间"`
	base.BaseModel
}

func (CrmTicket) TableName() string { return "crm_ticket" }

// CrmTicketLog 工单处理日志。
type CrmTicketLog struct {
	ID        uint   `json:"id" gorm:"primaryKey"`
	TicketID  uint   `json:"ticket_id" gorm:"index;not null;comment:工单ID"`
	Content   string `json:"content" gorm:"size:2000;not null;comment:处理内容"`
	OperatorID uint  `json:"operator_id" gorm:"comment:操作人ID"`
	OldStatus int8   `json:"old_status" gorm:"comment:变更前状态"`
	NewStatus int8   `json:"new_status" gorm:"comment:变更后状态"`
	base.BaseModel
}

func (CrmTicketLog) TableName() string { return "crm_ticket_log" }

// TicketDetail 工单详情(含处理日志)。
type TicketDetail struct {
	Ticket CrmTicket      `json:"ticket"`
	Logs   []CrmTicketLog `json:"logs"`
}
