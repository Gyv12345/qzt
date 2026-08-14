package crm

// customfield.go 自定义字段引擎:表单配置 + 字段定义 + 各业务实体的字段值表。
// 与 qztcrm 表结构一致(主键 VARCHAR(32) UUID,值表不嵌 BaseModel——无审计需求)。
//
// 字段类型分两类:
//   - 单值(18 种):存入 {entity}_field 的 VARCHAR(255),带 (resource_id,field_id,field_value) 复合索引
//   - 多值/大文本(9 种 BLOB):存入 {entity}_field_blob 的 TEXT

// FieldType 自定义字段类型(对齐 qztcrm 的 27 种)。
type FieldType string

const (
	FieldInput              FieldType = "INPUT"
	FieldTextarea           FieldType = "TEXTAREA"
	FieldInputNumber        FieldType = "INPUT_NUMBER"
	FieldDateTime           FieldType = "DATE_TIME"
	FieldRadio              FieldType = "RADIO"
	FieldCheckbox           FieldType = "CHECKBOX"
	FieldSelect             FieldType = "SELECT"
	FieldSelectMultiple     FieldType = "SELECT_MULTIPLE"
	FieldInputMultiple      FieldType = "INPUT_MULTIPLE"
	FieldMember             FieldType = "MEMBER"
	FieldMemberMultiple     FieldType = "MEMBER_MULTIPLE"
	FieldDepartment         FieldType = "DEPARTMENT"
	FieldDepartmentMultiple FieldType = "DEPARTMENT_MULTIPLE"
	FieldDivider            FieldType = "DIVIDER"
	FieldPicture            FieldType = "PICTURE"
	FieldLocation           FieldType = "LOCATION"
	FieldPhone              FieldType = "PHONE"
	FieldDataSource         FieldType = "DATA_SOURCE"
	FieldDataSourceMultiple FieldType = "DATA_SOURCE_MULTIPLE"
	FieldSerialNumber       FieldType = "SERIAL_NUMBER"
	FieldAttachment         FieldType = "ATTACHMENT"
	FieldLink               FieldType = "LINK"
	FieldIndustry           FieldType = "INDUSTRY"
	FieldFormula            FieldType = "FORMULA"
	FieldSubProduct         FieldType = "SUB_PRODUCT"
	FieldSubPrice           FieldType = "SUB_PRICE"
)

// IsBlob 判断字段类型是否存入 _field_blob 大值表(9 种)。
func (t FieldType) IsBlob() bool {
	switch t {
	case FieldTextarea, FieldCheckbox, FieldSelectMultiple, FieldInputMultiple,
		FieldMemberMultiple, FieldDepartmentMultiple, FieldDataSourceMultiple,
		FieldAttachment, FieldLink:
		return true
	}
	return false
}

// FormKey 表单模块标识。
type FormKey string

const (
	FormCustomer       FormKey = "CUSTOMER"
	FormOpportunity    FormKey = "OPPORTUNITY"
	FormContract       FormKey = "CONTRACT"
	FormProduct        FormKey = "PRODUCT"
	FormFollowUpRecord FormKey = "FOLLOW_UP_RECORD"
	FormLead           FormKey = "LEAD"
)

// SysModuleForm 模块表单配置。一个 formKey 对应一个表单(客户/商机/合同/产品/跟进记录)。
type SysModuleForm struct {
	ID      string  `json:"id" gorm:"primaryKey;size:32"`
	// 模块标识
	FormKey FormKey `json:"form_key" gorm:"uniqueIndex;size:50;not null;comment:模块标识"`
	// 表单名称
	Name    string  `json:"name" gorm:"size:100;not null;comment:表单名称"`
}

func (SysModuleForm) TableName() string { return "sys_module_form" }

