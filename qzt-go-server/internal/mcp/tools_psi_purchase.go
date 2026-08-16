package mcp

import (
	"context"
	"fmt"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
	"github.com/shopspring/decimal"

	psisvc "qzt-go-server/internal/module/psi/service"
)

// tools_psi_purchase.go PSI 采购 tools(采购订单 + 采购退货)。

func registerPsiPurchaseOrderTools(s *server.MCPServer) {
	// ── 采购单 ──
	s.AddTool(
		mcp.NewTool("psi_purchase_order_create",
			mcp.WithDescription("创建采购订单(默认待入库,系统生成单号,自动汇总金额)"),
			mcp.WithNumber("supplier_id", mcp.Required(), mcp.Description("供应商ID")),
			mcp.WithNumber("warehouse_id", mcp.Required(), mcp.Description("入库仓库ID")),
			mcp.WithString("order_date", mcp.Description("采购日期(YYYY-MM-DD)")),
			mcp.WithString("expected_date", mcp.Description("预计到货日期(YYYY-MM-DD)")),
			mcp.WithNumber("discount_amount", mcp.Description("优惠金额")),
			mcp.WithString("remark", mcp.Description("备注")),
			mcp.WithString("items", mcp.Required(), mcp.Description("明细JSON数组:[{\"product_id\":1,\"quantity\":10,\"unit_price\":100,\"remark\":\"\"}]")),
		),
		handlePsiPurchaseOrderCreate,
	)
	s.AddTool(
		mcp.NewTool("psi_purchase_order_update",
			mcp.WithDescription("更新采购订单(仅待入库且未审批时允许;半增量:留空字段保留原值,items留空保留原明细)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("采购订单ID")),
			mcp.WithNumber("supplier_id", mcp.Description("供应商ID")),
			mcp.WithNumber("warehouse_id", mcp.Description("入库仓库ID")),
			mcp.WithString("order_date", mcp.Description("采购日期(YYYY-MM-DD)")),
			mcp.WithString("expected_date", mcp.Description("预计到货日期(YYYY-MM-DD)")),
			mcp.WithNumber("discount_amount", mcp.Description("优惠金额")),
			mcp.WithString("remark", mcp.Description("备注")),
			mcp.WithString("items", mcp.Description("明细JSON数组(留空保留原明细)")),
		),
		handlePsiPurchaseOrderUpdate,
	)
	s.AddTool(
		mcp.NewTool("psi_purchase_order_delete",
			mcp.WithDescription("删除采购订单(仅待入库且未进入审批)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("采购订单ID")),
		),
		handlePsiPurchaseOrderDelete,
	)
	s.AddTool(
		mcp.NewTool("psi_purchase_order_stock_in",
			mcp.WithDescription("执行采购入库。高危:会增加库存,需单据已审批通过(或未启用审批)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("采购订单ID")),
		),
		handlePsiPurchaseOrderStockIn,
	)
}

func registerPsiPurchaseReturnTools(s *server.MCPServer) {
	// ── 采购退货 ──
	s.AddTool(
		mcp.NewTool("psi_purchase_return_list",
			mcp.WithDescription("查询采购退货列表"),
			mcp.WithString("keyword", mcp.Description("退货单号关键词")),
			mcp.WithNumber("supplier_id", mcp.Description("供应商ID")),
			mcp.WithNumber("status", mcp.Description("状态(不传查全部)")),
			mcp.WithNumber("page", mcp.Description("页码(默认1)")),
			mcp.WithNumber("page_size", mcp.Description("每页条数(默认20)")),
		),
		handlePsiPurchaseReturnList,
	)
	s.AddTool(
		mcp.NewTool("psi_purchase_return_get",
			mcp.WithDescription("查询采购退货详情(含明细)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("采购退货单ID")),
		),
		handlePsiPurchaseReturnGet,
	)
	s.AddTool(
		mcp.NewTool("psi_purchase_return_create",
			mcp.WithDescription("创建采购退货单(退货给供应商,默认待出库)"),
			mcp.WithNumber("supplier_id", mcp.Required(), mcp.Description("供应商ID")),
			mcp.WithNumber("warehouse_id", mcp.Required(), mcp.Description("出库仓库ID")),
			mcp.WithNumber("order_id", mcp.Description("关联采购订单ID(可选)")),
			mcp.WithString("return_date", mcp.Description("退货日期(YYYY-MM-DD)")),
			mcp.WithString("remark", mcp.Description("备注")),
			mcp.WithString("items", mcp.Required(), mcp.Description("明细JSON数组:[{\"product_id\":1,\"quantity\":10,\"unit_price\":100,\"remark\":\"\"}]")),
		),
		handlePsiPurchaseReturnCreate,
	)
	s.AddTool(
		mcp.NewTool("psi_purchase_return_stock_out",
			mcp.WithDescription("执行采购退货出库。高危:会减少库存,需单据已审批通过"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("采购退货单ID")),
		),
		handlePsiPurchaseReturnStockOut,
	)
}

// ── 采购单 handlers ──

func handlePsiPurchaseOrderCreate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := psisvc.NewPurchaseService()
	supplierID := uint(req.GetFloat("supplier_id", 0))
	warehouseID := uint(req.GetFloat("warehouse_id", 0))
	if supplierID == 0 || warehouseID == 0 {
		return resultError("供应商ID(supplier_id)和仓库ID(warehouse_id)必填")
	}
	items, err := parsePurchaseItems(req.GetString("items", ""))
	if err != nil {
		return resultError(err.Error())
	}
	if len(items) == 0 {
		return resultError("明细(items)必填且不能为空")
	}
	createReq := &psisvc.CreatePurchaseOrderRequest{
		SupplierID:     supplierID,
		WarehouseID:    warehouseID,
		OrderDate:      req.GetString("order_date", ""),
		ExpectedDate:   req.GetString("expected_date", ""),
		DiscountAmount: decimal.NewFromFloat(req.GetFloat("discount_amount", 0)),
		Remark:         req.GetString("remark", ""),
		Items:          items,
	}
	order, err := svc.Create(ctx, createReq, ptrUint(userIDFromContext(ctx)))
	if err != nil {
		return resultError(fmt.Sprintf("创建采购订单失败: %v", err))
	}
	return resultText(order)
}

func handlePsiPurchaseOrderUpdate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := psisvc.NewPurchaseService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("采购订单ID(id)必填")
	}
	existing, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("采购订单不存在: %v", err))
	}
	// items:传入则整体替换,否则保留原明细(转换为输入)
	var items []psisvc.PurchaseOrderItemRequest
	if itemsStr := req.GetString("items", ""); itemsStr != "" {
		items, err = parsePurchaseItems(itemsStr)
		if err != nil {
			return resultError(err.Error())
		}
	} else {
		items = make([]psisvc.PurchaseOrderItemRequest, 0, len(existing.Items))
		for _, it := range existing.Items {
			items = append(items, psisvc.PurchaseOrderItemRequest{
				ProductID: it.ProductID, Quantity: it.Quantity, UnitPrice: it.UnitPrice, Remark: it.Remark,
			})
		}
	}
	if len(items) == 0 {
		return resultError("明细(items)不能为空")
	}
	upd := &psisvc.CreatePurchaseOrderRequest{
		SupplierID:     uint(req.GetFloat("supplier_id", float64(existing.SupplierID))),
		WarehouseID:    uint(req.GetFloat("warehouse_id", float64(existing.WarehouseID))),
		OrderDate:      req.GetString("order_date", nullDateToStr(existing.OrderDate)),
		ExpectedDate:   req.GetString("expected_date", nullDateToStr(existing.ExpectedDate)),
		DiscountAmount: decimal.NewFromFloat(req.GetFloat("discount_amount", existing.DiscountAmount.InexactFloat64())),
		Remark:         req.GetString("remark", existing.Remark),
		Items:          items,
	}
	if err := svc.Update(ctx, id, upd); err != nil {
		return resultError(fmt.Sprintf("更新采购订单失败: %v", err))
	}
	return resultText(map[string]any{"id": id, "success": true})
}

