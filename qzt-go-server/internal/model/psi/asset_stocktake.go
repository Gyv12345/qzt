package psi

import (
	"qzt-go-server/internal/model/base"
	"qzt-go-server/pkg/xtime"
)

// asset_stocktake.go 资产盘点单 model(区别于库存盘点 psi_stocktake)。
// 范围快照式:发起时按范围冻结资产明细(编号/名称/状态快照),逐项填报结果,
// 完成时要求全部明细已盘,并按缺失/损坏联动资产状态。
// 表由 docs/sql/psi_asset.sql 建立,不用 AutoMigrate。

// 资产盘点范围类型。
const (
	AssetStocktakeScopeAll      = "all"      // 全部资产
	AssetStocktakeScopeCategory = "category" // 按分类(scope_value=分类名)
	AssetStocktakeScopeDept     = "dept"     // 按部门(scope_value=部门ID)
)

// 资产盘点单状态。
const (
	AssetStocktakeStatusOngoing int8 = 1 // 进行中
	AssetStocktakeStatusDone    int8 = 2 // 已完成
)

// 资产盘点结果。
const (
	AssetCheckResultInStock int8 = 1 // 在库
	AssetCheckResultMissing int8 = 2 // 缺失
	AssetCheckResultDamaged int8 = 3 // 损坏
)

// PsiAssetStocktake 资产盘点单。
type PsiAssetStocktake struct {
	ID uint `json:"id" gorm:"primaryKey"`
	// 盘点单号(PD+日期+序号)
	StocktakeNo string `json:"stocktake_no" gorm:"size:32;uniqueIndex;not null;comment:盘点单号"`
	// 盘点范围类型(all/category/dept)
	ScopeType string `json:"scope_type" gorm:"size:20;not null;comment:盘点范围类型(all/category/dept)"`
	// 范围值(分类名或部门ID,all 时空)
	ScopeValue string `json:"scope_value" gorm:"size:64;comment:范围值(分类名或部门ID,all时空)"`
	// 1进行中 2已完成
	Status int8 `json:"status" gorm:"default:1;index;comment:1进行中 2已完成"`
	// 应盘总数(发起时快照)
	TotalCount int `json:"total_count" gorm:"default:0;comment:应盘总数"`
	// 已盘数(首次填报的明细数)
	CheckedCount int `json:"checked_count" gorm:"default:0;comment:已盘数"`
	// 发起人ID
	StocktakeBy uint `json:"stocktake_by" gorm:"index;comment:发起人ID"`
	// 发起时间
	StocktakeAt xtime.DateTime `json:"stocktake_at" gorm:"type:datetime;comment:发起时间"`
	// 完成时间(未完成为空)
	FinishedAt xtime.NullDateTime `json:"finished_at" gorm:"type:datetime;comment:完成时间"`
	Remark     string             `json:"remark" gorm:"size:255"`
	base.BaseModel
}

func (PsiAssetStocktake) TableName() string { return "psi_asset_stocktake" }

// PsiAssetStocktakeItem 资产盘点明细。
type PsiAssetStocktakeItem struct {
	ID uint `json:"id" gorm:"primaryKey"`
	// 盘点单ID
	StocktakeID uint `json:"stocktake_id" gorm:"index;not null;comment:盘点单ID"`
	// 资产ID
	AssetID uint `json:"asset_id" gorm:"index;not null;comment:资产ID"`
	// 资产编号(发起时快照)
	AssetNo string `json:"asset_no" gorm:"size:32;comment:资产编号(发起时快照)"`
	// 资产名称(发起时快照)
	AssetName string `json:"asset_name" gorm:"size:64;comment:资产名称(发起时快照)"`
	// 盘点时资产状态快照(1使用2闲置3维修)
	ExpectedStatus int8 `json:"expected_status" gorm:"default:0;comment:盘点时资产状态快照"`
	// 盘点结果(1在库2缺失3损坏,NULL=未盘)
	ResultStatus *int8 `json:"result_status" gorm:"comment:盘点结果(1在库2缺失3损坏,NULL未盘)"`
	// 结果备注
	ResultRemark string `json:"result_remark" gorm:"size:200;comment:结果备注"`
	// 填报人ID
	CheckedBy uint `json:"checked_by" gorm:"comment:填报人ID"`
	// 填报时间(未盘为空)
	CheckedAt xtime.NullDateTime `json:"checked_at" gorm:"type:datetime;comment:填报时间"`
	CreatedAt xtime.DateTime     `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt xtime.DateTime     `json:"updated_at" gorm:"autoUpdateTime"`
}

func (PsiAssetStocktakeItem) TableName() string { return "psi_asset_stocktake_item" }
