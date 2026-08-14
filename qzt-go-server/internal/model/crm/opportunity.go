package crm

import (
	"github.com/shopspring/decimal"

	"qzt-go-server/internal/model/base"
	"qzt-go-server/pkg/xtime"
)

// opportunity.go CRM 商机。

// 商机阶段(字典 OPPORTUNITY_STAGE,此处为默认值常量)。
const (
	OppStageProspecting  = "PROSPECTING" // 初步接触
	OppStageAnalysis     = "ANALYSIS"    // 需求分析
	OppStageProposal     = "PROPOSAL"    // 方案报价
	OppStageNegotiation  = "NEGOTIATION" // 谈判
	OppStageWon          = "WON"         // 已成交
	OppStageLost         = "LOST"        // 已丢失
)

// CrmOpportunity CRM 商机。必须关联客户(customerId 必填)。
type CrmOpportunity struct {
	ID                uint           `json:"id" gorm:"primaryKey"`
	// 商机名称
	Name              string         `json:"name" gorm:"size:255;not null;comment:商机名称"`
	// 商机编号
	OpportunityNo     string         `json:"opportunity_no" gorm:"size:64;comment:商机编号"`
	// 关联客户ID
	CustomerID        uint           `json:"customer_id" gorm:"index:idx_opp_customer;not null;comment:关联客户ID"`
	// 预计金额
	ExpectedAmount    decimal.Decimal `json:"expected_amount" gorm:"type:decimal(14,2);comment:预计金额"`
	// 预计成交日期
	ExpectedCloseDate xtime.NullDateTime `json:"expected_close_date" gorm:"type:date;comment:预计成交日期"`
	// 阶段(字典OPPORTUNITY_STAGE)
	Stage             string         `json:"stage" gorm:"size:32;index:idx_opp_stage;default:PROSPECTING;not null;comment:阶段(字典OPPORTUNITY_STAGE)"`
	// 成交概率0-100
	Probability       *int           `json:"probability" gorm:"comment:成交概率0-100"`
	// 负责人
	OwnerID           *uint          `json:"owner_id" gorm:"index:idx_opp_owner;comment:负责人"`
	// 最新跟进人
	FollowerID        *uint          `json:"follower_id" gorm:"comment:最新跟进人"`
	// 最新跟进时间
	FollowTime        xtime.NullDateTime `json:"follow_time" gorm:"type:datetime;comment:最新跟进时间"`
	// 来源线索ID
	SourceClueID      *uint          `json:"source_clue_id" gorm:"comment:来源线索ID"`
	// 描述
	Description       string         `json:"description" gorm:"type:text;comment:描述"`
	base.BaseModel
}

func (CrmOpportunity) TableName() string { return "crm_opportunity" }
