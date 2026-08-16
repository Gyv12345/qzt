package mcp

import (
	"context"
	"fmt"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"

	psisvc "qzt-go-server/internal/module/psi/service"
)

// tools_psi_warehouse.go PSI 仓库写 tools。

func registerPsiWarehouseTools(s *server.MCPServer) {
	// ── 仓库 ──
	s.AddTool(
		mcp.NewTool("psi_warehouse_create",
			mcp.WithDescription("创建仓库"),
			mcp.WithString("code", mcp.Required(), mcp.Description("仓库编码")),
			mcp.WithString("name", mcp.Required(), mcp.Description("仓库名称")),
			mcp.WithString("address", mcp.Description("仓库地址")),
			mcp.WithNumber("manager_id", mcp.Description("负责人ID")),
			mcp.WithString("phone", mcp.Description("联系电话")),
			mcp.WithNumber("sort", mcp.Description("排序(默认0)")),
			mcp.WithNumber("status", mcp.Description("状态:1启用(默认) 2停用")),
			mcp.WithNumber("is_default", mcp.Description("是否默认仓库:0否 1是")),
			mcp.WithString("remark", mcp.Description("备注")),
		),
		handlePsiWarehouseCreate,
	)
	s.AddTool(
		mcp.NewTool("psi_warehouse_update",
			mcp.WithDescription("更新仓库(半增量:留空字段保留原值)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("仓库ID")),
			mcp.WithString("code", mcp.Description("仓库编码")),
			mcp.WithString("name", mcp.Description("仓库名称")),
			mcp.WithString("address", mcp.Description("仓库地址")),
			mcp.WithNumber("manager_id", mcp.Description("负责人ID")),
			mcp.WithString("phone", mcp.Description("联系电话")),
			mcp.WithNumber("sort", mcp.Description("排序")),
			mcp.WithNumber("status", mcp.Description("状态:1启用 2停用")),
			mcp.WithNumber("is_default", mcp.Description("是否默认仓库:0否 1是")),
			mcp.WithString("remark", mcp.Description("备注")),
		),
		handlePsiWarehouseUpdate,
	)
	s.AddTool(
		mcp.NewTool("psi_warehouse_delete",
			mcp.WithDescription("删除仓库(默认仓库不可删)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("仓库ID")),
		),
		handlePsiWarehouseDelete,
	)
}

// ── 仓库 handlers ──

func handlePsiWarehouseCreate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := psisvc.NewWarehouseService()
	code := req.GetString("code", "")
	name := req.GetString("name", "")
	if code == "" || name == "" {
		return resultError("仓库编码(code)和名称(name)必填")
	}
	wReq := &psisvc.CreateWarehouseRequest{
		Code: code, Name: name,
		Address: req.GetString("address", ""),
		Phone:   req.GetString("phone", ""),
		Sort:    int(req.GetFloat("sort", 0)),
		Remark:  req.GetString("remark", ""),
	}
	if mid := uint(req.GetFloat("manager_id", 0)); mid > 0 {
		wReq.ManagerID = ptrUint(mid)
	}
	if s := int8(req.GetFloat("status", 0)); s > 0 {
		wReq.Status = ptrInt8(s)
	}
	if d := int8(req.GetFloat("is_default", 0)); d > 0 {
		wReq.IsDefault = ptrInt8(d)
	}
	wh, err := svc.Create(ctx, wReq)
	if err != nil {
		return resultError(fmt.Sprintf("创建仓库失败: %v", err))
	}
	return resultText(wh)
}

func handlePsiWarehouseUpdate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := psisvc.NewWarehouseService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("仓库ID(id)必填")
	}
	existing, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("仓库不存在: %v", err))
	}
	upd := &psisvc.UpdateWarehouseRequest{
		Code:    req.GetString("code", existing.Code),
		Name:    req.GetString("name", existing.Name),
		Address: req.GetString("address", existing.Address),
		Phone:   req.GetString("phone", existing.Phone),
		Sort:    int(req.GetFloat("sort", float64(existing.Sort))),
		Remark:  req.GetString("remark", existing.Remark),
	}
	if mid := uint(req.GetFloat("manager_id", 0)); mid > 0 {
		upd.ManagerID = ptrUint(mid)
	} else {
		upd.ManagerID = existing.ManagerID
	}
	if s := int8(req.GetFloat("status", 0)); s > 0 {
		upd.Status = ptrInt8(s)
	} else {
		upd.Status = ptrInt8(existing.Status)
	}
	if d := int8(req.GetFloat("is_default", -1)); d >= 0 {
		upd.IsDefault = ptrInt8(d)
	} else {
		upd.IsDefault = ptrInt8(existing.IsDefault)
	}
	if err := svc.Update(ctx, id, upd); err != nil {
		return resultError(fmt.Sprintf("更新仓库失败: %v", err))
	}
	return resultText(map[string]any{"id": id, "success": true})
}

func handlePsiWarehouseDelete(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := psisvc.NewWarehouseService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("仓库ID(id)必填")
	}
	if err := svc.Delete(ctx, id); err != nil {
		return resultError(fmt.Sprintf("删除仓库失败: %v", err))
	}
	return resultText(map[string]any{"id": id, "success": true})
}
