package mcp

import (
	"context"
	"fmt"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"

	psisvc "qzt-go-server/internal/module/psi/service"
)

// tools_psi_stockio.go PSI 其他出入库 tools(创建即生效,最高危)。

func registerPsiStockIOTools(s *server.MCPServer) {
	// ── 其他出入库(创建即生效,最高危) ──
	s.AddTool(
		mcp.NewTool("psi_stock_in_order_create",
			mcp.WithDescription("创建其他入库单(创建即立即增加库存,无审批,用于期初/盘盈/赠品)。高危:创建即生效"),
			mcp.WithNumber("warehouse_id", mcp.Required(), mcp.Description("入库仓库ID")),
			mcp.WithString("biz_type", mcp.Required(), mcp.Description("业务类型:INIT(期初)/PROFIT(盘盈)/GIFT(赠品)/OTHER(其他)")),
			mcp.WithString("order_date", mcp.Description("单据日期(YYYY-MM-DD)")),
			mcp.WithString("remark", mcp.Description("备注")),
			mcp.WithString("items", mcp.Required(), mcp.Description("明细JSON数组:[{\"product_id\":1,\"quantity\":10,\"unit_cost\":100,\"remark\":\"\"}]")),
		),
		handlePsiStockInOrderCreate,
	)
	s.AddTool(
		mcp.NewTool("psi_stock_out_order_create",
			mcp.WithDescription("创建其他出库单(创建即立即扣减库存,无审批,用于盘亏/报废/领用)。高危:创建即生效"),
			mcp.WithNumber("warehouse_id", mcp.Required(), mcp.Description("出库仓库ID")),
			mcp.WithString("biz_type", mcp.Required(), mcp.Description("业务类型:LOSS(盘亏)/SCRAP(报废)/USE(领用)/OTHER(其他)")),
			mcp.WithString("order_date", mcp.Description("单据日期(YYYY-MM-DD)")),
			mcp.WithString("remark", mcp.Description("备注")),
			mcp.WithString("items", mcp.Required(), mcp.Description("明细JSON数组:[{\"product_id\":1,\"quantity\":10,\"remark\":\"\"}]")),
		),
		handlePsiStockOutOrderCreate,
	)
}

// ── 其他出入库 handlers(创建即生效) ──

func handlePsiStockInOrderCreate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := psisvc.NewStockIOService()
	warehouseID := uint(req.GetFloat("warehouse_id", 0))
	bizType := req.GetString("biz_type", "")
	if warehouseID == 0 || bizType == "" {
		return resultError("仓库ID(warehouse_id)和业务类型(biz_type:INIT/PROFIT/GIFT/OTHER)必填")
	}
	items, err := parseStockInItems(req.GetString("items", ""))
	if err != nil {
		return resultError(err.Error())
	}
	if len(items) == 0 {
		return resultError("明细(items)必填且不能为空")
	}
	createReq := &psisvc.CreateStockInRequest{
		WarehouseID: warehouseID,
		BizType:     bizType,
		OrderDate:   req.GetString("order_date", ""),
		Remark:      req.GetString("remark", ""),
		Items:       items,
	}
	order, err := svc.Create(ctx, createReq, ptrUint(userIDFromContext(ctx)))
	if err != nil {
		return resultError(fmt.Sprintf("创建其他入库单失败: %v", err))
	}
	return resultText(order)
}

func handlePsiStockOutOrderCreate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := psisvc.NewStockIOService()
	warehouseID := uint(req.GetFloat("warehouse_id", 0))
	bizType := req.GetString("biz_type", "")
	if warehouseID == 0 || bizType == "" {
		return resultError("仓库ID(warehouse_id)和业务类型(biz_type:LOSS/SCRAP/USE/OTHER)必填")
	}
	items, err := parseStockOutItems(req.GetString("items", ""))
	if err != nil {
		return resultError(err.Error())
	}
	if len(items) == 0 {
		return resultError("明细(items)必填且不能为空")
	}
	createReq := &psisvc.CreateStockOutRequest{
		WarehouseID: warehouseID,
		BizType:     bizType,
		OrderDate:   req.GetString("order_date", ""),
		Remark:      req.GetString("remark", ""),
		Items:       items,
	}
	order, err := svc.CreateOut(ctx, createReq, ptrUint(userIDFromContext(ctx)))
	if err != nil {
		return resultError(fmt.Sprintf("创建其他出库单失败: %v", err))
	}
	return resultText(order)
}