// SysModuleField 字段定义(主信息)。
type SysModuleField struct {
	ID                 string    `json:"id" gorm:"primaryKey;size:32"`
	// 所属表单ID
	FormID             string    `json:"form_id" gorm:"index:idx_form;size:32;not null;comment:所属表单ID"`
	// 字段内置Key
	InternalKey        string    `json:"internal_key" gorm:"index:idx_form_internal;size:255;comment:字段内置Key"`
	// 字段名称
	Name               string    `json:"name" gorm:"size:255;not null;comment:字段名称"`
	// 字段类型
	Type               FieldType `json:"type" gorm:"size:20;not null;comment:字段类型"`
	// 是否移动端
	Mobile             int8      `json:"mobile" gorm:"default:0;comment:是否移动端"`
	// 排序
	Pos                int64     `json:"pos" gorm:"default:0;comment:排序"`
	// 是否可见
	Readable           int8      `json:"readable" gorm:"default:1;comment:是否可见"`
	// 是否可编辑
	Editable           int8      `json:"editable" gorm:"default:1;comment:是否可编辑"`
	// 转化映射目标字段ID(线索字段→客户字段)
	ConvertTargetField string    `json:"convert_target_field" gorm:"column:convert_target_field;size:32;comment:转化映射目标字段ID(线索字段→客户字段)"`
}

func (SysModuleField) TableName() string { return "sys_module_field" }

// SysModuleFieldBlob 字段定义的大属性(选项/校验/默认值/联动规则,JSON)。
type SysModuleFieldBlob struct {
	ID   string `json:"id" gorm:"primaryKey;size:32"`
	// 字段属性JSON
	Prop string `json:"prop" gorm:"type:text;comment:字段属性JSON"`
}

func (SysModuleFieldBlob) TableName() string { return "sys_module_field_blob" }

// ── 业务实体的自定义字段值表(单值 + BLOB 各一对) ──
// 所有值表结构相同:resource_id(业务实体ID,字符串)+ field_id + field_value。

// CustomerField 客户自定义字段值(单值)。
type CustomerField struct {
	ID         string `json:"id" gorm:"primaryKey;size:32"`
	// 客户ID
	ResourceID string `json:"resource_id" gorm:"index:idx_rfv,priority:1;size:32;not null;comment:客户ID"`
	// 字段ID
	FieldID    string `json:"field_id" gorm:"index:idx_rfv,priority:2;index;size:32;not null;comment:字段ID"`
	// 字段值
	FieldValue string `json:"field_value" gorm:"index:idx_rfv,priority:3;size:255;not null;comment:字段值"`
}

func (CustomerField) TableName() string { return "customer_field" }

// CustomerFieldBlob 客户自定义字段大值。
type CustomerFieldBlob struct {
	ID         string `json:"id" gorm:"primaryKey;size:32"`
	ResourceID string `json:"resource_id" gorm:"index;size:32;not null"`
	FieldID    string `json:"field_id" gorm:"size:32;not null"`
	FieldValue string `json:"field_value" gorm:"type:text;not null"`
}

func (CustomerFieldBlob) TableName() string { return "customer_field_blob" }

// OpportunityField 商机自定义字段值。
type OpportunityField struct {
	ID         string `json:"id" gorm:"primaryKey;size:32"`
	// 商机ID
	ResourceID string `json:"resource_id" gorm:"index:idx_opp_rfv,priority:1;size:32;not null;comment:商机ID"`
	FieldID    string `json:"field_id" gorm:"index:idx_opp_rfv,priority:2;index;size:32;not null"`
	FieldValue string `json:"field_value" gorm:"index:idx_opp_rfv,priority:3;size:255;not null"`
}

func (OpportunityField) TableName() string { return "opportunity_field" }

type OpportunityFieldBlob struct {
	ID         string `json:"id" gorm:"primaryKey;size:32"`
	ResourceID string `json:"resource_id" gorm:"index;size:32;not null"`
	FieldID    string `json:"field_id" gorm:"size:32;not null"`
	FieldValue string `json:"field_value" gorm:"type:text;not null"`
}

func (OpportunityFieldBlob) TableName() string { return "opportunity_field_blob" }