func handlePsiPurchaseOrderDelete(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := psisvc.NewPurchaseService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("采购订单ID(id)必填")
	}
	if err := svc.Delete(ctx, id); err != nil {
		return resultError(fmt.Sprintf("删除采购订单失败: %v", err))
	}
	return resultText(map[string]any{"id": id, "success": true})
}

func handlePsiPurchaseOrderStockIn(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := psisvc.NewPurchaseService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("采购订单ID(id)必填")
	}
	if err := svc.StockIn(ctx, id, ptrUint(userIDFromContext(ctx))); err != nil {
		return resultError(fmt.Sprintf("采购入库失败: %v", err))
	}
	return resultText(map[string]any{"id": id, "success": true})
}

// ── 采购退货 handlers ──

func handlePsiPurchaseReturnList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := psisvc.NewPurchaseService()
	page, pageSize := mcpPage(req)
	list, total, err := svc.ListReturns(ctx, page, pageSize,
		req.GetString("keyword", ""),
		uint(req.GetFloat("supplier_id", 0)),
		int8(req.GetFloat("status", 0)),
	)
	if err != nil {
		return resultError(fmt.Sprintf("查询采购退货列表失败: %v", err))
	}
	return resultText(map[string]any{"list": list, "total": total, "page": page, "size": pageSize})
}

func handlePsiPurchaseReturnGet(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := psisvc.NewPurchaseService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("采购退货单ID(id)必填")
	}
	detail, err := svc.GetReturnByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("查询采购退货详情失败: %v", err))
	}
	return resultText(detail)
}

func handlePsiPurchaseReturnCreate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := psisvc.NewPurchaseService()
	supplierID := uint(req.GetFloat("supplier_id", 0))
	warehouseID := uint(req.GetFloat("warehouse_id", 0))
	if supplierID == 0 || warehouseID == 0 {
		return resultError("供应商ID(supplier_id)和仓库ID(warehouse_id)必填")
	}
	items, err := parsePurchaseItems(req.GetString("items", ""))
	if err != nil {
		return resultError(err.Error())
	}
	if len(items) == 0 {
		return resultError("明细(items)必填且不能为空")
	}
	createReq := &psisvc.CreatePurchaseReturnRequest{
		SupplierID:  supplierID,
		WarehouseID: warehouseID,
		ReturnDate:  req.GetString("return_date", ""),
		Remark:      req.GetString("remark", ""),
		Items:       items,
	}
	if oid := uint(req.GetFloat("order_id", 0)); oid > 0 {
		createReq.OrderID = ptrUint(oid)
	}
	ret, err := svc.CreateReturn(ctx, createReq, ptrUint(userIDFromContext(ctx)))
	if err != nil {
		return resultError(fmt.Sprintf("创建采购退货单失败: %v", err))
	}
	return resultText(ret)
}

func handlePsiPurchaseReturnStockOut(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := psisvc.NewPurchaseService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("采购退货单ID(id)必填")
	}
	if err := svc.StockOutReturn(ctx, id, ptrUint(userIDFromContext(ctx))); err != nil {
		return resultError(fmt.Sprintf("采购退货出库失败: %v", err))
	}
	return resultText(map[string]any{"id": id, "success": true})
}
