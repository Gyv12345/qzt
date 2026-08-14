package finance

import (
	"github.com/shopspring/decimal"

	"qzt-go-server/internal/model/base"
	"qzt-go-server/pkg/xtime"
)

// finance.go 财务管理(基础版)。
// 科目体系 + 记账凭证 + 发票管理。
// 采用收付记账法(简化),不做复式记账。凭证记录收支流水。

// 科目类型。
const (
	AccountTypeAsset      = "ASSET"       // 资产
	AccountTypeLiability  = "LIABILITY"   // 负债
	AccountTypeEquity     = "EQUITY"      // 所有者权益
	AccountTypeIncome     = "INCOME"      // 收入
	AccountTypeExpense    = "EXPENSE"     // 支出
)

// 余额方向。
const (
	BalanceDirDebit  = "DEBIT"  // 借方(资产/支出)
	BalanceDirCredit = "CREDIT" // 贷方(负债/权益/收入)
)

// FinAccount 会计科目。
type FinAccount struct {
	ID       uint   `json:"id" gorm:"primaryKey"`
	// 科目编码(如1001)
	Code     string `json:"code" gorm:"size:32;uniqueIndex;not null;comment:科目编码(如1001)"`
	// 科目名称
	Name     string `json:"name" gorm:"size:128;not null;comment:科目名称"`
	// ASSET/LIABILITY/EQUITY/INCOME/EXPENSE
	Type     string `json:"type" gorm:"size:20;index;not null;comment:ASSET/LIABILITY/EQUITY/INCOME/EXPENSE"`
	// 上级科目ID
	ParentID *uint  `json:"parent_id" gorm:"index;comment:上级科目ID"`
	// DEBIT/CREDIT
	BalanceDir string `json:"balance_dir" gorm:"size:10;not null;comment:DEBIT/CREDIT"`
	// 层级
	Level     int    `json:"level" gorm:"default:1;comment:层级"`
	// 是否末级科目(凭证只能选末级)
	IsLeaf   bool   `json:"is_leaf" gorm:"default:true;comment:是否末级科目(凭证只能选末级)"`
	// 1启用0禁用
	Status   int8   `json:"status" gorm:"default:1;comment:1启用0禁用"`
	Sort     int    `json:"sort" gorm:"default:0"`
	Remark   string `json:"remark" gorm:"size:255"`
	base.BaseModel
}

func (FinAccount) TableName() string { return "fin_account" }

// FinVoucher 记账凭证。
type FinVoucher struct {
	ID           uint            `json:"id" gorm:"primaryKey"`
	// 凭证编号
	VoucherNo    string          `json:"voucher_no" gorm:"size:64;uniqueIndex;not null;comment:凭证编号"`
	// 凭证日期
	VoucherDate  xtime.DateTime  `json:"voucher_date" gorm:"type:date;index;not null;comment:凭证日期"`
	// 科目ID
	AccountID    uint            `json:"account_id" gorm:"index;not null;comment:科目ID"`
	// 摘要
	Description  string          `json:"description" gorm:"size:500;not null;comment:摘要"`
	// DEBIT借/CREDIT贷
	Direction    string          `json:"direction" gorm:"size:10;not null;comment:DEBIT借/CREDIT贷"`
	// 金额
	Amount       decimal.Decimal `json:"amount" gorm:"type:decimal(14,2);not null;comment:金额"`
	// 币种
	Currency     string          `json:"currency" gorm:"size:10;default:CNY;comment:币种"`
	// 关联业务单据(可选)
	BizType      string          `json:"biz_type" gorm:"size:32;comment:业务类型(CONTRACT_PAYMENT/PURCHASE/SALES等)"`
	// 业务单据ID
	BizID        *uint           `json:"biz_id" gorm:"comment:业务单据ID"`
	// 状态
	Status       string          `json:"status" gorm:"size:20;default:DRAFT;index;comment:DRAFT/CONFIRMED"`
	// 制单人ID
	OperatorID   *uint           `json:"operator_id" gorm:"comment:制单人ID"`
	Remark       string          `json:"remark" gorm:"size:500"`
	base.BaseModel
}

func (FinVoucher) TableName() string { return "fin_voucher" }

// 凭证状态。
const (
	VoucherStatusDraft    = "DRAFT"    // 草稿
	VoucherStatusConfirmed = "CONFIRMED" // 已确认
)

// FinInvoice 发票管理。
type FinInvoice struct {
	ID            uint            `json:"id" gorm:"primaryKey"`
	// 发票号码
	InvoiceNo     string          `json:"invoice_no" gorm:"size:64;uniqueIndex;not null;comment:发票号码"`
	// 发票类型(VAT_SPECIAL增值税专票/VAT_NORMAL普票/ELECTRONIC电子发票)
	InvoiceType   string          `json:"invoice_type" gorm:"size:32;not null;comment:发票类型(VAT_SPECIAL增值税专票/VAT_NORMAL普票/ELECTRONIC电子发票)"`
	// RECEIVED收票/ISSUED开票
	Direction     string          `json:"direction" gorm:"size:10;not null;index;comment:RECEIVED收票/ISSUED开票"`
	// 开票日期
	InvoiceDate   xtime.DateTime  `json:"invoice_date" gorm:"type:date;index;not null;comment:开票日期"`
	// 不含税金额
	Amount        decimal.Decimal `json:"amount" gorm:"type:decimal(14,2);not null;comment:不含税金额"`
	// 税率(如0.13)
	TaxRate       decimal.Decimal `json:"tax_rate" gorm:"type:decimal(5,4);comment:税率(如0.13)"`
	// 税额
	TaxAmount     decimal.Decimal `json:"tax_amount" gorm:"type:decimal(14,2);comment:税额"`
	// 价税合计
	TotalAmount   decimal.Decimal `json:"total_amount" gorm:"type:decimal(14,2);not null;comment:价税合计"`
	// 关联方
	PartyName     string          `json:"party_name" gorm:"size:255;comment:对方名称(客户/供应商)"`
	// 对方税号
	PartyTaxNo    string          `json:"party_tax_no" gorm:"size:50;comment:对方税号"`
	// 关联业务
	BizType       string          `json:"biz_type" gorm:"size:32;comment:CONTRACT/PURCHASE/SALES"`
	// 业务单据ID
	BizID         *uint           `json:"biz_id" gorm:"comment:业务单据ID"`
	Remark        string          `json:"remark" gorm:"size:500"`
	base.BaseModel
}

func (FinInvoice) TableName() string { return "fin_invoice" }

// 发票方向。
const (
	InvoiceDirectionReceived = "RECEIVED" // 收票(收到供应商发票)
	InvoiceDirectionIssued   = "ISSUED"   // 开票(给客户开票)
)

// 发票类型。
const (
	InvoiceTypeVATSpecial   = "VAT_SPECIAL"   // 增值税专用发票
	InvoiceTypeVATNormal    = "VAT_NORMAL"    // 增值税普通发票
	InvoiceTypeElectronic   = "ELECTRONIC"    // 电子发票
)
