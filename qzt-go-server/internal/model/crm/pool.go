package crm

import (
	"qzt-go-server/internal/model/base"
)

// pool.go 客户公海池子系统:配置 + 领取规则 + 回收规则 + 隐藏字段 + 容量 + 归属历史。
// 回收规则引擎见 module/crm/pool/recycle_evaluator.go。

// 公海归属历史动作。
const (
	OwnerActionTake     = "TAKE"     // 领取
	OwnerActionRelease  = "RELEASE"  // 退回
	OwnerActionTransfer = "TRANSFER" // 转移
	OwnerActionRecycle  = "RECYCLE"  // 自动回收
)

// CrmCustomerPool 公海池配置。
type CrmCustomerPool struct {
	ID           uint   `json:"id" gorm:"primaryKey"`
	Name         string `json:"name" gorm:"size:100;not null;comment:公海名称"`
	ScopeDeptIDs string `json:"scope_dept_ids" gorm:"type:text;comment:可见部门ID集合(JSON数组)"`
	ScopeRoleIDs string `json:"scope_role_ids" gorm:"type:text;comment:可见角色ID集合(JSON数组)"`
	AdminUserIDs string `json:"admin_user_ids" gorm:"type:text;comment:管理员用户ID集合(JSON数组)"`
	Enabled      int8   `json:"enabled" gorm:"index;comment:1启用 0禁用"`
	AutoRecycle  int8   `json:"auto_recycle" gorm:"comment:1开启自动回收 0关闭"`
	base.BaseModel
}

func (CrmCustomerPool) TableName() string { return "crm_customer_pool" }

// CrmCustomerPoolHiddenField 公海隐藏字段(复合主键 pool_id + field_id)。
type CrmCustomerPoolHiddenField struct {
	PoolID  uint   `json:"pool_id" gorm:"primaryKey"`
	FieldID string `json:"field_id" gorm:"primaryKey;size:32;comment:自定义字段ID"`
}

func (CrmCustomerPoolHiddenField) TableName() string { return "crm_customer_pool_hidden_field" }

// CrmCustomerPoolPickRule 领取规则(1:1 with pool,pool_id 主键)。
type CrmCustomerPoolPickRule struct {
	PoolID            uint  `json:"pool_id" gorm:"primaryKey"`
	LimitDaily        int8  `json:"limit_daily" gorm:"default:0;comment:1限制每日领取数"`
	DailyLimit        int   `json:"daily_limit" gorm:"default:0;comment:每日领取上限"`
	LimitPrevOwner    int8  `json:"limit_prev_owner" gorm:"default:0;comment:1限制前归属人领取"`
	PrevOwnerInterval int   `json:"prev_owner_interval" gorm:"default:0;comment:前归属人重新领取间隔天数"`
	LimitNewData      int8  `json:"limit_new_data" gorm:"default:0;comment:1限制新数据冷却期"`
	NewDataInterval   int   `json:"new_data_interval" gorm:"default:0;comment:新数据冷却天数"`
}

func (CrmCustomerPoolPickRule) TableName() string { return "crm_customer_pool_pick_rule" }

// CrmCustomerPoolRecycleRule 回收规则(1:1 with pool)。conditions 为 JSON 数组,见 RecycleCondition。
type CrmCustomerPoolRecycleRule struct {
	PoolID     uint   `json:"pool_id" gorm:"primaryKey"`
	Operator   string `json:"operator" gorm:"size:3;default:AND;comment:多条件组合 AND/OR"`
	Conditions string `json:"conditions" gorm:"type:text;comment:回收条件JSON数组"`
}

func (CrmCustomerPoolRecycleRule) TableName() string { return "crm_customer_pool_recycle_rule" }

// CrmCustomerCapacity 客户容量配置(限制每人可拥有的私海客户数)。
type CrmCustomerCapacity struct {
	ID           uint   `json:"id" gorm:"primaryKey"`
	ScopeDeptIDs string `json:"scope_dept_ids" gorm:"type:text;comment:适用部门ID集合(JSON)"`
	ScopeRoleIDs string `json:"scope_role_ids" gorm:"type:text;comment:适用角色ID集合(JSON)"`
	Capacity     *int   `json:"capacity" gorm:"comment:容量上限(NULL不限)"`
	Filter       string `json:"filter" gorm:"type:text;comment:不计入容量的过滤条件(JSON)"`
	Enabled      int8   `json:"enabled" gorm:"comment:1启用 0禁用"`
	base.BaseModel
}

func (CrmCustomerCapacity) TableName() string { return "crm_customer_capacity" }

// CrmCustomerOwnerHistory 客户归属变更历史(追加写,不软删除)。
type CrmCustomerOwnerHistory struct {
	ID         uint   `json:"id" gorm:"primaryKey"`
	CustomerID uint   `json:"customer_id" gorm:"index;not null;comment:客户ID"`
	OwnerID    *uint  `json:"owner_id" gorm:"index;comment:当时的负责人(进公海时NULL)"`
	Action     string `json:"action" gorm:"size:20;index;not null;comment:TAKE/RELEASE/TRANSFER/RECYCLE"`
	OperatorID uint   `json:"operator_id" gorm:"not null;comment:操作人"`
	Reason     string `json:"reason" gorm:"size:100;comment:原因"`
	base.BaseModel
}

func (CrmCustomerOwnerHistory) TableName() string { return "crm_customer_owner_history" }
