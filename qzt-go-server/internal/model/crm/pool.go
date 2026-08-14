package crm

import (
	"qzt-go-server/internal/model/base"
)

// pool.go 客户公海池子系统:配置 + 领取规则 + 回收规则 + 隐藏字段 + 归属历史。
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
	// 公海名称
	Name         string `json:"name" gorm:"size:100;not null;comment:公海名称"`
	// 可见部门ID集合(JSON数组)
	ScopeDeptIDs string `json:"scope_dept_ids" gorm:"type:text;comment:可见部门ID集合(JSON数组)"`
	// 可见角色ID集合(JSON数组)
	ScopeRoleIDs string `json:"scope_role_ids" gorm:"type:text;comment:可见角色ID集合(JSON数组)"`
	// 管理员用户ID集合(JSON数组)
	AdminUserIDs string `json:"admin_user_ids" gorm:"type:text;comment:管理员用户ID集合(JSON数组)"`
	// 1启用 0禁用
	Enabled      int8   `json:"enabled" gorm:"index;comment:1启用 0禁用"`
	// 1开启自动回收 0关闭
	AutoRecycle  int8   `json:"auto_recycle" gorm:"comment:1开启自动回收 0关闭"`
	// 是否默认池(不可删)
	IsDefault    int8   `json:"is_default" gorm:"default:0;comment:是否默认池(不可删)"`
	base.BaseModel
}

func (CrmCustomerPool) TableName() string { return "crm_customer_pool" }

// CrmCustomerPoolHiddenField 公海隐藏字段(复合主键 pool_id + field_id)。
type CrmCustomerPoolHiddenField struct {
	PoolID  uint   `json:"pool_id" gorm:"primaryKey"`
	// 自定义字段ID
	FieldID string `json:"field_id" gorm:"primaryKey;size:32;comment:自定义字段ID"`
}

func (CrmCustomerPoolHiddenField) TableName() string { return "crm_customer_pool_hidden_field" }

// CrmCustomerPoolPickRule 领取规则(1:1 with pool,pool_id 主键)。
type CrmCustomerPoolPickRule struct {
	PoolID            uint  `json:"pool_id" gorm:"primaryKey"`
	// 1限制每日领取数
	LimitDaily        int8  `json:"limit_daily" gorm:"default:0;comment:1限制每日领取数"`
	// 每日领取上限
	DailyLimit        int   `json:"daily_limit" gorm:"default:0;comment:每日领取上限"`
	// 1限制前归属人领取
	LimitPrevOwner    int8  `json:"limit_prev_owner" gorm:"default:0;comment:1限制前归属人领取"`
	// 前归属人重新领取间隔天数
	PrevOwnerInterval int   `json:"prev_owner_interval" gorm:"default:0;comment:前归属人重新领取间隔天数"`
	// 1限制新数据冷却期
	LimitNewData      int8  `json:"limit_new_data" gorm:"default:0;comment:1限制新数据冷却期"`
	// 新数据冷却天数
	NewDataInterval   int   `json:"new_data_interval" gorm:"default:0;comment:新数据冷却天数"`
}

func (CrmCustomerPoolPickRule) TableName() string { return "crm_customer_pool_pick_rule" }

// CrmCustomerPoolRecycleRule 回收规则(1:1 with pool)。conditions 为 JSON 数组,见 RecycleCondition。
type CrmCustomerPoolRecycleRule struct {
	PoolID     uint   `json:"pool_id" gorm:"primaryKey"`
	// 多条件组合 AND/OR
	Operator   string `json:"operator" gorm:"size:3;default:AND;comment:多条件组合 AND/OR"`
	// 回收条件JSON数组
	Conditions string `json:"conditions" gorm:"type:text;comment:回收条件JSON数组"`
}

func (CrmCustomerPoolRecycleRule) TableName() string { return "crm_customer_pool_recycle_rule" }

// CrmCustomerOwnerHistory 客户归属变更历史(追加写,不软删除)。
type CrmCustomerOwnerHistory struct {
	ID         uint   `json:"id" gorm:"primaryKey"`
	// 客户ID
	CustomerID uint   `json:"customer_id" gorm:"index;not null;comment:客户ID"`
	// 当时的负责人(进公海时NULL)
	OwnerID    *uint  `json:"owner_id" gorm:"index;comment:当时的负责人(进公海时NULL)"`
	// TAKE/RELEASE/TRANSFER/RECYCLE
	Action     string `json:"action" gorm:"size:20;index;not null;comment:TAKE/RELEASE/TRANSFER/RECYCLE"`
	// 操作人
	OperatorID uint   `json:"operator_id" gorm:"not null;comment:操作人"`
	// 原因
	Reason     string `json:"reason" gorm:"size:100;comment:原因"`
	base.BaseModel
}

func (CrmCustomerOwnerHistory) TableName() string { return "crm_customer_owner_history" }
