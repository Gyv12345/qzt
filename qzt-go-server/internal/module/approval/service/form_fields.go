package service

import (
	"context"
	"encoding/json"

	apprmodel "qzt-go-server/internal/model/approval"
	crmmodel "qzt-go-server/internal/model/crm"
	"qzt-go-server/internal/repository"
)

// form_fields.go 审批条件字段元数据。
//
// 审批流设计器配置"条件分支"时,需要知道当前表单有哪些字段可作为条件、字段类型、
// 枚举可选值。本文件提供 GetFormFields,按 form_type 聚合三类来源:
//  1. 固定字段(formFixedFields):精选自各业务 GORM 表的可比较列(number/date/enum/string)
//  2. CRM 自定义字段:仅 CONTRACT,查 sys_module_field(按可比较类型过滤)
//  3. OA 自定义表单:仅 OA_CUSTOM,解析 oa_form_template.fields_config
//
// 可比较类型白名单只有四类:number/date/enum/string(短文本)。
// 长文本(content/remark/reason 等)与复杂自定义类型(多选/人员/部门/附件/图片/公式)一律不暴露。

// FieldType 分类(条件求值按此决定操作符与值类型)。
const (
	FieldNumber = "number"
	FieldDate   = "date"
	FieldEnum   = "enum"
	FieldString = "string"
)

// FieldSource 来源(前端分组展示)。
const (
	SourceFixed  = "fixed"
	SourceCustom = "custom"
)

// FieldOpt 枚举选项。
type FieldOpt struct {
	Label string `json:"label"`
	Value string `json:"value"`
}

// FieldMeta 条件字段元数据。
type FieldMeta struct {
	Key     string     `json:"key"`     // 固定=列名;CRM自定义=field_id;OA_CUSTOM=字段key
	Label   string     `json:"label"`   // 中文标签
	Type    string     `json:"type"`    // number|date|enum|string
	Source  string     `json:"source"`  // fixed|custom
	Options []FieldOpt `json:"options"` // 仅 enum
}

