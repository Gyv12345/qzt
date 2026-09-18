package service

import (
	"context"
	"encoding/json"
	"fmt"
	"sort"
	"strconv"
	"strings"
	"time"

	apprmodel "qzt-go-server/internal/model/approval"
	apprrepo "qzt-go-server/internal/repository/approval"
)

// resource.go 审批原单摘要。
// 详情抽屉要展示"批的是什么":按表单类型从业务表取一份只读摘要(标题字段 + 可选明细行)。
// 表名/列名全部来自本文件的服务端常量白名单,不接收客户端输入。

// SummaryField 摘要里的一个键值字段。
type SummaryField struct {
	Label string `json:"label"`
	Value string `json:"value"`
	// 前端字典码(如 EXPENSE_TYPE),非空时前端渲染前先映射中文
	Dict string `json:"dict,omitempty"`
}

// SummaryColumn 明细列定义。
type SummaryColumn struct {
	Key   string `json:"key"`
	Label string `json:"label"`
	Dict  string `json:"dict,omitempty"`
}

// SummaryItems 明细行(报销明细/单据商品行等)。
type SummaryItems struct {
	Title   string              `json:"title"`
	Columns []SummaryColumn     `json:"columns"`
	Rows    []map[string]string `json:"rows"`
}

// ResourceSummary 原单摘要(审批详情抽屉渲染用)。
type ResourceSummary struct {
	FormType      string         `json:"form_type"`
	FormTypeLabel string         `json:"form_type_label"`
	ResourceID    uint           `json:"resource_id"`
	Title         string         `json:"title"`
	Found         bool           `json:"found"`
	Fields        []SummaryField `json:"fields"`
	Items         *SummaryItems  `json:"items,omitempty"`
}

// fieldSpec 主单字段抽取规则。
type fieldSpec struct {
	label string
	col   string
	dict  string
	// 引用表名:值是该表的主键,展示时解析为 refNameColumn 对应的名称列
	ref   string
	enums map[string]string
}

// itemsSpec 明细行抽取规则。
type itemsSpec struct {
	table   string
	fkCol   string
	title   string
	columns []fieldSpec
}

// refNameColumn 引用表 → 名称列(服务端常量白名单)。
var refNameColumn = map[string]string{
	"crm_customer":    "name",
	"crm_contract":    "name",
	"crm_product":     "name",
	"crm_product_sku": "spec",
	"psi_supplier":    "name",
	"psi_warehouse":   "name",
	"oa_meeting_room": "name",
	"hrm_department":  "name",
	"hrm_employee":    "name",
	"sys_user":        "nickname",
}

