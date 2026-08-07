package oa

import (
	"qzt-go-server/internal/model/base"
	"qzt-go-server/pkg/xtime"
)

// loan.go OA 备用金/借款 model。
// 表由 docs/sql/oa_loan.sql 建立,不用 AutoMigrate。

// 还款状态。
const (
	LoanRepaidStatusUnpaid  = 0 // 未还清
	LoanRepaidStatusPartial = 1 // 部分还款
	LoanRepaidStatusPaid    = 2 // 已还清
)

// OaLoan 备用金/借款单。
type OaLoan struct {
	ID             uint           `json:"id" gorm:"primaryKey"`
	LoanNo         string         `json:"loan_no" gorm:"size:64;uniqueIndex;not null;comment:借款单号"`
	Title          string         `json:"title" gorm:"size:200;not null;comment:借款标题"`
	ApplicantID    uint           `json:"applicant_id" gorm:"index;not null;comment:借款人ID"`
	DeptID         *uint          `json:"dept_id" gorm:"index;comment:部门ID"`
	LoanType       string         `json:"loan_type" gorm:"size:32;not null;comment:借款类型(备用金/差旅借支/个人借款/其他)"`
	Amount         string         `json:"amount" gorm:"type:varchar(32);not null;comment:借款金额(decimal 字符串)"`
	ExpectedDate   xtime.DateTime `json:"expected_date" gorm:"type:date;comment:预计还款日期"`
	Reason         string         `json:"reason" gorm:"size:500;comment:借款事由"`
	ApprovalStatus string         `json:"approval_status" gorm:"size:20;default:NONE;index;comment:审批状态"`
	RepaidStatus   int8           `json:"repaid_status" gorm:"default:0;index;comment:还款状态(0未还1部分2已还清)"`
	RepaidAmount   string         `json:"repaid_amount" gorm:"type:varchar(32);default:0;comment:已还金额"`
	base.BaseModel
}

func (OaLoan) TableName() string { return "oa_loan" }
