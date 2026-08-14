package crm

import (
	"qzt-go-server/internal/model/base"
	"qzt-go-server/pkg/xtime"
)

// customer.go CRM 客户 + 联系人 + 团队协作。
// 扩展字段(地址/电话/邮箱等)走自定义字段引擎(customer_field/customer_field_blob),不在此表建列。

// 客户状态。
const (
	CustomerStatusNormal  int8 = 1 // 正常
	CustomerStatusFrozen  int8 = 2 // 冻结
	CustomerStatusLost    int8 = 3 // 流失
)

// 是否在公海。
const (
	InPoolPrivate int8 = 0 // 私海
	InPoolPublic  int8 = 1 // 公海
)

// CrmCustomer CRM 客户。ownerId 为空表示在公海。
type CrmCustomer struct {
	ID             uint       `json:"id" gorm:"primaryKey"`
	// 客户名称
	Name           string     `json:"name" gorm:"size:255;not null;comment:客户名称"`
	// 客户编号
	CustomerNo     string     `json:"customer_no" gorm:"size:64;comment:客户编号"`
	// 客户级别(字典CUSTOMER_LEVEL)
	Level          string     `json:"level" gorm:"size:32;index;comment:客户级别(字典CUSTOMER_LEVEL)"`
	// 客户来源(字典CUSTOMER_SOURCE)
	Source         string     `json:"source" gorm:"size:32;comment:客户来源(字典CUSTOMER_SOURCE)"`
	// 1正常 2冻结 3流失
	Status         int8       `json:"status" gorm:"default:1;comment:1正常 2冻结 3流失"`
	// 行业(字典INDUSTRY)
	Industry       string     `json:"industry" gorm:"size:64;index;comment:行业(字典INDUSTRY)"`
	// 负责人ID(公海时NULL)
	OwnerID        *uint      `json:"owner_id" gorm:"index:idx_owner;comment:负责人ID(公海时NULL)"`
	// 最新跟进人ID
	FollowerID     *uint      `json:"follower_id" gorm:"comment:最新跟进人ID"`
	// 最新跟进时间
	FollowTime     xtime.NullDateTime `json:"follow_time" gorm:"type:datetime;comment:最新跟进时间"`
	// 0私海 1公海
	InPool         int8       `json:"in_pool" gorm:"default:0;index:idx_pool;comment:0私海 1公海"`
	// 公海ID
	PoolID         *uint      `json:"pool_id" gorm:"index:idx_pool;comment:公海ID"`
	// 领取时间
	CollectionTime xtime.NullDateTime `json:"collection_time" gorm:"type:datetime;comment:领取时间"`
	// 进公海原因
	PoolReason     string     `json:"pool_reason" gorm:"size:64;comment:进公海原因"`
	base.BaseModel
}

func (CrmCustomer) TableName() string { return "crm_customer" }

// CrmCustomerContact 客户联系人。
type CrmCustomerContact struct {
	ID                 uint   `json:"id" gorm:"primaryKey"`
	// 客户ID
	CustomerID         uint   `json:"customer_id" gorm:"index:idx_customer;not null;comment:客户ID"`
	// 联系人姓名
	Name               string `json:"name" gorm:"size:255;not null;comment:联系人姓名"`
	// 联系人编号
	ContactNo          string `json:"contact_no" gorm:"size:64;comment:联系人编号"`
	// 电话
	Phone              string `json:"phone" gorm:"size:30;comment:电话"`
	// 邮箱
	Email              string `json:"email" gorm:"size:100;comment:邮箱"`
	// 职务
	Position           string `json:"position" gorm:"size:100;comment:职务"`
	// 部门
	Department         string `json:"department" gorm:"size:100;comment:部门"`
	// 0否 1是关键决策人
	IsKeyDecisionMaker int8   `json:"is_key_decision_maker" gorm:"default:0;comment:0否 1是关键决策人"`
	// 1正常 2停用
	Status             int8   `json:"status" gorm:"default:1;comment:1正常 2停用"`
	Remark             string `json:"remark" gorm:"size:500"`
	base.BaseModel
}

func (CrmCustomerContact) TableName() string { return "crm_customer_contact" }

// 协作类型。
const (
	CollaborationReadOnly     = "READ_ONLY"
	CollaborationCollaboration = "COLLABORATION"
)

// CrmCustomerCollaboration 客户团队协作成员。
type CrmCustomerCollaboration struct {
	ID               uint   `json:"id" gorm:"primaryKey"`
	// 客户ID
	CustomerID       uint   `json:"customer_id" gorm:"uniqueIndex:uk_customer_user;not null;comment:客户ID"`
	// 协作人ID
	UserID           uint   `json:"user_id" gorm:"uniqueIndex:uk_customer_user;index;not null;comment:协作人ID"`
	// READ_ONLY只读/COLLABORATION协作
	CollaborationType string `json:"collaboration_type" gorm:"size:20;not null;comment:READ_ONLY只读/COLLABORATION协作"`
	base.BaseModel
}

func (CrmCustomerCollaboration) TableName() string { return "crm_customer_collaboration" }