// psiOrderStatus / psiReturnStatus / loanRepaidStatus 等枚举在各自 spec 内联。
var summarySpecs = map[string]struct {
	fields []fieldSpec
	items  *itemsSpec
}{
	apprmodel.FormTypeContract: {
		fields: []fieldSpec{
			{label: "合同编号", col: "contract_no"},
			{label: "客户", col: "customer_id", ref: "crm_customer"},
			{label: "合同总额", col: "total_amount"},
			{label: "已回款", col: "received_amount"},
			{label: "签订日期", col: "signed_date"},
			{label: "开始日期", col: "start_date"},
			{label: "结束日期", col: "end_date"},
			{label: "阶段", col: "stage", dict: "CONTRACT_STAGE"},
		},
	},
	apprmodel.FormTypeExpense: {
		fields: []fieldSpec{
			{label: "报销单号", col: "expense_no"},
			{label: "申请人", col: "applicant_id", ref: "sys_user"},
			{label: "部门", col: "dept_id", ref: "hrm_department"},
			{label: "费用类型", col: "expense_type", dict: "EXPENSE_TYPE"},
			{label: "报销总额", col: "amount"},
			{label: "费用发生日期", col: "occur_date"},
			{label: "说明", col: "description"},
		},
		items: &itemsSpec{
			table: "oa_expense_item", fkCol: "expense_id", title: "费用明细",
			columns: []fieldSpec{
				{label: "类型", col: "item_type"},
				{label: "金额", col: "amount"},
				{label: "发生日期", col: "occur_date"},
				{label: "发票号", col: "invoice_no"},
				{label: "备注", col: "remark"},
			},
		},
	},
	apprmodel.FormTypeLeave: {
		fields: []fieldSpec{
			{label: "请假单号", col: "leave_no"},
			{label: "请假人", col: "employee_id", ref: "hrm_employee"},
			{label: "请假类型", col: "leave_type", dict: "LEAVE_TYPE"},
			{label: "开始时间", col: "start_date"},
			{label: "结束时间", col: "end_date"},
			{label: "请假天数", col: "duration_days"},
			{label: "事由", col: "reason"},
		},
	},
	apprmodel.FormTypeTrip: {
		fields: []fieldSpec{
			{label: "出差单号", col: "trip_no"},
			{label: "申请人", col: "applicant_id", ref: "sys_user"},
			{label: "部门", col: "dept_id", ref: "hrm_department"},
			{label: "目的地", col: "destination"},
			{label: "出发日期", col: "start_date"},
			{label: "返回日期", col: "end_date"},
			{label: "交通方式", col: "transport", dict: "TRIP_TRANSPORT"},
			{label: "预算金额", col: "budget_amount"},
			{label: "出差目的", col: "purpose"},
			{label: "备注", col: "description"},
		},
	},
	apprmodel.FormTypeLoan: {
		fields: []fieldSpec{
			{label: "借款单号", col: "loan_no"},
			{label: "借款人", col: "applicant_id", ref: "sys_user"},
			{label: "部门", col: "dept_id", ref: "hrm_department"},
			{label: "借款类型", col: "loan_type"},
			{label: "借款金额", col: "amount"},
			{label: "预计还款日期", col: "expected_date"},
			{label: "还款状态", col: "repaid_status", enums: map[string]string{
				"0": "未还清", "1": "部分还款", "2": "已还清",
			}},
			{label: "已还金额", col: "repaid_amount"},
			{label: "借款事由", col: "reason"},
		},
	},
	apprmodel.FormTypeMeetingBooking: {
		fields: []fieldSpec{
			{label: "预订单号", col: "booking_no"},
			{label: "预订人", col: "organizer_id", ref: "sys_user"},
			{label: "会议室", col: "room_id", ref: "oa_meeting_room"},
			{label: "开始时间", col: "start_time"},
			{label: "结束时间", col: "end_time"},
			{label: "参会人数", col: "attendees"},
			{label: "会议主题", col: "topic"},
			{label: "备注", col: "remark"},
		},
	},
	apprmodel.FormTypeInvoice: {
		fields: []fieldSpec{
			{label: "发票号码", col: "invoice_no"},
			{label: "发票类型", col: "invoice_type", enums: map[string]string{
				"VAT_SPECIAL": "增值税专票", "VAT_NORMAL": "增值税普票", "ELECTRONIC": "电子发票",
			}},
			{label: "方向", col: "direction", enums: map[string]string{
				"RECEIVED": "收票", "ISSUED": "开票",
			}},
			{label: "开票日期", col: "invoice_date"},
			{label: "不含税金额", col: "amount"},
			{label: "税率", col: "tax_rate"},
			{label: "税额", col: "tax_amount"},
			{label: "价税合计", col: "total_amount"},
			{label: "对方名称", col: "party_name"},
			{label: "关联业务", col: "biz_type", enums: map[string]string{
				"CONTRACT": "合同", "PURCHASE": "采购", "SALES": "销售",
			}},
			{label: "备注", col: "remark"},
		},
	},
	apprmodel.FormTypePurchaseOrder: {
		fields: psiOrderFields("采购单号", map[string]string{
			"1": "待入库", "2": "已入库", "3": "已关闭",
		}, "入库仓库"),
		items: psiItemsSpec("psi_purchase_order_detail", "order_id"),
	},
	apprmodel.FormTypeSalesOrder: {
		fields: psiOrderFields("销售单号", map[string]string{
			"1": "待出库", "2": "已出库", "3": "已关闭",
		}, "出库仓库"),
		items: psiItemsSpec("psi_sales_order_detail", "order_id"),
	},
	apprmodel.FormTypePurchaseReturn: {
		fields: psiReturnFields(map[string]string{
			"1": "待处理", "2": "已完成",
		}, "出库仓库", "psi_supplier"),
		items: psiItemsSpec("psi_purchase_return_detail", "return_id"),
	},
	apprmodel.FormTypeSalesReturn: {
		fields: psiReturnFields(map[string]string{
			"1": "待处理", "2": "已完成",
		}, "入库仓库", "crm_customer"),
		items: psiItemsSpec("psi_sales_return_detail", "return_id"),
	},
	// QUOTATION/ORDER:crm_quotation/crm_order 表未建,查无数据时按 Found=false 降级
}

