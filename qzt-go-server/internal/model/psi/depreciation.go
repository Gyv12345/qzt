package psi

import "qzt-go-server/pkg/xtime"

// depreciation.go 固定资产折旧计提日志 model。
// 每月每资产一条,(asset_id, period) 唯一索引即幂等键。
// 表由 docs/sql/psi_asset.sql 建立,不用 AutoMigrate。

// PsiAssetDepreciationLog 资产折旧计提日志。
type PsiAssetDepreciationLog struct {
	ID uint `json:"id" gorm:"primaryKey"`
	// 资产ID
	AssetID uint `json:"asset_id" gorm:"not null;uniqueIndex:uk_asset_period,priority:1;comment:资产ID"`
	// 计提期间(YYYY-MM)
	Period string `json:"period" gorm:"type:char(7);not null;uniqueIndex:uk_asset_period,priority:2;comment:计提期间(YYYY-MM)"`
	// 本期折旧额
	Amount string `json:"amount" gorm:"type:varchar(32);comment:本期折旧额"`
	// 计提前已折旧快照
	BeforeDepreciation string `json:"before_depreciation" gorm:"type:varchar(32);comment:计提前已折旧快照"`
	// 计提后已折旧快照
	AfterDepreciation string `json:"after_depreciation" gorm:"type:varchar(32);comment:计提后已折旧快照"`
	// 创建时间
	CreatedAt xtime.DateTime `json:"created_at" gorm:"autoCreateTime"`
}

func (PsiAssetDepreciationLog) TableName() string { return "psi_asset_depreciation_log" }