// ContractField 合同自定义字段值。
type ContractField struct {
	ID         string `json:"id" gorm:"primaryKey;size:32"`
	// 合同ID
	ResourceID string `json:"resource_id" gorm:"index:idx_c_rfv,priority:1;size:32;not null;comment:合同ID"`
	FieldID    string `json:"field_id" gorm:"index:idx_c_rfv,priority:2;index;size:32;not null"`
	FieldValue string `json:"field_value" gorm:"index:idx_c_rfv,priority:3;size:255;not null"`
}

func (ContractField) TableName() string { return "contract_field" }

type ContractFieldBlob struct {
	ID         string `json:"id" gorm:"primaryKey;size:32"`
	ResourceID string `json:"resource_id" gorm:"index;size:32;not null"`
	FieldID    string `json:"field_id" gorm:"size:32;not null"`
	FieldValue string `json:"field_value" gorm:"type:text;not null"`
}

func (ContractFieldBlob) TableName() string { return "contract_field_blob" }

// ProductField 产品自定义字段值。
type ProductField struct {
	ID         string `json:"id" gorm:"primaryKey;size:32"`
	// 产品ID
	ResourceID string `json:"resource_id" gorm:"index:idx_p_rfv,priority:1;size:32;not null;comment:产品ID"`
	FieldID    string `json:"field_id" gorm:"index:idx_p_rfv,priority:2;index;size:32;not null"`
	FieldValue string `json:"field_value" gorm:"index:idx_p_rfv,priority:3;size:255;not null"`
}

func (ProductField) TableName() string { return "product_field" }

type ProductFieldBlob struct {
	ID         string `json:"id" gorm:"primaryKey;size:32"`
	ResourceID string `json:"resource_id" gorm:"index;size:32;not null"`
	FieldID    string `json:"field_id" gorm:"size:32;not null"`
	FieldValue string `json:"field_value" gorm:"type:text;not null"`
}

func (ProductFieldBlob) TableName() string { return "product_field_blob" }

// FollowUpRecordField 跟进记录自定义字段值。
type FollowUpRecordField struct {
	ID         string `json:"id" gorm:"primaryKey;size:32"`
	// 跟进记录ID
	ResourceID string `json:"resource_id" gorm:"index:idx_f_rfv,priority:1;size:32;not null;comment:跟进记录ID"`
	FieldID    string `json:"field_id" gorm:"index:idx_f_rfv,priority:2;index;size:32;not null"`
	FieldValue string `json:"field_value" gorm:"index:idx_f_rfv,priority:3;size:255;not null"`
}

func (FollowUpRecordField) TableName() string { return "follow_up_record_field" }

type FollowUpRecordFieldBlob struct {
	ID         string `json:"id" gorm:"primaryKey;size:32"`
	ResourceID string `json:"resource_id" gorm:"index;size:32;not null"`
	FieldID    string `json:"field_id" gorm:"size:32;not null"`
	FieldValue string `json:"field_value" gorm:"type:text;not null"`
}

func (FollowUpRecordFieldBlob) TableName() string { return "follow_up_record_field_blob" }

// LeadField 线索自定义字段值(单值)。
type LeadField struct {
	ID         string `json:"id" gorm:"primaryKey;size:32"`
	// 线索ID
	ResourceID string `json:"resource_id" gorm:"index:idx_lead_rfv,priority:1;size:32;not null;comment:线索ID"`
	// 字段ID
	FieldID    string `json:"field_id" gorm:"index:idx_lead_rfv,priority:2;index;size:32;not null;comment:字段ID"`
	// 字段值
	FieldValue string `json:"field_value" gorm:"index:idx_lead_rfv,priority:3;size:255;not null;comment:字段值"`
}

func (LeadField) TableName() string { return "lead_field" }

// LeadFieldBlob 线索自定义字段大值。
type LeadFieldBlob struct {
	ID         string `json:"id" gorm:"primaryKey;size:32"`
	ResourceID string `json:"resource_id" gorm:"index;size:32;not null"`
	FieldID    string `json:"field_id" gorm:"size:32;not null"`
	FieldValue string `json:"field_value" gorm:"type:text;not null"`
}

func (LeadFieldBlob) TableName() string { return "lead_field_blob" }
