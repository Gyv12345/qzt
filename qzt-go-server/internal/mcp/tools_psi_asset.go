package mcp

import (
	"context"
	"fmt"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"

	psisvc "qzt-go-server/internal/module/psi/service"
)

// tools_psi_asset.go PSI 资产 tools。

func registerPsiAssetTools(s *server.MCPServer) {
	// ── 资产 ──
	s.AddTool(
		mcp.NewTool("psi_asset_list",
			mcp.WithDescription("查询资产列表"),
			mcp.WithString("keyword", mcp.Description("资产名称/编号关键词")),
			mcp.WithString("category", mcp.Description("资产分类")),
			mcp.WithNumber("status", mcp.Description("状态(不传查全部)")),
			mcp.WithNumber("owner_id", mcp.Description("归属人ID")),
			mcp.WithNumber("dept_id", mcp.Description("部门ID")),
			mcp.WithNumber("page", mcp.Description("页码(默认1)")),
			mcp.WithNumber("page_size", mcp.Description("每页条数(默认20)")),
		),
		handlePsiAssetList,
	)
	s.AddTool(
		mcp.NewTool("psi_asset_get",
			mcp.WithDescription("查询资产详情"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("资产ID")),
		),
		handlePsiAssetGet,
	)
	s.AddTool(
		mcp.NewTool("psi_asset_create",
			mcp.WithDescription("创建资产(自动生成资产编号)"),
			mcp.WithString("name", mcp.Required(), mcp.Description("资产名称")),
			mcp.WithString("category", mcp.Description("资产分类")),
			mcp.WithString("spec", mcp.Description("规格型号")),
			mcp.WithString("serial_no", mcp.Description("序列号")),
			mcp.WithNumber("warehouse_id", mcp.Description("所在仓库ID")),
			mcp.WithNumber("dept_id", mcp.Description("所属部门ID")),
			mcp.WithNumber("owner_id", mcp.Description("归属人ID")),
			mcp.WithString("purchase_date", mcp.Description("采购日期(YYYY-MM-DD)")),
			mcp.WithString("purchase_price", mcp.Description("采购价格")),
			mcp.WithNumber("useful_life", mcp.Description("使用年限")),
			mcp.WithString("location", mcp.Description("存放位置")),
			mcp.WithString("remark", mcp.Description("备注")),
		),
		handlePsiAssetCreate,
	)
	s.AddTool(
		mcp.NewTool("psi_asset_update",
			mcp.WithDescription("更新资产(半增量:留空字段保留原值)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("资产ID")),
			mcp.WithString("name", mcp.Description("资产名称")),
			mcp.WithString("category", mcp.Description("资产分类")),
			mcp.WithString("spec", mcp.Description("规格型号")),
			mcp.WithString("serial_no", mcp.Description("序列号")),
			mcp.WithNumber("warehouse_id", mcp.Description("所在仓库ID")),
			mcp.WithNumber("dept_id", mcp.Description("所属部门ID")),
			mcp.WithNumber("owner_id", mcp.Description("归属人ID")),
			mcp.WithString("purchase_price", mcp.Description("采购价格")),
			mcp.WithString("depreciation", mcp.Description("累计折旧")),
			mcp.WithString("net_value", mcp.Description("净值")),
			mcp.WithNumber("useful_life", mcp.Description("使用年限")),
			mcp.WithNumber("status", mcp.Description("状态")),
			mcp.WithString("location", mcp.Description("存放位置")),
			mcp.WithString("remark", mcp.Description("备注")),
		),
		handlePsiAssetUpdate,
	)
	s.AddTool(
		mcp.NewTool("psi_asset_delete",
			mcp.WithDescription("删除资产"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("资产ID")),
		),
		handlePsiAssetDelete,
	)
}

// ── 资产 handlers ──

func handlePsiAssetList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := psisvc.NewAssetService()
	page, pageSize := mcpPage(req)
	list, total, err := svc.List(ctx, page, pageSize,
		req.GetString("keyword", ""),
		req.GetString("category", ""),
		int8(req.GetFloat("status", 0)),
		uint(req.GetFloat("owner_id", 0)),
		uint(req.GetFloat("dept_id", 0)),
	)
	if err != nil {
		return resultError(fmt.Sprintf("查询资产列表失败: %v", err))
	}
	return resultText(map[string]any{"list": list, "total": total, "page": page, "size": pageSize})
}

