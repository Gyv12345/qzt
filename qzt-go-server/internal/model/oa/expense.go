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
	ExpenseTypeTravel        = "TRAVEL"        // 差旅
	ExpenseTypeOffice        = "OFFICE"        // 办公
	ExpenseTypeHospitality   = "HOSPITALITY"   // 招待
	ExpenseTypeTransport     = "TRANSPORT"     // 交通
	ExpenseTypeCommunication = "COMMUNICATION" // 通讯
	ExpenseTypeOther         = "OTHER"         // 其他
)

// 审批状态(与审批引擎 approval_status 一致)。
// 注意:审批引擎驳回写回的是 UNAPPROVED(StatusUnapproved),不是 REJECTED——
// REJECTED 为历史预留值,守卫判断需同时放行两者。
const (
	ApprovalStatusNone       = "NONE"
	ApprovalStatusApproving  = "APPROVING"
	ApprovalStatusApproved   = "APPROVED"
	ApprovalStatusRejected   = "REJECTED"
	ApprovalStatusUnapproved = "UNAPPROVED"
	ApprovalStatusRevoked    = "REVOKED"
)

// CanEditApproval 判断业务单据当前审批状态下是否允许编辑。
// 未提交/已驳回/已撤回可编辑(驳回撤回后修改再重提);审批中/已通过为锁定态。
func CanEditApproval(status string) bool {
	return status == ApprovalStatusNone ||
		status == ApprovalStatusRejected ||
		status == ApprovalStatusUnapproved ||
		status == ApprovalStatusRevoked
}

// 打款状态。
const (
	PaymentStatusUnpaid = 0 // 未打款
	PaymentStatusPaid   = 1 // 已打款
)

// OaExpense 报销单主表。
type OaExpense struct {
	ID uint `json:"id" gorm:"primaryKey"`
	// 报销单号
	ExpenseNo string `json:"expense_no" gorm:"size:64;uniqueIndex;not null;comment:报销单号"`
	// 报销标题
	Title string `json:"title" gorm:"size:200;not null;comment:报销标题"`
	// 申请人ID
	ApplicantID uint `json:"applicant_id" gorm:"index;not null;comment:申请人ID"`
	// 部门ID
	DeptID *uint `json:"dept_id" gorm:"index;comment:部门ID"`
	// 费用类型
	ExpenseType string `json:"expense_type" gorm:"size:32;index;not null;comment:费用类型"`
	// 报销总额
	Amount decimal.Decimal `json:"amount" gorm:"type:decimal(14,2);not null;comment:报销总额"`
	// 费用发生日期
	OccurDate xtime.DateTime `json:"occur_date" gorm:"type:date;comment:费用发生日期"`
	// 说明
	Description string `json:"description" gorm:"size:1000;comment:说明"`
	// 审批状态
	ApprovalStatus string `json:"approval_status" gorm:"size:20;default:NONE;index;comment:审批状态"`
	// 打款状态(0未打款1已打款)
	PaymentStatus int8 `json:"payment_status" gorm:"default:0;index;comment:打款状态(0未打款1已打款)"`
	base.BaseModel
}

func (OaExpense) TableName() string { return "oa_expense" }

// OaExpenseItem 报销明细行。
type OaExpenseItem struct {
	ID uint `json:"id" gorm:"primaryKey"`
	// 报销单ID
	ExpenseID uint `json:"expense_id" gorm:"index;not null;comment:报销单ID"`
	// 明细类型
	ItemType string `json:"item_type" gorm:"size:32;comment:明细类型"`
	// 金额
	Amount decimal.Decimal `json:"amount" gorm:"type:decimal(14,2);not null;comment:金额"`
	// 发生日期
	OccurDate xtime.NullDateTime `json:"occur_date" gorm:"type:date;comment:发生日期"`
	// 发票号
	InvoiceNo string `json:"invoice_no" gorm:"size:64;comment:发票号"`
	// 备注
	Remark string `json:"remark" gorm:"size:500;comment:备注"`
	base.BaseModel
}

func (OaExpenseItem) TableName() string { return "oa_expense_item" }

// ExpenseDetail 报销单详情(主表 + 明细行)。
type ExpenseDetail struct {
	Expense OaExpense       `json:"expense"`
	Items   []OaExpenseItem `json:"items"`
}
