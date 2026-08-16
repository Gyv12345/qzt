package mcp

import (
	"context"
	"fmt"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"

	psisvc "qzt-go-server/internal/module/psi/service"
)

// tools_psi_supplier.go PSI 供应商写 tools。

func registerPsiSupplierTools(s *server.MCPServer) {
	// ── 供应商 ──
	s.AddTool(
		mcp.NewTool("psi_supplier_create",
			mcp.WithDescription("创建供应商(编号留空自动生成)"),
			mcp.WithString("name", mcp.Required(), mcp.Description("供应商名称")),
			mcp.WithString("supplier_no", mcp.Description("供应商编号(留空自动生成)")),
			mcp.WithString("contact_person", mcp.Description("联系人")),
			mcp.WithString("phone", mcp.Description("电话")),
			mcp.WithString("email", mcp.Description("邮箱")),
			mcp.WithString("address", mcp.Description("地址")),
			mcp.WithString("bank_name", mcp.Description("开户行")),
			mcp.WithString("bank_account", mcp.Description("银行账号")),
			mcp.WithNumber("status", mcp.Description("状态:1启用(默认) 2停用")),
			mcp.WithString("remark", mcp.Description("备注")),
		),
		handlePsiSupplierCreate,
	)
	s.AddTool(
		mcp.NewTool("psi_supplier_update",
			mcp.WithDescription("更新供应商(半增量:留空字段保留原值)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("供应商ID")),
			mcp.WithString("name", mcp.Description("供应商名称")),
			mcp.WithString("supplier_no", mcp.Description("供应商编号")),
			mcp.WithString("contact_person", mcp.Description("联系人")),
			mcp.WithString("phone", mcp.Description("电话")),
			mcp.WithString("email", mcp.Description("邮箱")),
			mcp.WithString("address", mcp.Description("地址")),
			mcp.WithString("bank_name", mcp.Description("开户行")),
			mcp.WithString("bank_account", mcp.Description("银行账号")),
			mcp.WithNumber("status", mcp.Description("状态:1启用 2停用")),
			mcp.WithString("remark", mcp.Description("备注")),
		),
		handlePsiSupplierUpdate,
	)
	s.AddTool(
		mcp.NewTool("psi_supplier_delete",
			mcp.WithDescription("删除供应商"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("供应商ID")),
		),
		handlePsiSupplierDelete,
	)
}

// ── 供应商 handlers ──

func handlePsiSupplierCreate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := psisvc.NewSupplierService()
	name := req.GetString("name", "")
	if name == "" {
		return resultError("供应商名称(name)必填")
	}
	sReq := &psisvc.CreateSupplierRequest{
		Name:          name,
		SupplierNo:    req.GetString("supplier_no", ""),
		ContactPerson: req.GetString("contact_person", ""),
		Phone:         req.GetString("phone", ""),
		Email:         req.GetString("email", ""),
		Address:       req.GetString("address", ""),
		BankName:      req.GetString("bank_name", ""),
		BankAccount:   req.GetString("bank_account", ""),
		Remark:        req.GetString("remark", ""),
	}
	if s := int8(req.GetFloat("status", 0)); s > 0 {
		sReq.Status = ptrInt8(s)
	}
	sup, err := svc.Create(ctx, sReq)
	if err != nil {
		return resultError(fmt.Sprintf("创建供应商失败: %v", err))
	}
	return resultText(sup)
}

func handlePsiSupplierUpdate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := psisvc.NewSupplierService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("供应商ID(id)必填")
	}
	existing, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("供应商不存在: %v", err))
	}
	upd := &psisvc.UpdateSupplierRequest{
		Name:          req.GetString("name", existing.Name),
		SupplierNo:    req.GetString("supplier_no", existing.SupplierNo),
		ContactPerson: req.GetString("contact_person", existing.ContactPerson),
		Phone:         req.GetString("phone", existing.Phone),
		Email:         req.GetString("email", existing.Email),
		Address:       req.GetString("address", existing.Address),
		BankName:      req.GetString("bank_name", existing.BankName),
		BankAccount:   req.GetString("bank_account", existing.BankAccount),
		Remark:        req.GetString("remark", existing.Remark),
	}
	if s := int8(req.GetFloat("status", 0)); s > 0 {
		upd.Status = ptrInt8(s)
	} else {
		upd.Status = ptrInt8(existing.Status)
	}
	if err := svc.Update(ctx, id, upd); err != nil {
		return resultError(fmt.Sprintf("更新供应商失败: %v", err))
	}
	return resultText(map[string]any{"id": id, "success": true})
}

func handlePsiSupplierDelete(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := psisvc.NewSupplierService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("供应商ID(id)必填")
	}
	if err := svc.Delete(ctx, id); err != nil {
		return resultError(fmt.Sprintf("删除供应商失败: %v", err))
	}
	return resultText(map[string]any{"id": id, "success": true})
}
