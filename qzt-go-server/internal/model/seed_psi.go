package model

import (
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// seed_psi.go PSI 进销存模块的 API/菜单权限种子。
// 独立幂等:每次启动按 (path,method) 检查 sys_api,缺失才补建;菜单同理。
// 对已部署库友好(super_admin 角色已存在时 defaultMenus 不会重跑,故 PSI 走此路径)。

// psiAPIs PSI 受保护接口全集(path 以 /psi 为前缀,与 Casbin obj 一致)。
func psiAPIs() []SysAPI {
	return []SysAPI{
		// 仓库管理
		{Path: "/psi/warehouses", Method: "GET", Group: "仓库管理", Description: "仓库列表"},
		{Path: "/psi/warehouses", Method: "POST", Group: "仓库管理", Description: "创建仓库"},
		{Path: "/psi/warehouses/enabled", Method: "GET", Group: "仓库管理", Description: "启用仓库下拉"},
		{Path: "/psi/warehouses/:id", Method: "GET", Group: "仓库管理", Description: "仓库详情"},
		{Path: "/psi/warehouses/:id", Method: "PUT", Group: "仓库管理", Description: "更新仓库"},
		{Path: "/psi/warehouses/:id", Method: "DELETE", Group: "仓库管理", Description: "删除仓库"},
		// 供应商管理
		{Path: "/psi/suppliers", Method: "GET", Group: "供应商管理", Description: "供应商列表"},
		{Path: "/psi/suppliers", Method: "POST", Group: "供应商管理", Description: "创建供应商"},
		{Path: "/psi/suppliers/enabled", Method: "GET", Group: "供应商管理", Description: "启用供应商下拉"},
		{Path: "/psi/suppliers/:id", Method: "GET", Group: "供应商管理", Description: "供应商详情"},
		{Path: "/psi/suppliers/:id", Method: "PUT", Group: "供应商管理", Description: "更新供应商"},
		{Path: "/psi/suppliers/:id", Method: "DELETE", Group: "供应商管理", Description: "删除供应商"},
		// 采购管理
		{Path: "/psi/purchase-orders", Method: "GET", Group: "采购管理", Description: "采购单列表"},
		{Path: "/psi/purchase-orders", Method: "POST", Group: "采购管理", Description: "创建采购单"},
		{Path: "/psi/purchase-orders/:id", Method: "GET", Group: "采购管理", Description: "采购单详情"},
		{Path: "/psi/purchase-orders/:id", Method: "PUT", Group: "采购管理", Description: "更新采购单"},
		{Path: "/psi/purchase-orders/:id", Method: "DELETE", Group: "采购管理", Description: "删除采购单"},
		{Path: "/psi/purchase-orders/:id/stock-in", Method: "POST", Group: "采购管理", Description: "执行采购入库"},
		{Path: "/psi/purchase-returns", Method: "GET", Group: "采购管理", Description: "采购退货列表"},
		{Path: "/psi/purchase-returns", Method: "POST", Group: "采购管理", Description: "创建采购退货"},
		{Path: "/psi/purchase-returns/:id", Method: "GET", Group: "采购管理", Description: "采购退货详情"},
		{Path: "/psi/purchase-returns/:id/stock-out", Method: "POST", Group: "采购管理", Description: "执行采购退货出库"},
		// 销售管理
		{Path: "/psi/sales-orders", Method: "GET", Group: "销售管理", Description: "销售单列表"},
		{Path: "/psi/sales-orders", Method: "POST", Group: "销售管理", Description: "创建销售单"},
		{Path: "/psi/sales-orders/:id", Method: "GET", Group: "销售管理", Description: "销售单详情"},
		{Path: "/psi/sales-orders/:id", Method: "PUT", Group: "销售管理", Description: "更新销售单"},
		{Path: "/psi/sales-orders/:id", Method: "DELETE", Group: "销售管理", Description: "删除销售单"},
		{Path: "/psi/sales-orders/:id/stock-out", Method: "POST", Group: "销售管理", Description: "执行销售出库"},
		{Path: "/psi/sales-returns", Method: "GET", Group: "销售管理", Description: "销售退货列表"},
		{Path: "/psi/sales-returns", Method: "POST", Group: "销售管理", Description: "创建销售退货"},
		{Path: "/psi/sales-returns/:id", Method: "GET", Group: "销售管理", Description: "销售退货详情"},
		{Path: "/psi/sales-returns/:id/stock-in", Method: "POST", Group: "销售管理", Description: "执行销售退货入库"},
		// 其他出入库
		{Path: "/psi/stock-in-orders", Method: "GET", Group: "库存管理", Description: "其他入库单列表"},
		{Path: "/psi/stock-in-orders", Method: "POST", Group: "库存管理", Description: "创建其他入库单"},
		{Path: "/psi/stock-in-orders/:id", Method: "GET", Group: "库存管理", Description: "其他入库单详情"},
		{Path: "/psi/stock-out-orders", Method: "GET", Group: "库存管理", Description: "其他出库单列表"},
		{Path: "/psi/stock-out-orders", Method: "POST", Group: "库存管理", Description: "创建其他出库单"},
		{Path: "/psi/stock-out-orders/:id", Method: "GET", Group: "库存管理", Description: "其他出库单详情"},
	}
}

// seedPSIPermissions 幂等写入 PSI 的 sys_api(操作日志元数据 + Casbin obj 来源)。
// 菜单树由前端维护或后续按需扩展;此处仅保证 API 记录齐全。
func seedPSIPermissions(db *gorm.DB) error {
	apis := psiAPIs()
	for i := range apis {
		a := &apis[i]
		var cnt int64
		db.Model(&SysAPI{}).Where("path = ? AND method = ?", a.Path, a.Method).Count(&cnt)
		if cnt > 0 {
			continue
		}
		if err := db.Create(a).Error; err != nil {
			zap.S().Warnf("seed psi api %s %s: %v", a.Method, a.Path, err)
		}
	}
	return nil
}
