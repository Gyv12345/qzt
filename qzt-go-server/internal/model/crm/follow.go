package crm

import (
	"qzt-go-server/internal/model/base"
	"qzt-go-server/pkg/xtime"
)

// follow.go 跟进记录 + 跟进计划(平台共享,客户/商机/合同/联系人均可关联)。

// 跟进类型。
const (
	FollowTypeWechat = "WECHAT"
	FollowTypePhone  = "PHONE"
	FollowTypeVisit  = "VISIT"
	FollowTypeEmail  = "EMAIL"
	FollowTypeOther  = "OTHER"
)

// 跟进计划状态。
const (
	PlanStatusTodo     int8 = 0 // 待办
	PlanStatusDone     int8 = 1 // 已转记录
	PlanStatusSkipped  int8 = 2 // 已跳过
)

// FollowUpRecord 跟进记录。customer/opportunity/clue/contact/contract 五选一关联(至少一个)。
type FollowUpRecord struct {
	ID            uint       `json:"id" gorm:"primaryKey"`
	Type          string     `json:"type" gorm:"size:32;not null;comment:跟进类型(WECHAT/PHONE/VISIT/EMAIL/OTHER)"`
	Content       string     `json:"content" gorm:"type:text;not null;comment:跟进内容"`
	FollowTime    xtime.DateTime  `json:"follow_time" gorm:"type:datetime;not null;comment:跟进发生时间"`
	OwnerID       uint       `json:"owner_id" gorm:"index;not null;comment:负责人"`
	CustomerID    *uint      `json:"customer_id" gorm:"index;comment:关联客户"`
	OpportunityID *uint      `json:"opportunity_id" gorm:"index;comment:关联商机"`
	ContactID     *uint      `json:"contact_id" gorm:"index;comment:关联联系人"`
	ContractID    *uint      `json:"contract_id" gorm:"index;comment:关联合同"`
	PlanID        *uint      `json:"plan_id" gorm:"index;comment:来源计划(计划转记录时填)"`
	base.BaseModel
}

func (FollowUpRecord) TableName() string { return "follow_up_record" }

// FollowUpPlan 跟进计划/待办。
type FollowUpPlan struct {
	ID            uint       `json:"id" gorm:"primaryKey"`
	Type          string     `json:"type" gorm:"size:32;not null;comment:计划类型"`
	Content       string     `json:"content" gorm:"type:text;not null;comment:计划内容"`
	PlanTime      xtime.DateTime     `json:"plan_time" gorm:"type:datetime;not null;comment:计划跟进时间"`
	RemindTime    xtime.NullDateTime `json:"remind_time" gorm:"type:datetime;comment:提醒时间(早于plan_time)"`
	OwnerID       uint       `json:"owner_id" gorm:"index;not null;comment:负责人"`
	CustomerID    *uint      `json:"customer_id" gorm:"index;comment:关联客户"`
	OpportunityID *uint      `json:"opportunity_id" gorm:"index;comment:关联商机"`
	ContactID     *uint      `json:"contact_id" gorm:"index;comment:关联联系人"`
	ContractID    *uint      `json:"contract_id" gorm:"index;comment:关联合同"`
	Status        int8       `json:"status" gorm:"default:0;comment:0待办 1已转记录 2已跳过"`
	Reminded      int8       `json:"reminded" gorm:"default:0;comment:是否已发提醒"`
	RecordID      *uint      `json:"record_id" gorm:"comment:转入的记录ID"`
	base.BaseModel
}

func (FollowUpPlan) TableName() string { return "follow_up_plan" }
