package mcp

import (
	"context"
	"fmt"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"

	psisvc "qzt-go-server/internal/module/psi/service"
)

// tools_psi.go PSI 进销存只读 tools(供应商/仓库/采购/销售/库存/出入库)。

func registerPsiTools(s *server.MCPServer) {
	// ── 供应商 ──
	s.AddTool(
		mcp.NewTool("psi_supplier_list",
			mcp.WithDescription("查询供应商列表"),
			mcp.WithString("keyword", mcp.Description("供应商名称关键词")),
			mcp.WithNumber("status", mcp.Description("状态:1启用 2停用(不传查全部)")),
			mcp.WithNumber("page", mcp.Description("页码(默认1)")),
			mcp.WithNumber("page_size", mcp.Description("每页条数(默认20)")),
		),
		handlePsiSupplierList,
	)

	s.AddTool(
		mcp.NewTool("psi_supplier_get",
			mcp.WithDescription("查询供应商详情"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("供应商ID")),
		),
		handlePsiSupplierGet,
	)

	// ── 仓库 ──
	s.AddTool(
		mcp.NewTool("psi_warehouse_list",
			mcp.WithDescription("查询仓库列表"),
			mcp.WithString("keyword", mcp.Description("仓库名称关键词")),
			mcp.WithNumber("status", mcp.Description("状态:1启用 2停用(不传查全部)")),
			mcp.WithNumber("page", mcp.Description("页码(默认1)")),
			mcp.WithNumber("page_size", mcp.Description("每页条数(默认20)")),
		),
		handlePsiWarehouseList,
	)

	s.AddTool(
		mcp.NewTool("psi_warehouse_get",
			mcp.WithDescription("查询仓库详情"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("仓库ID")),
		),
		handlePsiWarehouseGet,
	)

	// ── 采购单 ──
	s.AddTool(
		mcp.NewTool("psi_purchase_order_list",
			mcp.WithDescription("查询采购订单列表"),
			mcp.WithString("keyword", mcp.Description("单号关键词")),
			mcp.WithNumber("supplier_id", mcp.Description("供应商ID")),
			mcp.WithNumber("status", mcp.Description("状态:1待入库 2已入库 3已关闭(不传查全部)")),
			mcp.WithString("approval_status", mcp.Description("审批状态:NONE/PROCESSING/APPROVED/REJECTED")),
			mcp.WithNumber("page", mcp.Description("页码(默认1)")),
			mcp.WithNumber("page_size", mcp.Description("每页条数(默认20)")),
		),
		handlePsiPurchaseList,
	)

	s.AddTool(
		mcp.NewTool("psi_purchase_order_get",
			mcp.WithDescription("查询采购订单详情(含商品明细)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("采购订单ID")),
		),
		handlePsiPurchaseGet,
	)

	// ── 销售单 ──
	s.AddTool(
		mcp.NewTool("psi_sales_order_list",
			mcp.WithDescription("查询销售订单列表"),
			mcp.WithString("keyword", mcp.Description("单号关键词")),
			mcp.WithNumber("customer_id", mcp.Description("客户ID")),
			mcp.WithNumber("status", mcp.Description("状态:1待出库 2已出库 3已关闭(不传查全部)")),
			mcp.WithString("approval_status", mcp.Description("审批状态:NONE/PROCESSING/APPROVED/REJECTED")),
			mcp.WithNumber("page", mcp.Description("页码(默认1)")),
			mcp.WithNumber("page_size", mcp.Description("每页条数(默认20)")),
		),
		handlePsiSalesList,
	)

	s.AddTool(
		mcp.NewTool("psi_sales_order_get",
			mcp.WithDescription("查询销售订单详情(含商品明细)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("销售订单ID")),
		),
		handlePsiSalesGet,
	)

	// ── 库存 ──
	s.AddTool(
		mcp.NewTool("psi_stock_list",
			mcp.WithDescription("查询库存列表(各仓库产品库存量)"),
			mcp.WithNumber("warehouse_id", mcp.Description("仓库ID(不传查全部仓库)")),
			mcp.WithString("keyword", mcp.Description("产品名称/编码关键词")),
			mcp.WithBoolean("low_stock", mcp.Description("仅看低库存(默认false)")),
			mcp.WithNumber("page", mcp.Description("页码(默认1)")),
			mcp.WithNumber("page_size", mcp.Description("每页条数(默认20)")),
		),
		handlePsiStockList,
	)

	s.AddTool(
		mcp.NewTool("psi_stock_movements",
			mcp.WithDescription("查询库存流水(出入库明细)"),
			mcp.WithNumber("warehouse_id", mcp.Description("仓库ID")),
			mcp.WithNumber("product_id", mcp.Description("产品ID")),
			mcp.WithString("biz_type", mcp.Description("业务类型过滤")),
			mcp.WithNumber("page", mcp.Description("页码(默认1)")),
			mcp.WithNumber("page_size", mcp.Description("每页条数(默认20)")),
		),
		handlePsiStockMovements,
	)

	// ── 出入库单 ──
	s.AddTool(
		mcp.NewTool("psi_stock_in_list",
			mcp.WithDescription("查询入库单列表"),
			mcp.WithNumber("warehouse_id", mcp.Description("仓库ID")),
			mcp.WithString("biz_type", mcp.Description("业务类型过滤")),
			mcp.WithNumber("page", mcp.Description("页码(默认1)")),
			mcp.WithNumber("page_size", mcp.Description("每页条数(默认20)")),
		),
		handlePsiStockInList,
	)

	s.AddTool(
		mcp.NewTool("psi_stock_out_list",
			mcp.WithDescription("查询出库单列表"),
			mcp.WithNumber("warehouse_id", mcp.Description("仓库ID")),
			mcp.WithString("biz_type", mcp.Description("业务类型过滤")),
			mcp.WithNumber("page", mcp.Description("页码(默认1)")),
			mcp.WithNumber("page_size", mcp.Description("每页条数(默认20)")),
		),
		handlePsiStockOutList,
	)
}

// ── handlers ──

func handlePsiSupplierList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := psisvc.NewSupplierService()
	page, pageSize := mcpPage(req)
	list, total, err := svc.List(ctx, page, pageSize, req.GetString("keyword", ""), int8(req.GetFloat("status", 0)))
	if err != nil {
		return resultError(fmt.Sprintf("查询供应商列表失败: %v", err))
	}
	return resultText(map[string]any{"list": list, "total": total, "page": page, "size": pageSize})
}

func handlePsiSupplierGet(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := psisvc.NewSupplierService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("供应商ID(id)必填")
	}
	sup, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("查询供应商失败: %v", err))
	}
	return resultText(sup)
}

