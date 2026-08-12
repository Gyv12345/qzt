package crm

import (
	"qzt-go-server/internal/model/base"
	"qzt-go-server/pkg/xtime"
)

// lead.go CRM 线索 + 线索公海池。
// 线索是客户的前置阶段:来源更轻(联系人/电话/邮箱/公司直接建列),转化后生成客户。
// 线索公海镜像客户公海(in_pool/owner_id 生命周期 + 领取/回收规则),复用 recycle_evaluator 引擎。

// 线索状态。
const (
	LeadStatusNew       int8 = 1 // 新建
	LeadStatusFollowing int8 = 2 // 跟进中
	LeadStatusConverted int8 = 3 // 已转化(已转为客户)
	LeadStatusInvalid   int8 = 4 // 无效
)

// CrmLead CRM 线索。OwnerID 为空表示在线索公海。
type CrmLead struct {
	ID                 uint               `json:"id" gorm:"primaryKey"`
	Name               string             `json:"name" gorm:"size:255;not null;comment:线索名称"`
	LeadNo             string             `json:"lead_no" gorm:"size:64;comment:线索编号"`
	ContactName        string             `json:"contact_name" gorm:"size:255;comment:联系人姓名"`
	Phone              string             `json:"phone" gorm:"size:30;comment:电话"`
	Email              string             `json:"email" gorm:"size:100;comment:邮箱"`
	Company            string             `json:"company" gorm:"size:255;comment:公司"`
	Level              string             `json:"level" gorm:"size:32;index;comment:线索级别(字典LEAD_LEVEL)"`
	Source             string             `json:"source" gorm:"size:32;comment:线索来源(字典LEAD_SOURCE)"`
	Status             int8               `json:"status" gorm:"default:1;comment:1新建 2跟进中 3已转化 4无效"`
	Industry           string             `json:"industry" gorm:"size:64;index;comment:行业(字典INDUSTRY)"`
	OwnerID            *uint              `json:"owner_id" gorm:"index:idx_lead_owner;comment:负责人ID(公海时NULL)"`
	FollowerID         *uint              `json:"follower_id" gorm:"comment:最新跟进人ID"`
	FollowTime         xtime.NullDateTime `json:"follow_time" gorm:"type:datetime;comment:最新跟进时间"`
	InPool             int8               `json:"in_pool" gorm:"default:0;index:idx_lead_pool;comment:0私海 1公海"`
	PoolID             *uint              `json:"pool_id" gorm:"index:idx_lead_pool;comment:线索公海ID"`
	CollectionTime     xtime.NullDateTime `json:"collection_time" gorm:"type:datetime;comment:领取时间"`
	PoolReason         string             `json:"pool_reason" gorm:"size:64;comment:进公海原因"`
	ConvertedCustomerID *uint             `json:"converted_customer_id" gorm:"index;comment:转化后的客户ID"`
	ConvertedAt        xtime.NullDateTime `json:"converted_at" gorm:"type:datetime;comment:转化时间"`
	Remark             string             `json:"remark" gorm:"type:text;comment:留言内容(官网表单)"`
	base.BaseModel
}

func (CrmLead) TableName() string { return "crm_lead" }

// ── 线索公海池(镜像 CrmCustomerPool) ──

// CrmLeadPool 线索公海池配置。
type CrmLeadPool struct {
	ID           uint   `json:"id" gorm:"primaryKey"`
	Name         string `json:"name" gorm:"size:100;not null;comment:公海名称"`
	ScopeDeptIDs string `json:"scope_dept_ids" gorm:"type:text;comment:可见部门ID集合(JSON数组)"`
	ScopeRoleIDs string `json:"scope_role_ids" gorm:"type:text;comment:可见角色ID集合(JSON数组)"`
	AdminUserIDs string `json:"admin_user_ids" gorm:"type:text;comment:管理员用户ID集合(JSON数组)"`
	Enabled      int8   `json:"enabled" gorm:"index;comment:1启用 0禁用"`
	AutoRecycle  int8   `json:"auto_recycle" gorm:"comment:1开启自动回收 0关闭"`
	IsDefault    int8   `json:"is_default" gorm:"default:0;comment:是否默认池(不可删)"`
	base.BaseModel
}

func (CrmLeadPool) TableName() string { return "crm_lead_pool" }

// CrmLeadPoolPickRule 线索领取规则(1:1 with pool,pool_id 主键)。
type CrmLeadPoolPickRule struct {
	PoolID            uint  `json:"pool_id" gorm:"primaryKey"`
	LimitDaily        int8  `json:"limit_daily" gorm:"default:0;comment:1限制每日领取数"`
	DailyLimit        int   `json:"daily_limit" gorm:"default:0;comment:每日领取上限"`
	LimitPrevOwner    int8  `json:"limit_prev_owner" gorm:"default:0;comment:1限制前归属人领取"`
	PrevOwnerInterval int   `json:"prev_owner_interval" gorm:"default:0;comment:前归属人重新领取间隔天数"`
	LimitNewData      int8  `json:"limit_new_data" gorm:"default:0;comment:1限制新数据冷却期"`
	NewDataInterval   int   `json:"new_data_interval" gorm:"default:0;comment:新数据冷却天数"`
}

func (CrmLeadPoolPickRule) TableName() string { return "crm_lead_pool_pick_rule" }

// CrmLeadPoolRecycleRule 线索回收规则(1:1 with pool)。conditions 为 JSON 数组,复用 RecycleCondition。
type CrmLeadPoolRecycleRule struct {
	PoolID     uint   `json:"pool_id" gorm:"primaryKey"`
	Operator   string `json:"operator" gorm:"size:3;default:AND;comment:多条件组合 AND/OR"`
	Conditions string `json:"conditions" gorm:"type:text;comment:回收条件JSON数组"`
}

func (CrmLeadPoolRecycleRule) TableName() string { return "crm_lead_pool_recycle_rule" }

// CrmLeadOwnerHistory 线索归属变更历史(追加写,不软删除)。
type CrmLeadOwnerHistory struct {
	ID         uint   `json:"id" gorm:"primaryKey"`
	LeadID     uint   `json:"lead_id" gorm:"index;not null;comment:线索ID"`
	OwnerID    *uint  `json:"owner_id" gorm:"index;comment:当时的负责人(进公海时NULL)"`
	Action     string `json:"action" gorm:"size:20;index;not null;comment:TAKE/RELEASE/TRANSFER/RECYCLE"`
	OperatorID uint   `json:"operator_id" gorm:"not null;comment:操作人"`
	Reason     string `json:"reason" gorm:"size:100;comment:原因"`
	base.BaseModel
}

func (CrmLeadOwnerHistory) TableName() string { return "crm_lead_owner_history" }
