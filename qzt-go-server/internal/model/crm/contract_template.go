package crm

import (
	"qzt-go-server/internal/model/base"
)

// contract_template.go 合同模板（正文套打）。
// 存「带 ${变量} 占位符的 Markdown 正文」，打印合同时后端用合同实际数据替换变量。
// 配置类资源：不走数据权限，不接审批。

type ContractTemplate struct {
	ID      uint   `json:"id" gorm:"primaryKey"`
	Name    string `json:"name" gorm:"size:255;not null;comment:模板名称"`
	Content string `json:"content" gorm:"type:longtext;not null;comment:Markdown正文(含变量占位符)"`
	Remark  string `json:"remark" gorm:"size:500;comment:说明"`
	Enabled int8   `json:"enabled" gorm:"not null;default:1;comment:1启用 0停用"`
	OwnerID *uint  `json:"owner_id" gorm:"comment:创建人"`
	base.BaseModel
}

func (ContractTemplate) TableName() string { return "crm_contract_template" }
