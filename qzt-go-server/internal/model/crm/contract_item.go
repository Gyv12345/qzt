package crm

import (
	"github.com/shopspring/decimal"

	"qzt-go-server/internal/model/base"
)

// contract_item.go 合同产品明细。
// 合同可关联多条产品明细(名称/数量/单价/小计),用于套打渲染产品表格。

type CrmContractItem struct {
	ID          uint            `json:"id" gorm:"primaryKey"`
	// 合同ID
	ContractID  uint            `json:"contract_id" gorm:"index:idx_contract_item_contract;not null;comment:合同ID"`
	// 关联产品ID
	ProductID   *uint           `json:"product_id" gorm:"comment:关联产品ID"`
	// 产品名称
	ProductName string          `json:"product_name" gorm:"size:255;not null;comment:产品名称"`
	// 数量
	Quantity    decimal.Decimal `json:"quantity" gorm:"type:decimal(14,2);not null;default:1;comment:数量"`
	// 单位
	Unit        string          `json:"unit" gorm:"size:20;comment:单位"`
	// 单价
	UnitPrice   decimal.Decimal `json:"unit_price" gorm:"type:decimal(14,2);not null;default:0;comment:单价"`
	// 小计(数量*单价)
	Amount      decimal.Decimal `json:"amount" gorm:"type:decimal(14,2);not null;default:0;comment:小计(数量*单价)"`
	// 备注
	Remark      string          `json:"remark" gorm:"size:255;comment:备注"`
	base.BaseModel
}

func (CrmContractItem) TableName() string { return "crm_contract_item" }
