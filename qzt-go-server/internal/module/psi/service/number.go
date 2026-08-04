package service

import (
	"fmt"
	"time"
)

// number.go 单据编号生成器。
// 格式: 前缀 + yyyyMMdd + 6位纳秒尾部,如 PO20260804123456。
// 冲突概率极低,且有 DB 唯一索引兜底;生产可改为基于当日序号的方案。

// 采购单/销售单/退货单/出入库单 的单据类型前缀。
const (
	prefixPurchaseOrder  = "PO"  // 采购订单
	prefixPurchaseReturn = "PRO" // 采购退货 Purchase Return Out
	prefixSalesOrder     = "SO"  // 销售订单
	prefixSalesReturn    = "SRI" // 销售退货 Sales Return In
	prefixStockIn        = "SIN" // 其他入库 Stock IN
	prefixStockOut       = "SOT" // 其他出库 Stock OuT
)

// genOrderNo 生成单据编号。
func genOrderNo(prefix string) string {
	now := time.Now()
	ns := now.UnixNano()
	return fmt.Sprintf("%s%s%06d", prefix, now.Format("20060102"), ns%1000000)
}