// psiOrderFields 采购/销售订单主单字段(两者结构相同,仅单号/对方/仓库文案不同)。
func psiOrderFields(noLabel string, statusEnums map[string]string, warehouseLabel string) []fieldSpec {
	return []fieldSpec{
		{label: noLabel, col: "order_no"},
		{label: "供应商", col: "supplier_id", ref: "psi_supplier"},
		{label: "客户", col: "customer_id", ref: "crm_customer"},
		{label: "关联合同", col: "contract_id", ref: "crm_contract"},
		{label: warehouseLabel, col: "warehouse_id", ref: "psi_warehouse"},
		{label: "单据日期", col: "order_date"},
		{label: "合计数量", col: "total_quantity"},
		{label: "合计金额", col: "total_amount"},
		{label: "优惠金额", col: "discount_amount"},
		{label: "状态", col: "status", enums: statusEnums},
		{label: "备注", col: "remark"},
	}
}

// psiReturnFields 采购/销售退货主单字段。
func psiReturnFields(statusEnums map[string]string, warehouseLabel, partyTable string) []fieldSpec {
	party := fieldSpec{label: "客户", col: "customer_id", ref: "crm_customer"}
	if partyTable == "psi_supplier" {
		party = fieldSpec{label: "供应商", col: "supplier_id", ref: "psi_supplier"}
	}
	return []fieldSpec{
		{label: "退货单号", col: "return_no"},
		party,
		{label: warehouseLabel, col: "warehouse_id", ref: "psi_warehouse"},
		{label: "退货日期", col: "return_date"},
		{label: "合计金额", col: "total_amount"},
		{label: "状态", col: "status", enums: statusEnums},
		{label: "备注", col: "remark"},
	}
}

// psiItemsSpec 单据商品明细列(四张单据明细结构一致)。
func psiItemsSpec(table, fkCol string) *itemsSpec {
	return &itemsSpec{
		table: table, fkCol: fkCol, title: "商品明细",
		columns: []fieldSpec{
			{label: "商品", col: "product_id", ref: "crm_product"},
			{label: "规格", col: "sku_id", ref: "crm_product_sku"},
			{label: "数量", col: "quantity"},
			{label: "单价", col: "unit_price"},
			{label: "金额", col: "amount"},
			{label: "备注", col: "remark"},
		},
	}
}

// GetResourceSummary 取审批实例的原单摘要。
func (s *TodoService) GetResourceSummary(ctx context.Context, instanceID uint) (*ResourceSummary, error) {
	instance, err := s.instanceRepo.GetByID(ctx, instanceID)
	if err != nil {
		return nil, err
	}
	summary := &ResourceSummary{
		FormType:      instance.Type,
		FormTypeLabel: formTypeLabel[instance.Type],
		ResourceID:    instance.ResourceID,
		Fields:        []SummaryField{},
	}

	// 标题复用列表 enrichment 的取数逻辑
	single := []apprmodel.ApprovalInstance{*instance}
	titleMap := fetchResourceTitles(ctx, single)
	summary.Title = titleMap[fmt.Sprintf("%s:%d", instance.Type, instance.ResourceID)]

	spec, ok := summarySpecs[instance.Type]
	table, tableOK := apprmodel.FormTable[instance.Type]
	if !ok || !tableOK {
		// OA_CUSTOM 走专门分支;其余无 spec 的类型保持 Found=false 优雅降级
		if instance.Type == apprmodel.FormTypeCustomForm {
			return buildCustomFormSummary(ctx, instance, summary)
		}
		return summary, nil
	}

	var row map[string]any
	if err := apprrepo.ScanBusinessRow(ctx, table, instance.ResourceID, &row); err != nil || len(row) == 0 {
		return summary, nil // 原单不存在/表未建,Found=false
	}
	summary.Found = true
	summary.Fields = extractFields(ctx, row, spec.fields)

	if spec.items != nil {
		var rows []map[string]any
		if err := apprrepo.ScanBusinessDetailRows(ctx, spec.items.table, spec.items.fkCol, instance.ResourceID, &rows); err == nil && len(rows) > 0 {
			summary.Items = extractItems(ctx, rows, spec.items)
		}
	}
	return summary, nil
}

