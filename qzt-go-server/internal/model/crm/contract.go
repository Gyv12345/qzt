package crm

import (
	"github.com/shopspring/decimal"

	"qzt-go-server/internal/model/base"
	"qzt-go-server/pkg/xtime"
)

// contract.go CRM 合同 + 回款计划 + 回款记录 + 工商抬头。

// 合同阶段(字典 CONTRACT_STAGE)。
const (
	ContractStageDraft      = "DRAFT"      // 草稿
	ContractStageApproval   = "APPROVAL"   // 审批中
	ContractStageSigned     = "SIGNED"     // 已签订
	ContractStageExecuting  = "EXECUTING"  // 执行中
	ContractStageCompleted  = "COMPLETED"  // 已完成
	ContractStageTerminated = "TERMINATED" // 已终止
)

// 回款计划状态。
const (
	PaymentPlanUnpaid   int8 = 0 // 未回款
	PaymentPlanPartial  int8 = 1 // 部分
	PaymentPlanPaid     int8 = 2 // 已回款
)

// CrmBusinessTitle 工商抬头(开票用的企业信息)。
type CrmBusinessTitle struct {
	ID         uint   `json:"id" gorm:"primaryKey"`
	Name       string `json:"name" gorm:"size:255;index;not null;comment:企业名称"`
	TaxNo      string `json:"tax_no" gorm:"size:50;comment:税号"`
	Address    string `json:"address" gorm:"size:255;comment:地址"`
	Phone      string `json:"phone" gorm:"size:30;comment:电话"`
	BankName   string `json:"bank_name" gorm:"size:100;comment:开户行"`
	BankAccount string `json:"bank_account" gorm:"size:50;comment:银行账号"`
	base.BaseModel
}

func (CrmBusinessTitle) TableName() string { return "crm_business_title" }

// CrmContract CRM 合同。received_amount 由回款记录增删时累计维护,不信任客户端。
type CrmContract struct {
	ID             uint            `json:"id" gorm:"primaryKey"`
	ContractNo     string          `json:"contract_no" gorm:"size:64;comment:合同编号"`
	Name           string          `json:"name" gorm:"size:255;not null;comment:合同名称"`
	CustomerID     uint            `json:"customer_id" gorm:"index:idx_contract_customer;not null;comment:客户ID"`
	OpportunityID  *uint           `json:"opportunity_id" gorm:"index;comment:来源商机ID"`
	TitleID        *uint           `json:"title_id" gorm:"comment:工商抬头ID"`
	TotalAmount    decimal.Decimal `json:"total_amount" gorm:"type:decimal(14,2);not null;comment:合同总额"`
	ReceivedAmount decimal.Decimal `json:"received_amount" gorm:"type:decimal(14,2);default:0;comment:已回款总额(累计维护)"`
	SignedDate     xtime.NullDateTime `json:"signed_date" gorm:"type:date;comment:签订日期"`
	StartDate      xtime.NullDateTime `json:"start_date" gorm:"type:date;comment:开始日期"`
	EndDate        xtime.NullDateTime `json:"end_date" gorm:"type:date;comment:结束日期"`
	Stage          string          `json:"stage" gorm:"size:32;index;default:DRAFT;not null;comment:阶段(字典CONTRACT_STAGE)"`
	ApprovalStatus string          `json:"approval_status" gorm:"size:32;default:NONE;comment:审批状态(NONE/PROCESSING/APPROVED/REJECTED/REVOKED)"`
	OwnerID        *uint           `json:"owner_id" gorm:"index:idx_contract_owner;comment:负责人"`
	FollowerID     *uint           `json:"follower_id" gorm:"comment:最新跟进人"`
	FollowTime     xtime.NullDateTime `json:"follow_time" gorm:"type:datetime;comment:最新跟进时间"`
	Content        string          `json:"content" gorm:"type:text;comment:合同内容/备注"`
	base.BaseModel
}

func (CrmContract) TableName() string { return "crm_contract" }

// CrmContractPaymentPlan 回款计划。received_amount 由回款记录累计维护。
type CrmContractPaymentPlan struct {
	ID             uint            `json:"id" gorm:"primaryKey"`
	ContractID     uint            `json:"contract_id" gorm:"index;not null;comment:合同ID"`
	PlanDate       xtime.NullDateTime `json:"plan_date" gorm:"type:date;not null;comment:计划回款日期"`
	PlanAmount     decimal.Decimal `json:"plan_amount" gorm:"type:decimal(14,2);not null;comment:计划金额"`
	ReceivedAmount decimal.Decimal `json:"received_amount" gorm:"type:decimal(14,2);default:0;comment:已回款金额(累计维护)"`
	Status         int8            `json:"status" gorm:"default:0;comment:0未回款 1部分 2已回款"`
	Remark         string          `json:"remark" gorm:"size:200"`
	base.BaseModel
}

func (CrmContractPaymentPlan) TableName() string { return "crm_contract_payment_plan" }

// CrmContractPaymentRecord 回款记录。增删时双向更新 plan 与 contract 的累计字段。
type CrmContractPaymentRecord struct {
	ID           uint            `json:"id" gorm:"primaryKey"`
	ContractID   uint            `json:"contract_id" gorm:"index;not null;comment:合同ID"`
	PlanID       *uint           `json:"plan_id" gorm:"index;comment:关联回款计划(可选)"`
	ReceivedDate xtime.NullDateTime `json:"received_date" gorm:"type:date;not null;comment:实际回款日期"`
	Amount       decimal.Decimal `json:"amount" gorm:"type:decimal(14,2);not null;comment:回款金额"`
	Method       string          `json:"method" gorm:"size:32;comment:回款方式(字典PAYMENT_METHOD)"`
	Remark       string          `json:"remark" gorm:"size:200"`
	base.BaseModel
}

func (CrmContractPaymentRecord) TableName() string { return "crm_contract_payment_record" }
