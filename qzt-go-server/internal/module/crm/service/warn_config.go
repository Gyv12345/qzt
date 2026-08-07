package service

// warn_config.go 跟进预警配置(只读视图) + sys_config 读取辅助。
// 阈值与开关存储在 sys_config(由 SQL 种子写入),本文件封装读取。

import (
	"context"
	"strconv"
	"strings"

	"qzt-go-server/internal/pkg/setting"
)

// WarnConfig 跟进预警配置。
type WarnConfig struct {
	WarnDaysCustomer    int  `json:"warn_days_customer"`    // 客户未跟进预警天数
	WarnDaysLead        int  `json:"warn_days_lead"`        // 线索未跟进预警天数
	WarnDaysOpportunity int  `json:"warn_days_opportunity"` // 商机未跟进预警天数
	RemindEnabled       bool `json:"remind_enabled"`        // 是否开启定时提醒
	AutoRecycleEnabled  bool `json:"auto_recycle_enabled"`  // 公海自动回收总开关
}

// LoadWarnConfig 从 sys_config 读取跟进预警配置。
func LoadWarnConfig(ctx context.Context) WarnConfig {
	return WarnConfig{
		WarnDaysCustomer:    cfgInt(ctx, "crm.followup.warn_days_customer", 15),
		WarnDaysLead:        cfgInt(ctx, "crm.followup.warn_days_lead", 7),
		WarnDaysOpportunity: cfgInt(ctx, "crm.followup.warn_days_opportunity", 15),
		RemindEnabled:       cfgBool(ctx, "crm.followup.remind_enabled", true),
		AutoRecycleEnabled:  cfgBool(ctx, "crm.pool.auto_recycle_enabled", true),
	}
}

// cfgBool 读取布尔配置,空值用 def(兼容 "1"/"0"/"true"/"false")。
func cfgBool(ctx context.Context, key string, def bool) bool {
	v := strings.TrimSpace(setting.Get(ctx, key))
	if v == "" {
		return def
	}
	if b, err := strconv.ParseBool(v); err == nil {
		return b
	}
	if v == "1" {
		return true
	}
	if v == "0" {
		return false
	}
	return def
}

// cfgInt 读取整数配置,空值/解析失败用 def。
func cfgInt(ctx context.Context, key string, def int) int {
	v := strings.TrimSpace(setting.Get(ctx, key))
	if v == "" {
		return def
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return def
	}
	return n
}
