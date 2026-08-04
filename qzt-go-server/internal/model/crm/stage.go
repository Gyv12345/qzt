package crm

// stage.go 阶段配置 + 阶段变更记录(商机/合同通用)。

// 业务类型(阶段配置适用)。
const (
	StageBizOpportunity = "OPPORTUNITY"
	StageBizContract     = "CONTRACT"
)

// StageConfig 阶段配置。stages_json 为 [{key,label,color,sort,probability}] 的 JSON 数组。
type StageConfig struct {
	ID         uint   `json:"id" gorm:"primaryKey"`
	BizType    string `json:"biz_type" gorm:"size:32;uniqueIndex;not null;comment:业务类型(OPPORTUNITY/CONTRACT)"`
	Name       string `json:"name" gorm:"size:100;not null;comment:配置名称"`
	StagesJSON string `json:"stages_json" gorm:"type:text;not null;comment:阶段数组JSON"`
	Enabled    int8   `json:"enabled" gorm:"default:1"`
}

func (StageConfig) TableName() string { return "stage_config" }

// StageRecord 阶段变更记录(追加写,不软删除)。
type StageRecord struct {
	ID         uint   `json:"id" gorm:"primaryKey"`
	BizType    string `json:"biz_type" gorm:"size:32;index;not null;comment:业务类型"`
	ResourceID uint   `json:"resource_id" gorm:"index;not null;comment:资源ID(商机/合同ID)"`
	FromStage  string `json:"from_stage" gorm:"size:32;comment:原阶段(首次进入为空)"`
	ToStage    string `json:"to_stage" gorm:"size:32;not null;comment:新阶段"`
	OperatorID uint   `json:"operator_id" gorm:"not null;comment:操作人"`
	Reason     string `json:"reason" gorm:"size:200;comment:原因"`
}

func (StageRecord) TableName() string { return "stage_record" }