// formFixedFields 各业务表单的固定可比较字段(已剔除长文本/外键/审计/审批状态)。
var formFixedFields = map[string][]FieldMeta{
	apprmodel.FormTypeContract: {
		{Key: "total_amount", Label: "合同总额", Type: FieldNumber, Source: SourceFixed},
		{Key: "stage", Label: "阶段", Type: FieldEnum, Source: SourceFixed, Options: []FieldOpt{
			{Label: "草稿", Value: "DRAFT"}, {Label: "审批中", Value: "APPROVAL"},
			{Label: "已签订", Value: "SIGNED"}, {Label: "执行中", Value: "EXECUTING"},
			{Label: "已完成", Value: "COMPLETED"}, {Label: "已终止", Value: "TERMINATED"},
		}},
		{Key: "signed_date", Label: "签订日期", Type: FieldDate, Source: SourceFixed},
		{Key: "start_date", Label: "开始日期", Type: FieldDate, Source: SourceFixed},
		{Key: "end_date", Label: "结束日期", Type: FieldDate, Source: SourceFixed},
		{Key: "contract_no", Label: "合同编号", Type: FieldString, Source: SourceFixed},
		{Key: "name", Label: "合同名称", Type: FieldString, Source: SourceFixed},
	},
	apprmodel.FormTypeInvoice: {
		{Key: "invoice_type", Label: "发票类型", Type: FieldEnum, Source: SourceFixed, Options: []FieldOpt{
			{Label: "增值税专票", Value: "VAT_SPECIAL"}, {Label: "普票", Value: "VAT_NORMAL"},
			{Label: "电子发票", Value: "ELECTRONIC"},
		}},
		{Key: "direction", Label: "收开方向", Type: FieldEnum, Source: SourceFixed, Options: []FieldOpt{
			{Label: "收票", Value: "RECEIVED"}, {Label: "开票", Value: "ISSUED"},
		}},
		{Key: "amount", Label: "不含税金额", Type: FieldNumber, Source: SourceFixed},
		{Key: "tax_rate", Label: "税率", Type: FieldNumber, Source: SourceFixed},
		{Key: "tax_amount", Label: "税额", Type: FieldNumber, Source: SourceFixed},
		{Key: "total_amount", Label: "价税合计", Type: FieldNumber, Source: SourceFixed},
		{Key: "invoice_date", Label: "开票日期", Type: FieldDate, Source: SourceFixed},
		{Key: "invoice_no", Label: "发票号码", Type: FieldString, Source: SourceFixed},
		{Key: "party_name", Label: "对方名称", Type: FieldString, Source: SourceFixed},
	},
	apprmodel.FormTypePurchaseOrder: {
		{Key: "total_quantity", Label: "合计数量", Type: FieldNumber, Source: SourceFixed},
		{Key: "total_amount", Label: "合计金额", Type: FieldNumber, Source: SourceFixed},
		{Key: "discount_amount", Label: "优惠金额", Type: FieldNumber, Source: SourceFixed},
		{Key: "order_date", Label: "采购日期", Type: FieldDate, Source: SourceFixed},
		{Key: "expected_date", Label: "预计到货日期", Type: FieldDate, Source: SourceFixed},
		{Key: "status", Label: "单据状态", Type: FieldEnum, Source: SourceFixed, Options: []FieldOpt{
			{Label: "待入库", Value: "1"}, {Label: "已入库", Value: "2"}, {Label: "已关闭", Value: "3"},
		}},
		{Key: "order_no", Label: "采购单号", Type: FieldString, Source: SourceFixed},
	},
	apprmodel.FormTypeSalesOrder: {
		{Key: "total_quantity", Label: "合计数量", Type: FieldNumber, Source: SourceFixed},
		{Key: "total_amount", Label: "合计金额", Type: FieldNumber, Source: SourceFixed},
		{Key: "discount_amount", Label: "优惠金额", Type: FieldNumber, Source: SourceFixed},
		{Key: "order_date", Label: "销售日期", Type: FieldDate, Source: SourceFixed},
		{Key: "status", Label: "单据状态", Type: FieldEnum, Source: SourceFixed, Options: []FieldOpt{
			{Label: "待出库", Value: "1"}, {Label: "已出库", Value: "2"}, {Label: "已关闭", Value: "3"},
		}},
		{Key: "order_no", Label: "销售单号", Type: FieldString, Source: SourceFixed},
	},
	apprmodel.FormTypePurchaseReturn: {
		{Key: "total_amount", Label: "合计金额", Type: FieldNumber, Source: SourceFixed},
		{Key: "return_date", Label: "退货日期", Type: FieldDate, Source: SourceFixed},
		{Key: "status", Label: "单据状态", Type: FieldEnum, Source: SourceFixed, Options: []FieldOpt{
			{Label: "待处理", Value: "1"}, {Label: "已完成", Value: "2"},
		}},
		{Key: "return_no", Label: "退货单号", Type: FieldString, Source: SourceFixed},
	},
	apprmodel.FormTypeSalesReturn: {
		{Key: "total_amount", Label: "合计金额", Type: FieldNumber, Source: SourceFixed},
		{Key: "return_date", Label: "退货日期", Type: FieldDate, Source: SourceFixed},
		{Key: "status", Label: "单据状态", Type: FieldEnum, Source: SourceFixed, Options: []FieldOpt{
			{Label: "待处理", Value: "1"}, {Label: "已完成", Value: "2"},
		}},
		{Key: "return_no", Label: "退货单号", Type: FieldString, Source: SourceFixed},
	},
	apprmodel.FormTypeExpense: {
		{Key: "expense_type", Label: "费用类型", Type: FieldEnum, Source: SourceFixed, Options: []FieldOpt{
			{Label: "差旅", Value: "TRAVEL"}, {Label: "办公", Value: "OFFICE"},
			{Label: "招待", Value: "HOSPITALITY"}, {Label: "交通", Value: "TRANSPORT"},
			{Label: "通讯", Value: "COMMUNICATION"}, {Label: "其他", Value: "OTHER"},
		}},
		{Key: "amount", Label: "报销总额", Type: FieldNumber, Source: SourceFixed},
		{Key: "occur_date", Label: "费用发生日期", Type: FieldDate, Source: SourceFixed},
		{Key: "payment_status", Label: "打款状态", Type: FieldEnum, Source: SourceFixed, Options: []FieldOpt{
			{Label: "未打款", Value: "0"}, {Label: "已打款", Value: "1"},
		}},
		{Key: "expense_no", Label: "报销单号", Type: FieldString, Source: SourceFixed},
		{Key: "title", Label: "报销标题", Type: FieldString, Source: SourceFixed},
	},
	apprmodel.FormTypeLeave: {
		{Key: "leave_type", Label: "请假类型", Type: FieldEnum, Source: SourceFixed, Options: []FieldOpt{
			{Label: "事假", Value: "PERSONAL"}, {Label: "病假", Value: "SICK"},
			{Label: "年假", Value: "ANNUAL"}, {Label: "婚假", Value: "MARRIAGE"},
			{Label: "产假", Value: "MATERNITY"}, {Label: "其他", Value: "OTHER"},
		}},
		{Key: "duration_days", Label: "请假天数", Type: FieldNumber, Source: SourceFixed},
		{Key: "start_date", Label: "开始时间", Type: FieldDate, Source: SourceFixed},
		{Key: "end_date", Label: "结束时间", Type: FieldDate, Source: SourceFixed},
		{Key: "leave_no", Label: "请假单号", Type: FieldString, Source: SourceFixed},
	},
	apprmodel.FormTypeTrip: {
		// budget_amount 是 varchar 存 decimal,标 number,求值时 parseFloat
		{Key: "budget_amount", Label: "预算金额", Type: FieldNumber, Source: SourceFixed},
		{Key: "start_date", Label: "出发日期", Type: FieldDate, Source: SourceFixed},
		{Key: "end_date", Label: "返回日期", Type: FieldDate, Source: SourceFixed},
		// transport 取值来自字典 TRIP_TRANSPORT,无固定常量,按字符串匹配
		{Key: "transport", Label: "交通方式", Type: FieldString, Source: SourceFixed},
		{Key: "trip_no", Label: "出差单号", Type: FieldString, Source: SourceFixed},
		{Key: "title", Label: "出差标题", Type: FieldString, Source: SourceFixed},
		{Key: "destination", Label: "目的地", Type: FieldString, Source: SourceFixed},
	},
	apprmodel.FormTypeLoan: {
		// amount 是 varchar 存 decimal,标 number
		{Key: "amount", Label: "借款金额", Type: FieldNumber, Source: SourceFixed},
		{Key: "expected_date", Label: "预计还款日期", Type: FieldDate, Source: SourceFixed},
		{Key: "repaid_status", Label: "还款状态", Type: FieldEnum, Source: SourceFixed, Options: []FieldOpt{
			{Label: "未还", Value: "0"}, {Label: "部分", Value: "1"}, {Label: "已还清", Value: "2"},
		}},
		// loan_type 注释给中文取值但无 Go 常量,按字符串匹配
		{Key: "loan_type", Label: "借款类型", Type: FieldString, Source: SourceFixed},
		{Key: "loan_no", Label: "借款单号", Type: FieldString, Source: SourceFixed},
		{Key: "title", Label: "借款标题", Type: FieldString, Source: SourceFixed},
	},
	apprmodel.FormTypeMeetingBooking: {
		{Key: "attendees", Label: "参会人数", Type: FieldNumber, Source: SourceFixed},
		{Key: "start_time", Label: "开始时间", Type: FieldDate, Source: SourceFixed},
		{Key: "end_time", Label: "结束时间", Type: FieldDate, Source: SourceFixed},
		{Key: "booking_no", Label: "预订单号", Type: FieldString, Source: SourceFixed},
		{Key: "title", Label: "会议标题", Type: FieldString, Source: SourceFixed},
	},
	// QUOTATION/ORDER 无 model,不在此表 → GetFormFields 返回空
}

