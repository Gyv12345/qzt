package mcp

import (
	"encoding/json"
	"fmt"
	"time"

	psisvc "qzt-go-server/internal/module/psi/service"
	"qzt-go-server/pkg/xtime"

	"github.com/mark3labs/mcp-go/server"
)

// tools_psi_write.go PSI 写操作 tools 入口 + PSI 专用辅助函数。
// 各资源域的 tool 定义与 handler 按域拆分在 tools_psi_<domain>.go。
// 注意:PSI 需要操作人的方法签名是 operatorID *uint,统一用 ptrUint(userIDFromContext(ctx)) 传入。

// ptrUint 返回 u 的指针(PSI service 的 operatorID 参数为 *uint)。
func ptrUint(u uint) *uint { return &u }

// ptrInt8 返回 i 的指针。
func ptrInt8(i int8) *int8 { return &i }

// nullDateToStr 将 NullDateTime 转回 "2006-01-02" 字符串(零值返回空串),用于半增量更新保留原值。
func nullDateToStr(nd xtime.NullDateTime) string {
	t := time.Time(nd)
	if t.IsZero() {
		return ""
	}
	return t.Format("2006-01-02")
}

// parsePurchaseItems 解析采购/销售明细 JSON(结构一致)。
func parsePurchaseItems(itemsJSON string) ([]psisvc.PurchaseOrderItemRequest, error) {
	if itemsJSON == "" {
		return nil, nil
	}
	var items []psisvc.PurchaseOrderItemRequest
	if err := json.Unmarshal([]byte(itemsJSON), &items); err != nil {
		return nil, fmt.Errorf("明细 items 格式错误: %v", err)
	}
	return items, nil
}

// parseStockInItems 解析其他入库明细 JSON。
func parseStockInItems(itemsJSON string) ([]psisvc.StockInItemRequest, error) {
	if itemsJSON == "" {
		return nil, nil
	}
	var items []psisvc.StockInItemRequest
	if err := json.Unmarshal([]byte(itemsJSON), &items); err != nil {
		return nil, fmt.Errorf("明细 items 格式错误: %v", err)
	}
	return items, nil
}

// parseStockOutItems 解析其他出库明细 JSON。
func parseStockOutItems(itemsJSON string) ([]psisvc.StockOutItemRequest, error) {
	if itemsJSON == "" {
		return nil, nil
	}
	var items []psisvc.StockOutItemRequest
	if err := json.Unmarshal([]byte(itemsJSON), &items); err != nil {
		return nil, fmt.Errorf("明细 items 格式错误: %v", err)
	}
	return items, nil
}

func registerPsiWriteTools(s *server.MCPServer) {
	registerPsiWarehouseTools(s)      // 仓库
	registerPsiSupplierTools(s)       // 供应商
	registerPsiAssetTools(s)          // 资产
	registerPsiPurchaseOrderTools(s)  // 采购单
	registerPsiPurchaseReturnTools(s) // 采购退货
	registerPsiSalesOrderTools(s)     // 销售单
	registerPsiSalesReturnTools(s)    // 销售退货
	registerPsiStockIOTools(s)        // 其他出入库(创建即生效)
}
