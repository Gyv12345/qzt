package marketing

import (
	"qzt-go-server/pkg/xtime"
)

// lead_log.go 营销线索同步日志(marketing_lead_log)。
//
// 追加写、不软删。uk(account_id, external_id) 是幂等核心:
// 同一外部线索(飞鱼 clue_id)在同一账号下永远只落库一次。

// 同步状态。
const (
	LogStatusInserted int8 = 1 // 已入库(成功创建 crm_lead)
	LogStatusDup      int8 = 2 // 重复跳过(手机号已存在于 crm_lead)
	LogStatusFailed   int8 = 3 // 失败(见 detail)
)

// MarketingLeadLog 营销线索同步日志。
type MarketingLeadLog struct {
	ID         uint   `json:"id" gorm:"primaryKey"`
	AccountID  uint   `json:"account_id" gorm:"not null;uniqueIndex:uk_marketing_lead_log_ext,priority:1;comment:渠道账号ID"`
	ExternalID string `json:"external_id" gorm:"size:64;not null;uniqueIndex:uk_marketing_lead_log_ext,priority:2;comment:外部线索ID(飞鱼clue_id)"`
	// 入库后的 crm_lead.id(重复/失败为 NULL)
	LeadID  *uint  `json:"lead_id" gorm:"comment:入库后的crm_lead.id"`
	Name    string `json:"name" gorm:"size:255;comment:姓名"`
	Phone   string `json:"phone" gorm:"size:30;index;comment:手机号(可能是虚拟号)"`
	Company string `json:"company" gorm:"size:255;comment:公司"`
	// 广告计划名称
	CampaignName string `json:"campaign_name" gorm:"size:255;comment:广告计划名称"`
	// 广告名称
	AdName string `json:"ad_name" gorm:"size:255;comment:广告名称"`
	// 留资时间
	LeadCreateTime *xtime.DateTime `json:"lead_create_time" gorm:"comment:留资时间"`
	// 同步状态(1已入库 2重复跳过 3失败)
	Status int8 `json:"status" gorm:"not null;index;comment:同步状态"`
	// 说明(重复/失败原因)
	Detail string `json:"detail" gorm:"size:255;comment:说明"`
	// 原始报文(排查用)
	Raw string `json:"-" gorm:"type:json;comment:原始报文"`
	// 追加写日志,只记创建时间(无 updated_at/deleted_at)
	CreatedAt xtime.DateTime `json:"created_at" gorm:"index;autoCreateTime"`
}

func (MarketingLeadLog) TableName() string { return "marketing_lead_log" }