// crmCustomComparableTypes CRM 自定义字段中可作为条件的类型 → 归一分类。
var crmCustomComparableTypes = map[crmmodel.FieldType]string{
	crmmodel.FieldInputNumber: FieldNumber,
	crmmodel.FieldDateTime:    FieldDate,
	crmmodel.FieldRadio:       FieldEnum,
	crmmodel.FieldSelect:      FieldEnum,
	crmmodel.FieldInput:       FieldString,
}

// oaCustomComparableTypes OA 自定义表单 fields_config 中可作为条件的类型 → 归一分类。
var oaCustomComparableTypes = map[string]string{
	"number": FieldNumber,
	"date":   FieldDate,
	"select": FieldEnum,
	"text":   FieldString,
}

// GetFormFields 按 form_type(+form_key) 聚合条件字段元数据。
func GetFormFields(ctx context.Context, formType, formKey string) ([]FieldMeta, error) {
	out := make([]FieldMeta, 0)
	// 1. 固定字段
	out = append(out, formFixedFields[formType]...)
	// 2. CRM 自定义字段(仅 CONTRACT)
	if formType == apprmodel.FormTypeContract {
		out = append(out, loadCRMCustomFields(ctx, apprmodel.FormTypeContract)...)
	}
	// 3. OA 自定义表单(解析 fields_config)
	if formType == apprmodel.FormTypeCustomForm && formKey != "" {
		out = append(out, loadOACustomFields(ctx, formKey)...)
	}
	return out, nil
}