// buildCustomFormSummary OA_CUSTOM:field_values 按模板 fields_config 的 key→title 展开为字段。
func buildCustomFormSummary(ctx context.Context, instance *apprmodel.ApprovalInstance, summary *ResourceSummary) (*ResourceSummary, error) {
	var row map[string]any
	if err := apprrepo.ScanBusinessRow(ctx, "oa_form_data", instance.ResourceID, &row); err != nil || len(row) == 0 {
		return summary, nil
	}
	summary.Found = true

	fields := []fieldSpec{
		{label: "数据单号", col: "data_no"},
		{label: "表单模板", col: "template_name"},
		{label: "提交人", col: "submitter_id", ref: "sys_user"},
	}
	summary.Fields = extractFields(ctx, row, fields)

	// 模板字段定义里取 key → 中文标题(保持定义顺序)
	type tplField struct{ key, label string }
	var order []tplField
	labelByKey := map[string]string{}
	var tplRow map[string]any
	if tplID := toUint(row["template_id"]); tplID > 0 {
		if err := apprrepo.ScanBusinessRow(ctx, "oa_form_template", tplID, &tplRow); err == nil && tplRow != nil {
			var defs []struct {
				Key   string `json:"key"`
				Title string `json:"title"`
			}
			if json.Unmarshal([]byte(toStr(tplRow["fields_config"])), &defs) == nil {
				for _, d := range defs {
					label := d.Title
					if label == "" {
						label = d.Key
					}
					order = append(order, tplField{d.Key, label})
					labelByKey[d.Key] = label
				}
			}
		}
	}

	var values map[string]any
	if raw := toStr(row["field_values"]); raw != "" {
		_ = json.Unmarshal([]byte(raw), &values)
	}
	// 先按模板定义顺序输出,模板里没有的 key 兜底追加(按 key 排序保证稳定)
	emitted := map[string]bool{}
	for _, f := range order {
		if _, ok := values[f.key]; ok {
			summary.Fields = append(summary.Fields, SummaryField{Label: f.label, Value: toStr(values[f.key])})
			emitted[f.key] = true
		}
	}
	extra := make([]string, 0)
	for key := range values {
		if !emitted[key] {
			extra = append(extra, key)
		}
	}
	sort.Strings(extra)
	for _, key := range extra {
		label := labelByKey[key]
		if label == "" {
			label = key
		}
		summary.Fields = append(summary.Fields, SummaryField{Label: label, Value: toStr(values[key])})
	}
	return summary, nil
}

// extractFields 按字段白名单从行数据抽取摘要字段,引用列批量解析名称。
func extractFields(ctx context.Context, row map[string]any, specs []fieldSpec) []SummaryField {
	names := resolveRefs(ctx, row, specs)
	out := make([]SummaryField, 0, len(specs))
	for _, sp := range specs {
		raw, exists := row[sp.col]
		value := toStr(raw)
		if sp.ref != "" {
			if id := toUint(raw); id == 0 {
				continue // 未指定的引用(如 0=历史数据未指定 SKU)不展示
			}
			value = names[refKey(sp.ref, toUint(raw))]
		}
		if !exists || value == "" {
			continue // 空值字段不占位
		}
		if sp.enums != nil {
			if mapped, ok := sp.enums[value]; ok {
				value = mapped
			}
		}
		out = append(out, SummaryField{Label: sp.label, Value: value, Dict: sp.dict})
	}
	return out
}

