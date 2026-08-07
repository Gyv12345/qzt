package oa

import (
	"github.com/shopspring/decimal"

	"qzt-go-server/internal/model/base"
	"qzt-go-server/pkg/xtime"
)

// expense.go OA 报销单 model。
// 表由 docs/sql/oa_expense.sql 建立,不用 AutoMigrate。

// 报销类型(字典 EXPENSE_TYPE)。
const (
	ExpenseTypeTravel    = "TRAVEL"    // 差旅
	ExpenseTypeOffice    = "OFFICE"    // 办公
	ExpenseTypeHospitality = "HOSPITALITY" // 招待
	ExpenseTypeTransport = "TRANSPORT" // 交通
	ExpenseTypeCommunication = "COMMUNICATION" // 通讯
	ExpenseTypeOther     = "OTHER"     // 其他
)

// 审批状态(与审批引擎 approval_status 一致)。
const (
	ApprovalStatusNone      = "NONE"
	ApprovalStatusApproving = "APPROVING"
	ApprovalStatusApproved  = "APPROVED"
	ApprovalStatusRejected  = "REJECTED"
	ApprovalStatusRevoked   = "REVOKED"
)

// 打款状态。
const (
	PaymentStatusUnpaid = 0 // 未打款
	PaymentStatusPaid   = 1 // 已打款
)

// OaExpense 报销单主表。
type OaExpense struct {
	ID             uint            `json:"id" gorm:"primaryKey"`
	ExpenseNo      string          `json:"expense_no" gorm:"size:64;uniqueIndex;not null;comment:报销单号"`
	Title          string          `json:"title" gorm:"size:200;not null;comment:报销标题"`
	ApplicantID    uint            `json:"applicant_id" gorm:"index;not null;comment:申请人ID"`
	DeptID         *uint           `json:"dept_id" gorm:"index;comment:部门ID"`
	ExpenseType    string          `json:"expense_type" gorm:"size:32;index;not null;comment:费用类型"`
	Amount         decimal.Decimal `json:"amount" gorm:"type:decimal(14,2);not null;comment:报销总额"`
	OccurDate      xtime.DateTime  `json:"occur_date" gorm:"type:date;comment:费用发生日期"`
	Description    string          `json:"description" gorm:"size:1000;comment:说明"`
	ApprovalStatus string          `json:"approval_status" gorm:"size:20;default:NONE;index;comment:审批状态"`
	PaymentStatus  int8            `json:"payment_status" gorm:"default:0;index;comment:打款状态(0未打款1已打款)"`
	base.BaseModel
}

func (OaExpense) TableName() string { return "oa_expense" }

// OaExpenseItem 报销明细行。
type OaExpenseItem struct {
	ID         uint            `json:"id" gorm:"primaryKey"`
	ExpenseID  uint            `json:"expense_id" gorm:"index;not null;comment:报销单ID"`
	ItemType   string          `json:"item_type" gorm:"size:32;comment:明细类型"`
	Amount     decimal.Decimal `json:"amount" gorm:"type:decimal(14,2);not null;comment:金额"`
	OccurDate  xtime.NullDateTime `json:"occur_date" gorm:"type:date;comment:发生日期"`
	InvoiceNo  string          `json:"invoice_no" gorm:"size:64;comment:发票号"`
	Remark     string          `json:"remark" gorm:"size:500;comment:备注"`
	base.BaseModel
}

func (OaExpenseItem) TableName() string { return "oa_expense_item" }

// ExpenseDetail 报销单详情(主表 + 明细行)。
type ExpenseDetail struct {
	Expense OaExpense       `json:"expense"`
	Items   []OaExpenseItem `json:"items"`
}