// loadCRMCustomFields 查 sys_module_field,按可比较类型过滤,返回自定义字段元数据。
// Key 用 field_id(求值时 contract_field 按 field_id 取值);options 从 sys_module_field_blob.prop 解析。
func loadCRMCustomFields(ctx context.Context, formKey string) []FieldMeta {
	db := repository.DBFrom(ctx)
	// 先取 form_id
	var form crmmodel.SysModuleForm
	if err := db.Where("form_key = ?", formKey).First(&form).Error; err != nil {
		return nil
	}
	// 取可比较类型列表
	comparableTypes := make([]string, 0, len(crmCustomComparableTypes))
	for t := range crmCustomComparableTypes {
		comparableTypes = append(comparableTypes, string(t))
	}
	var fields []crmmodel.SysModuleField
	if err := db.Where("form_id = ? AND type IN ?", form.ID, comparableTypes).
		Order("pos ASC").Find(&fields).Error; err != nil {
		return nil
	}
	if len(fields) == 0 {
		return nil
	}
	// 批量取 blob prop(RADIO/SELECT 需要选项)
	needBlob := make([]string, 0, len(fields))
	for _, f := range fields {
		if f.Type == crmmodel.FieldRadio || f.Type == crmmodel.FieldSelect {
			needBlob = append(needBlob, f.ID)
		}
	}
	propMap := make(map[string]string)
	if len(needBlob) > 0 {
		var blobs []crmmodel.SysModuleFieldBlob
		if err := db.Where("id IN ?", needBlob).Find(&blobs).Error; err == nil {
			for _, b := range blobs {
				propMap[b.ID] = b.Prop
			}
		}
	}
	out := make([]FieldMeta, 0, len(fields))
	for _, f := range fields {
		fm := FieldMeta{
			Key:    f.ID,
			Label:  f.Name,
			Type:   crmCustomComparableTypes[f.Type],
			Source: SourceCustom,
		}
		if f.Type == crmmodel.FieldRadio || f.Type == crmmodel.FieldSelect {
			fm.Options = parseCRMFieldOptions(propMap[f.ID])
		}
		out = append(out, fm)
	}
	return out
}

// crmFieldPropProp CRM 字段 prop JSON 中选项的结构。
type crmFieldProp struct {
	Options []struct {
		Value string `json:"value"`
		Label string `json:"label"`
	} `json:"options"`
}

// parseCRMFieldOptions 解析 sys_module_field_blob.prop 中的 options 数组。
func parseCRMFieldOptions(propJSON string) []FieldOpt {
	if propJSON == "" {
		return nil
	}
	var p crmFieldProp
	if err := json.Unmarshal([]byte(propJSON), &p); err != nil {
		return nil
	}
	if len(p.Options) == 0 {
		return nil
	}
	out := make([]FieldOpt, 0, len(p.Options))
	for _, o := range p.Options {
		out = append(out, FieldOpt{Label: o.Label, Value: o.Value})
	}
	return out
}

// oaConfigField OA 自定义表单 fields_config 单个字段的结构。
type oaConfigField struct {
	Key     string `json:"key"`
	Title   string `json:"title"`
	Type    string `json:"type"` // select/text/textarea/number/date
	Options []struct {
		Label string `json:"label"`
		Value string `json:"value"`
	} `json:"options"`
}

// loadOACustomFields 读 oa_form_template(by form_key) → 解析 fields_config → 按可比较类型过滤。
func loadOACustomFields(ctx context.Context, formKey string) []FieldMeta {
	db := repository.DBFrom(ctx)
	var tpl struct {
		FieldsConfig string
	}
	// 只取需要的列,扫到匿名结构
	if err := db.Table("oa_form_template").
		Where("form_key = ? AND status = 1", formKey).
		Select("fields_config").
		Scan(&tpl).Error; err != nil || tpl.FieldsConfig == "" {
		return nil
	}
	var cfg []oaConfigField
	if err := json.Unmarshal([]byte(tpl.FieldsConfig), &cfg); err != nil {
		return nil
	}
	out := make([]FieldMeta, 0, len(cfg))
	for _, f := range cfg {
		t, ok := oaCustomComparableTypes[f.Type]
		if !ok {
			continue // textarea 及其他不可比较类型跳过
		}
		fm := FieldMeta{Key: f.Key, Label: f.Title, Type: t, Source: SourceCustom}
		if t == FieldEnum && len(f.Options) > 0 {
			opts := make([]FieldOpt, 0, len(f.Options))
			for _, o := range f.Options {
				opts = append(opts, FieldOpt{Label: o.Label, Value: o.Value})
			}
			fm.Options = opts
		}
		out = append(out, fm)
	}
	return out
}
