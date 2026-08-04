package crm

import (
	"fmt"

	"go.uber.org/zap"
	"gorm.io/gorm"
)

// migrate.go CRM 模块的建表 + 种子数据。

// allModels 所有需要建表的 CRM model。新增 model 时在此登记。
func allModels() []any {
	return []any{
		// 自定义字段引擎
		&SysModuleForm{},
		&SysModuleField{},
		&SysModuleFieldBlob{},
		// 客户
		&CrmCustomer{},
		&CrmCustomerContact{},
		&CrmCustomerCollaboration{},
		// 公海池
		&CrmCustomerPool{},
		&CrmCustomerPoolHiddenField{},
		&CrmCustomerPoolPickRule{},
		&CrmCustomerPoolRecycleRule{},
		&CrmCustomerCapacity{},
		&CrmCustomerOwnerHistory{},
		// 商机
		&CrmOpportunity{},
		// 阶段
		&StageConfig{},
		&StageRecord{},
		// 合同
		&CrmBusinessTitle{},
		&CrmContract{},
		&CrmContractPaymentPlan{},
		&CrmContractPaymentRecord{},
		// 商品
		&CrmProduct{},
		&CrmProductPrice{},
		// 跟进
		&FollowUpRecord{},
		&FollowUpPlan{},
		// 自定义字段值表
		&CustomerField{}, &CustomerFieldBlob{},
		&OpportunityField{}, &OpportunityFieldBlob{},
		&ContractField{}, &ContractFieldBlob{},
		&ProductField{}, &ProductFieldBlob{},
		&FollowUpRecordField{}, &FollowUpRecordFieldBlob{},
	}
}

// AutoMigrate 同步 CRM 所有表结构。
func AutoMigrate(db *gorm.DB) error {
	return db.AutoMigrate(allModels()...)
}

// SeedCRMData 写入 CRM 初始数据:字典、默认表单、默认自定义字段、默认阶段配置。
// 幂等:以 sys_module_form 的 CUSTOMER 表单是否存在为判断标志。
func SeedCRMData(db *gorm.DB) error {
	var count int64
	db.Model(&SysModuleForm{}).Where("form_key = ?", FormCustomer).Count(&count)
	if count > 0 {
		return nil
	}
	zap.S().Info("开始写入 CRM 初始数据...")

	err := db.Transaction(func(tx *gorm.DB) error {
		// 1. 表单
		forms := defaultForms()
		if err := tx.Create(&forms).Error; err != nil {
			return err
		}
		// 2. 默认自定义字段(客户表单的扩展字段:电话/邮箱/地址/网站)
		fields, blobs := defaultCustomerFields(forms[0].ID)
		if len(fields) > 0 {
			if err := tx.Create(&fields).Error; err != nil {
				return err
			}
		}
		if len(blobs) > 0 {
			if err := tx.Create(&blobs).Error; err != nil {
				return err
			}
		}
		// 3. 阶段配置(商机/合同)
		stages := defaultStageConfigs()
		if err := tx.Create(&stages).Error; err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		return fmt.Errorf("seed crm data: %w", err)
	}
	zap.S().Info("CRM 初始数据写入完成")
	return nil
}

func defaultForms() []SysModuleForm {
	return []SysModuleForm{
		{ID: "f_customer", FormKey: FormCustomer, Name: "客户"},
		{ID: "f_opportunity", FormKey: FormOpportunity, Name: "商机"},
		{ID: "f_contract", FormKey: FormContract, Name: "合同"},
		{ID: "f_product", FormKey: FormProduct, Name: "产品"},
		{ID: "f_follow_up_record", FormKey: FormFollowUpRecord, Name: "跟进记录"},
	}
}

// defaultCustomerFields 客户表单的默认自定义字段(扩展信息)。
// ID 用稳定的伪 UUID(便于后续引用);pos 控制排序。
func defaultCustomerFields(formID string) ([]SysModuleField, []SysModuleFieldBlob) {
	defs := []struct {
		id, key, name string
		ft            FieldType
		pos           int64
	}{
		{"cf_phone", "phone", "电话", FieldPhone, 10},
		{"cf_email", "email", "邮箱", FieldInput, 20},
		{"cf_address", "address", "详细地址", FieldTextarea, 30},
		{"cf_website", "website", "网址", FieldInput, 40},
	}
	var fields []SysModuleField
	for _, d := range defs {
		fields = append(fields, SysModuleField{
			ID: d.id, FormID: formID, InternalKey: d.key, Name: d.name, Type: d.ft, Pos: d.pos,
			Readable: 1, Editable: 1, Mobile: 1,
		})
	}
	// TEXTAREA 类型需要 blob 记录(此处 prop 留空,前端按需配置选项)
	var blobs []SysModuleFieldBlob
	for _, d := range defs {
		if d.ft.IsBlob() {
			blobs = append(blobs, SysModuleFieldBlob{ID: d.id, Prop: ""})
		}
	}
	return fields, blobs
}

// defaultStageConfigs 默认阶段配置(对齐 qztcrm V7.0.0 / V9.0.0)。
func defaultStageConfigs() []StageConfig {
	return []StageConfig{
		{
			BizType: StageBizOpportunity, Name: "商机销售漏斗", Enabled: 1,
			StagesJSON: `[{"key":"PROSPECTING","label":"初步接触","color":"#909399","sort":10,"probability":10},` +
				`{"key":"ANALYSIS","label":"需求分析","color":"#409EFF","sort":20,"probability":25},` +
				`{"key":"PROPOSAL","label":"方案报价","color":"#409EFF","sort":30,"probability":50},` +
				`{"key":"NEGOTIATION","label":"谈判","color":"#E6A23C","sort":40,"probability":70},` +
				`{"key":"WON","label":"已成交","color":"#67C23A","sort":50,"probability":100},` +
				`{"key":"LOST","label":"已丢失","color":"#F56C6C","sort":60,"probability":0}]`,
		},
		{
			BizType: StageBizContract, Name: "合同阶段", Enabled: 1,
			StagesJSON: `[{"key":"DRAFT","label":"草稿","color":"#909399","sort":10,"probability":0},` +
				`{"key":"APPROVAL","label":"审批中","color":"#E6A23C","sort":20,"probability":30},` +
				`{"key":"SIGNED","label":"已签订","color":"#409EFF","sort":30,"probability":60},` +
				`{"key":"EXECUTING","label":"执行中","color":"#409EFF","sort":40,"probability":80},` +
				`{"key":"COMPLETED","label":"已完成","color":"#67C23A","sort":50,"probability":100},` +
				`{"key":"TERMINATED","label":"已终止","color":"#F56C6C","sort":60,"probability":0}]`,
		},
	}
}