func handlePsiWarehouseList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := psisvc.NewWarehouseService()
	page, pageSize := mcpPage(req)
	list, total, err := svc.List(ctx, page, pageSize, req.GetString("keyword", ""), int8(req.GetFloat("status", 0)))
	if err != nil {
		return resultError(fmt.Sprintf("查询仓库列表失败: %v", err))
	}
	return resultText(map[string]any{"list": list, "total": total, "page": page, "size": pageSize})
}

func handlePsiWarehouseGet(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := psisvc.NewWarehouseService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("仓库ID(id)必填")
	}
	wh, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("查询仓库失败: %v", err))
	}
	return resultText(wh)
}

func handlePsiPurchaseList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := psisvc.NewPurchaseService()
	page, pageSize := mcpPage(req)
	list, total, err := svc.List(ctx, page, pageSize,
		req.GetString("keyword", ""),
		uint(req.GetFloat("supplier_id", 0)),
		int8(req.GetFloat("status", 0)),
		req.GetString("approval_status", ""),
	)
	if err != nil {
		return resultError(fmt.Sprintf("查询采购订单失败: %v", err))
	}
	return resultText(map[string]any{"list": list, "total": total, "page": page, "size": pageSize})
}

func handlePsiPurchaseGet(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := psisvc.NewPurchaseService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("采购订单ID(id)必填")
	}
	detail, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("查询采购订单失败: %v", err))
	}
	return resultText(detail)
}

func handlePsiSalesList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := psisvc.NewSalesService()
	page, pageSize := mcpPage(req)
	list, total, err := svc.List(ctx, page, pageSize,
		req.GetString("keyword", ""),
		uint(req.GetFloat("customer_id", 0)),
		int8(req.GetFloat("status", 0)),
		req.GetString("approval_status", ""),
	)
	if err != nil {
		return resultError(fmt.Sprintf("查询销售订单失败: %v", err))
	}
	return resultText(map[string]any{"list": list, "total": total, "page": page, "size": pageSize})
}

func handlePsiSalesGet(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := psisvc.NewSalesService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("销售订单ID(id)必填")
	}
	detail, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("查询销售订单失败: %v", err))
	}
	return resultText(detail)
}

func handlePsiStockList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := psisvc.NewStockService()
	page, pageSize := mcpPage(req)
	list, total, err := svc.StockList(ctx, page, pageSize,
		uint(req.GetFloat("warehouse_id", 0)),
		req.GetString("keyword", ""),
		req.GetBool("low_stock", false),
	)
	if err != nil {
		return resultError(fmt.Sprintf("查询库存失败: %v", err))
	}
	return resultText(map[string]any{"list": list, "total": total, "page": page, "size": pageSize})
}

func handlePsiStockMovements(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := psisvc.NewStockService()
	page, pageSize := mcpPage(req)
	list, total, err := svc.MovementDetail(ctx, page, pageSize,
		uint(req.GetFloat("warehouse_id", 0)),
		uint(req.GetFloat("product_id", 0)),
		req.GetString("biz_type", ""),
	)
	if err != nil {
		return resultError(fmt.Sprintf("查询库存流水失败: %v", err))
	}
	return resultText(map[string]any{"list": list, "total": total, "page": page, "size": pageSize})
}

func handlePsiStockInList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := psisvc.NewStockIOService()
	page, pageSize := mcpPage(req)
	list, total, err := svc.ListIn(ctx, page, pageSize,
		uint(req.GetFloat("warehouse_id", 0)),
		req.GetString("biz_type", ""),
	)
	if err != nil {
		return resultError(fmt.Sprintf("查询入库单失败: %v", err))
	}
	return resultText(map[string]any{"list": list, "total": total, "page": page, "size": pageSize})
}

func handlePsiStockOutList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := psisvc.NewStockIOService()
	page, pageSize := mcpPage(req)
	list, total, err := svc.ListOut(ctx, page, pageSize,
		uint(req.GetFloat("warehouse_id", 0)),
		req.GetString("biz_type", ""),
	)
	if err != nil {
		return resultError(fmt.Sprintf("查询出库单失败: %v", err))
	}
	return resultText(map[string]any{"list": list, "total": total, "page": page, "size": pageSize})
}
