package mcp

import (
	"context"
	"fmt"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
	"github.com/shopspring/decimal"

	psisvc "qzt-go-server/internal/module/psi/service"
)

// tools_psi_sales.go PSI 销售 tools(销售订单 + 销售退货)。

func registerPsiSalesOrderTools(s *server.MCPServer) {
	// ── 销售单 ──
	s.AddTool(
		mcp.NewTool("psi_sales_order_create",
			mcp.WithDescription("创建销售订单(默认待出库,系统生成单号,自动汇总金额)"),
			mcp.WithNumber("customer_id", mcp.Required(), mcp.Description("客户ID")),
			mcp.WithNumber("warehouse_id", mcp.Required(), mcp.Description("出库仓库ID")),
			mcp.WithNumber("contract_id", mcp.Description("关联合同ID(可选)")),
			mcp.WithString("order_date", mcp.Description("销售日期(YYYY-MM-DD)")),
			mcp.WithNumber("discount_amount", mcp.Description("优惠金额")),
			mcp.WithString("remark", mcp.Description("备注")),
			mcp.WithString("items", mcp.Required(), mcp.Description("明细JSON数组:[{\"product_id\":1,\"quantity\":10,\"unit_price\":100,\"remark\":\"\"}]")),
		),
		handlePsiSalesOrderCreate,
	)
	s.AddTool(
		mcp.NewTool("psi_sales_order_update",
			mcp.WithDescription("更新销售订单(仅待出库且未审批时允许;半增量:留空字段保留原值,items留空保留原明细)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("销售订单ID")),
			mcp.WithNumber("customer_id", mcp.Description("客户ID")),
			mcp.WithNumber("warehouse_id", mcp.Description("出库仓库ID")),
			mcp.WithNumber("contract_id", mcp.Description("关联合同ID")),
			mcp.WithString("order_date", mcp.Description("销售日期(YYYY-MM-DD)")),
			mcp.WithNumber("discount_amount", mcp.Description("优惠金额")),
			mcp.WithString("remark", mcp.Description("备注")),
			mcp.WithString("items", mcp.Description("明细JSON数组(留空保留原明细)")),
		),
		handlePsiSalesOrderUpdate,
	)
	s.AddTool(
		mcp.NewTool("psi_sales_order_delete",
			mcp.WithDescription("删除销售订单(仅待出库且未进入审批)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("销售订单ID")),
		),
		handlePsiSalesOrderDelete,
	)
	s.AddTool(
		mcp.NewTool("psi_sales_order_stock_out",
			mcp.WithDescription("执行销售出库。高危:会扣减库存,库存不足会被拒绝,需单据已审批通过"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("销售订单ID")),
		),
		handlePsiSalesOrderStockOut,
	)
}

func registerPsiSalesReturnTools(s *server.MCPServer) {
	// ── 销售退货 ──
	s.AddTool(
		mcp.NewTool("psi_sales_return_list",
			mcp.WithDescription("查询销售退货列表"),
			mcp.WithString("keyword", mcp.Description("退货单号关键词")),
			mcp.WithNumber("customer_id", mcp.Description("客户ID")),
			mcp.WithNumber("status", mcp.Description("状态(不传查全部)")),
			mcp.WithNumber("page", mcp.Description("页码(默认1)")),
			mcp.WithNumber("page_size", mcp.Description("每页条数(默认20)")),
		),
		handlePsiSalesReturnList,
	)
	s.AddTool(
		mcp.NewTool("psi_sales_return_get",
			mcp.WithDescription("查询销售退货详情(含明细)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("销售退货单ID")),
		),
		handlePsiSalesReturnGet,
	)
	s.AddTool(
		mcp.NewTool("psi_sales_return_create",
			mcp.WithDescription("创建销售退货单(客户退回,默认待入库)"),
			mcp.WithNumber("customer_id", mcp.Required(), mcp.Description("客户ID")),
			mcp.WithNumber("warehouse_id", mcp.Required(), mcp.Description("入库仓库ID")),
			mcp.WithNumber("order_id", mcp.Description("关联销售订单ID(可选)")),
			mcp.WithString("return_date", mcp.Description("退货日期(YYYY-MM-DD)")),
			mcp.WithString("remark", mcp.Description("备注")),
			mcp.WithString("items", mcp.Required(), mcp.Description("明细JSON数组:[{\"product_id\":1,\"quantity\":10,\"unit_price\":100,\"remark\":\"\"}]")),
		),
		handlePsiSalesReturnCreate,
	)
	s.AddTool(
		mcp.NewTool("psi_sales_return_stock_in",
			mcp.WithDescription("执行销售退货入库。高危:会增加库存,需单据已审批通过"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("销售退货单ID")),
		),
		handlePsiSalesReturnStockIn,
	)
}

// ── 销售单 handlers ──

func handlePsiSalesOrderCreate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := psisvc.NewSalesService()
	customerID := uint(req.GetFloat("customer_id", 0))
	warehouseID := uint(req.GetFloat("warehouse_id", 0))
	if customerID == 0 || warehouseID == 0 {
		return resultError("客户ID(customer_id)和仓库ID(warehouse_id)必填")
	}
	items, err := parsePurchaseItems(req.GetString("items", ""))
	if err != nil {
		return resultError(err.Error())
	}
	if len(items) == 0 {
		return resultError("明细(items)必填且不能为空")
	}
	createReq := &psisvc.CreateSalesOrderRequest{
		CustomerID:     customerID,
		WarehouseID:    warehouseID,
		OrderDate:      req.GetString("order_date", ""),
		DiscountAmount: decimal.NewFromFloat(req.GetFloat("discount_amount", 0)),
		Remark:         req.GetString("remark", ""),
		Items:          items,
	}
	if cid := uint(req.GetFloat("contract_id", 0)); cid > 0 {
		createReq.ContractID = ptrUint(cid)
	}
	order, err := svc.Create(ctx, createReq, ptrUint(userIDFromContext(ctx)))
	if err != nil {
		return resultError(fmt.Sprintf("创建销售订单失败: %v", err))
	}
	return resultText(order)
}

func handlePsiSalesOrderUpdate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := psisvc.NewSalesService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("销售订单ID(id)必填")
	}
	existing, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("销售订单不存在: %v", err))
	}
	var items []psisvc.SalesOrderItemRequest
	if itemsStr := req.GetString("items", ""); itemsStr != "" {
		parsed, perr := parsePurchaseItems(itemsStr)
		if perr != nil {
			return resultError(perr.Error())
		}
		items = parsed
	} else {
		items = make([]psisvc.SalesOrderItemRequest, 0, len(existing.Items))
		for _, it := range existing.Items {
			items = append(items, psisvc.SalesOrderItemRequest{
				ProductID: it.ProductID, Quantity: it.Quantity, UnitPrice: it.UnitPrice, Remark: it.Remark,
			})
		}
	}
	if len(items) == 0 {
		return resultError("明细(items)不能为空")
	}
	upd := &psisvc.CreateSalesOrderRequest{
		CustomerID:     uint(req.GetFloat("customer_id", float64(existing.CustomerID))),
		WarehouseID:    uint(req.GetFloat("warehouse_id", float64(existing.WarehouseID))),
		OrderDate:      req.GetString("order_date", nullDateToStr(existing.OrderDate)),
		DiscountAmount: decimal.NewFromFloat(req.GetFloat("discount_amount", existing.DiscountAmount.InexactFloat64())),
		Remark:         req.GetString("remark", existing.Remark),
		Items:          items,
	}
	// 合同:显式传 contract_id 才覆盖;否则保留原值
	if cidStr := req.GetArguments()["contract_id"]; cidStr != nil {
		if cid := uint(req.GetFloat("contract_id", 0)); cid > 0 {
			upd.ContractID = ptrUint(cid)
		} else {
			upd.ContractID = existing.ContractID
		}
	} else {
		upd.ContractID = existing.ContractID
	}
	if err := svc.Update(ctx, id, upd); err != nil {
		return resultError(fmt.Sprintf("更新销售订单失败: %v", err))
	}
	return resultText(map[string]any{"id": id, "success": true})
}

