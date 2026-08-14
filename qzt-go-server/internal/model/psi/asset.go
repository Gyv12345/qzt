package psi

import (
	"qzt-go-server/internal/model/base"
	"qzt-go-server/pkg/xtime"
)

// asset.go PSI 固定资产管理 model。
// 表由 docs/sql/psi_asset.sql 建立,不用 AutoMigrate。

// 资产状态。
const (
	AssetStatusInUse     = 1 // 使用中
	AssetStatusIdle      = 2 // 闲置
	AssetStatusInRepair  = 3 // 维修中
	AssetStatusScrapped  = 4 // 已报废
	AssetStatusLost      = 5 // 丢失
)

// PsiAsset 固定资产。
type PsiAsset struct {
	ID             uint            `json:"id" gorm:"primaryKey"`
	// 资产编号
	AssetNo        string          `json:"asset_no" gorm:"size:64;uniqueIndex;not null;comment:资产编号"`
	// 资产名称
	Name           string          `json:"name" gorm:"size:200;not null;comment:资产名称"`
	// 类别(电脑/设备/家具/车辆/其他)
	Category       string          `json:"category" gorm:"size:32;index;comment:类别(电脑/设备/家具/车辆/其他)"`
	// 规格型号
	Spec           string          `json:"spec" gorm:"size:200;comment:规格型号"`
	// 序列号/SN码
	SerialNo       string          `json:"serial_no" gorm:"size:100;comment:序列号/SN码"`
	// 存放仓库ID
	WarehouseID    *uint           `json:"warehouse_id" gorm:"index;comment:存放仓库ID"`
	// 使用部门ID
	DeptID         *uint           `json:"dept_id" gorm:"index;comment:使用部门ID"`
	// 使用人ID
	OwnerID        *uint           `json:"owner_id" gorm:"index;comment:使用人ID"`
	// 采购日期
	PurchaseDate   xtime.NullDateTime `json:"purchase_date" gorm:"type:date;comment:采购日期"`
	// 采购价格
	PurchasePrice  string          `json:"purchase_price" gorm:"type:varchar(32);comment:采购价格"`
	// 已折旧
	Depreciation   string          `json:"depreciation" gorm:"type:varchar(32);default:0;comment:已折旧"`
	// 净值
	NetValue       string          `json:"net_value" gorm:"type:varchar(32);comment:净值"`
	// 使用年限(月)
	UsefulLife     int             `json:"useful_life" gorm:"default:0;comment:使用年限(月)"`
	// 1使用2闲置3维修4报废5丢失
	Status         int8            `json:"status" gorm:"default:1;index;comment:1使用2闲置3维修4报废5丢失"`
	// 存放位置
	Location       string          `json:"location" gorm:"size:200;comment:存放位置"`
	Remark         string          `json:"remark" gorm:"size:500"`
	base.BaseModel
}

func (PsiAsset) TableName() string { return "psi_asset" }
