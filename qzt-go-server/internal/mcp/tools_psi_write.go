package mcp

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
	"github.com/shopspring/decimal"

	"qzt-go-server/pkg/xtime"
	psisvc "qzt-go-server/internal/module/psi/service"
)

// tools_psi_write.go PSI 写操作 + 资产/退货只读 tools。
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