func handlePsiSalesOrderDelete(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := psisvc.NewSalesService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("销售订单ID(id)必填")
	}
	if err := svc.Delete(ctx, id); err != nil {
		return resultError(fmt.Sprintf("删除销售订单失败: %v", err))
	}
	return resultText(map[string]any{"id": id, "success": true})
}

func handlePsiSalesOrderStockOut(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := psisvc.NewSalesService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("销售订单ID(id)必填")
	}
	if err := svc.StockOut(ctx, id, ptrUint(userIDFromContext(ctx))); err != nil {
		return resultError(fmt.Sprintf("销售出库失败: %v", err))
	}
	return resultText(map[string]any{"id": id, "success": true})
}

// ── 销售退货 handlers ──

func handlePsiSalesReturnList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := psisvc.NewSalesService()
	page, pageSize := mcpPage(req)
	list, total, err := svc.ListReturns(ctx, page, pageSize,
		req.GetString("keyword", ""),
		uint(req.GetFloat("customer_id", 0)),
		int8(req.GetFloat("status", 0)),
	)
	if err != nil {
		return resultError(fmt.Sprintf("查询销售退货列表失败: %v", err))
	}
	return resultText(map[string]any{"list": list, "total": total, "page": page, "size": pageSize})
}

func handlePsiSalesReturnGet(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := psisvc.NewSalesService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("销售退货单ID(id)必填")
	}
	detail, err := svc.GetReturnByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("查询销售退货详情失败: %v", err))
	}
	return resultText(detail)
}

func handlePsiSalesReturnCreate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := psisvc.NewSalesService()
	customerID := uint(req.GetFloat("customer_id", 0))
	warehouseID := uint(req.GetFloat("warehouse_id", 0))
	if customerID == 0 || warehouseID == 0 {
		return resultError("客户ID(customer_id)和仓库ID(warehouse_id)必填")
	}
	items, err := parsePurchaseItems(req.GetString("items", ""))
	if err != nil {
		return resultError(err.Error())
	}
	if len(items) == 0 {
		return resultError("明细(items)必填且不能为空")
	}
	createReq := &psisvc.CreateSalesReturnRequest{
		CustomerID:  customerID,
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
		return resultError(fmt.Sprintf("创建销售退货单失败: %v", err))
	}
	return resultText(ret)
}

func handlePsiSalesReturnStockIn(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := psisvc.NewSalesService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("销售退货单ID(id)必填")
	}
	if err := svc.StockInReturn(ctx, id, ptrUint(userIDFromContext(ctx))); err != nil {
		return resultError(fmt.Sprintf("销售退货入库失败: %v", err))
	}
	return resultText(map[string]any{"id": id, "success": true})
}
