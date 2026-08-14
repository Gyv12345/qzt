package finance

import (
	"qzt-go-server/internal/model/base"
	"qzt-go-server/pkg/xtime"

	"github.com/shopspring/decimal"
)

// receivable.go 应收应付往来台账。
// 单表双用:direction=RECEIVABLE 应收(客户欠我) / PAYABLE 应付(我欠供应商)。
// 每条记录代表一笔往来款项,可关联业务单据(合同/采购单等),支持部分结算。

// 往来方向。
const (
	DirectionReceivable = "RECEIVABLE" // 应收(客户欠我)
	DirectionPayable    = "PAYABLE"    // 应付(我欠供应商)
)

// 结算状态。
const (
	SettleStatusUnsettled = 0 // 未结算
	SettleStatusPartial   = 1 // 部分结算
	SettleStatusSettled   = 2 // 已结清
)

// FinReceivable 应收应付往来款。
type FinReceivable struct {
	ID             uint            `json:"id" gorm:"primaryKey"`
	// 往来单号
	DocNo          string          `json:"doc_no" gorm:"size:64;uniqueIndex;not null;comment:往来单号"`
	// RECEIVABLE应收/PAYABLE应付
	Direction      string          `json:"direction" gorm:"size:20;index;not null;comment:RECEIVABLE应收/PAYABLE应付"`
	// 往来方类型(CUSTOMER/SUPPLIER/EMPLOYEE)
	PartyType      string          `json:"party_type" gorm:"size:20;comment:往来方类型(CUSTOMER/SUPPLIER/EMPLOYEE)"`
	// 往来方ID(客户/供应商/员工ID)
	PartyID        *uint           `json:"party_id" gorm:"index;comment:往来方ID(客户/供应商/员工ID)"`
	// 往来方名称(冗余,列表展示用)
	PartyName      string          `json:"party_name" gorm:"size:200;comment:往来方名称(冗余,列表展示用)"`
	// 发生日期
	OccurDate      xtime.DateTime  `json:"occur_date" gorm:"type:date;index;not null;comment:发生日期"`
	// 到期日期
	DueDate        xtime.NullDateTime `json:"due_date" gorm:"type:date;comment:到期日期"`
	// 原始金额
	OriginalAmount decimal.Decimal `json:"original_amount" gorm:"type:decimal(14,2);not null;comment:原始金额"`
	// 已结算金额
	SettledAmount  decimal.Decimal `json:"settled_amount" gorm:"type:decimal(14,2);default:0;comment:已结算金额"`
	// 关联业务单据(可选)
	BizType string `json:"biz_type" gorm:"size:32;comment:CONTRACT/PURCHASE_ORDER/LOAN等"`
	// 业务单据ID
	BizID   *uint  `json:"biz_id" gorm:"index;comment:业务单据ID"`
	// 状态
	Status   int8   `json:"status" gorm:"default:0;index;comment:0未结算1部分2已结清"`
	Remark   string `json:"remark" gorm:"size:500"`
	base.BaseModel
}

func (FinReceivable) TableName() string { return "fin_receivable" }