// extractItems 抽取明细行(列定义 + 每行键值)。
func extractItems(ctx context.Context, rows []map[string]any, spec *itemsSpec) *SummaryItems {
	// 收集全部行的引用 id 批量解析
	names := map[string]string{}
	refIDs := map[string][]uint{}
	for _, r := range rows {
		for _, col := range spec.columns {
			if col.ref != "" {
				if id := toUint(r[col.col]); id > 0 {
					refIDs[col.ref] = append(refIDs[col.ref], id)
				}
			}
		}
	}
	for table, ids := range refIDs {
		nameCol := refNameColumn[table]
		resolved, err := apprrepo.ScanRefNames(ctx, table, nameCol, ids)
		if err != nil {
			continue
		}
		for id, name := range resolved {
			names[refKey(table, id)] = name
		}
	}

	cols := make([]SummaryColumn, 0, len(spec.columns))
	for _, c := range spec.columns {
		cols = append(cols, SummaryColumn{Key: c.col, Label: c.label, Dict: c.dict})
	}
	out := &SummaryItems{Title: spec.title, Columns: cols, Rows: []map[string]string{}}
	for _, r := range rows {
		item := map[string]string{}
		for _, c := range spec.columns {
			value := toStr(r[c.col])
			if c.ref != "" {
				if toUint(r[c.col]) == 0 {
					continue
				}
				value = names[refKey(c.ref, toUint(r[c.col]))]
			}
			item[c.col] = value
		}
		out.Rows = append(out.Rows, item)
	}
	return out
}

// resolveRefs 批量解析一行数据里全部引用列,返回 "table:id" → 名称。
func resolveRefs(ctx context.Context, row map[string]any, specs []fieldSpec) map[string]string {
	refIDs := map[string][]uint{}
	for _, sp := range specs {
		if sp.ref == "" {
			continue
		}
		if id := toUint(row[sp.col]); id > 0 {
			refIDs[sp.ref] = append(refIDs[sp.ref], id)
		}
	}
	names := map[string]string{}
	for table, ids := range refIDs {
		resolved, err := apprrepo.ScanRefNames(ctx, table, refNameColumn[table], ids)
		if err != nil {
			continue
		}
		for id, name := range resolved {
			names[refKey(table, id)] = name
		}
	}
	return names
}

func refKey(table string, id uint) string {
	return fmt.Sprintf("%s:%d", table, id)
}

// toStr 把 Scan 出来的裸值转为展示字符串。
func toStr(v any) string {
	switch val := v.(type) {
	case nil:
		return ""
	case []byte:
		return normalizeDecimal(string(val))
	case string:
		return normalizeDecimal(val)
	case time.Time:
		s := val.Format("2006-01-02 15:04:05")
		return strings.TrimSuffix(s, " 00:00:00") // 纯日期列不带时分秒
	case float64:
		return strconv.FormatFloat(val, 'f', -1, 64)
	case float32:
		return strconv.FormatFloat(float64(val), 'f', -1, 32)
	default:
		return normalizeDecimal(fmt.Sprintf("%v", val))
	}
}

// normalizeDecimal 规整 DECIMAL 扫描出的字符串:"0.1300"→"0.13"、"1000.00"→"1000.00"、"1.500"→"1.50"。
// 只动形如 整数.纯数字 的串,且至少保留两位小数。
func normalizeDecimal(s string) string {
	dot := strings.IndexByte(s, '.')
	if dot <= 0 || dot == len(s)-1 || len(s) > 32 {
		return s
	}
	for i := len(s) - 1; i > dot; i-- {
		if s[i] < '0' || s[i] > '9' {
			return s // 非纯数字(时间串等)不动
		}
	}
	intPart, frac := s[:dot], s[dot+1:]
	for len(frac) > 2 && frac[len(frac)-1] == '0' {
		frac = frac[:len(frac)-1]
	}
	return intPart + "." + frac
}

// toUint 从裸值取无符号整数(引用列解析用)。
func toUint(v any) uint {
	switch val := v.(type) {
	case nil:
		return 0
	case int64:
		if val > 0 {
			return uint(val)
		}
	case uint64:
		return uint(val)
	case uint:
		return val
	case int:
		if val > 0 {
			return uint(val)
		}
	case []byte:
		n, _ := strconv.ParseUint(string(val), 10, 64)
		return uint(n)
	case string:
		n, _ := strconv.ParseUint(val, 10, 64)
		return uint(n)
	case float64:
		if val > 0 {
			return uint(val)
		}
	}
	return 0
}