func handlePsiAssetGet(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := psisvc.NewAssetService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("资产ID(id)必填")
	}
	a, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("查询资产失败: %v", err))
	}
	return resultText(a)
}

func handlePsiAssetCreate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := psisvc.NewAssetService()
	name := req.GetString("name", "")
	if name == "" {
		return resultError("资产名称(name)必填")
	}
	aReq := &psisvc.CreateAssetRequest{
		Name:          name,
		Category:      req.GetString("category", ""),
		Spec:          req.GetString("spec", ""),
		SerialNo:      req.GetString("serial_no", ""),
		PurchaseDate:  req.GetString("purchase_date", ""),
		PurchasePrice: req.GetString("purchase_price", ""),
		UsefulLife:    int(req.GetFloat("useful_life", 0)),
		Location:      req.GetString("location", ""),
		Remark:        req.GetString("remark", ""),
	}
	if wid := uint(req.GetFloat("warehouse_id", 0)); wid > 0 {
		aReq.WarehouseID = ptrUint(wid)
	}
	if did := uint(req.GetFloat("dept_id", 0)); did > 0 {
		aReq.DeptID = ptrUint(did)
	}
	if oid := uint(req.GetFloat("owner_id", 0)); oid > 0 {
		aReq.OwnerID = ptrUint(oid)
	}
	a, err := svc.Create(ctx, aReq)
	if err != nil {
		return resultError(fmt.Sprintf("创建资产失败: %v", err))
	}
	return resultText(a)
}

func handlePsiAssetUpdate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := psisvc.NewAssetService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("资产ID(id)必填")
	}
	existing, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("资产不存在: %v", err))
	}
	upd := &psisvc.UpdateAssetRequest{
		Name:          req.GetString("name", existing.Name),
		Category:      req.GetString("category", existing.Category),
		Spec:          req.GetString("spec", existing.Spec),
		SerialNo:      req.GetString("serial_no", existing.SerialNo),
		PurchasePrice: req.GetString("purchase_price", existing.PurchasePrice),
		Depreciation:  req.GetString("depreciation", existing.Depreciation),
		NetValue:      req.GetString("net_value", existing.NetValue),
		UsefulLife:    int(req.GetFloat("useful_life", float64(existing.UsefulLife))),
		Status:        int8(req.GetFloat("status", float64(existing.Status))),
		Location:      req.GetString("location", existing.Location),
		Remark:        req.GetString("remark", existing.Remark),
	}
	if wid := uint(req.GetFloat("warehouse_id", 0)); wid > 0 {
		upd.WarehouseID = ptrUint(wid)
	} else {
		upd.WarehouseID = existing.WarehouseID
	}
	if did := uint(req.GetFloat("dept_id", 0)); did > 0 {
		upd.DeptID = ptrUint(did)
	} else {
		upd.DeptID = existing.DeptID
	}
	if oid := uint(req.GetFloat("owner_id", 0)); oid > 0 {
		upd.OwnerID = ptrUint(oid)
	} else {
		upd.OwnerID = existing.OwnerID
	}
	if err := svc.Update(ctx, id, upd); err != nil {
		return resultError(fmt.Sprintf("更新资产失败: %v", err))
	}
	return resultText(map[string]any{"id": id, "success": true})
}

func handlePsiAssetDelete(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := psisvc.NewAssetService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("资产ID(id)必填")
	}
	if err := svc.Delete(ctx, id); err != nil {
		return resultError(fmt.Sprintf("删除资产失败: %v", err))
	}
	return resultText(map[string]any{"id": id, "success": true})
}
