// Package numbergen 业务编号生成器(公共包)。
//
// 规则可经 sys_config 热配置(读 setting.Get),未配置时用各模块注册的默认值,开箱即用。
//
// 配置 key 约定(number.{module}.{field}):
//
//	number.{module}.enabled      → "true"/"false"(默认 true)
//	number.{module}.prefix       → 编号前缀
//	number.{module}.date_format  → 日期段格式: "YYYYMMDD"(默认)/"YYYYMM"/""(无日期)
//	number.{module}.seq_width    → 序号位数,补零(默认 3)
//
// 生成的编号 = 前缀 + 日期段(可选) + 当日序号(补零)。
// 序号取 CountFunc 返回的「当前已存在、前缀+日期段相同的记录数」,再 +1。
//
// 用法:各业务模块在自己的 init() 里调用 Register 注册规则;
//
//	numbergen.Register("opportunity", numbergen.Rule{
//	    Prefix: "SJ", DateFormat: "YYYYMMDD", SeqWidth: 3,
//	    CountFunc: func(ctx context.Context) (int64, error) {
//	        var n int64
//	        err := repository.DBFrom(ctx).Model(&crmmodel.CrmOpportunity{}).
//	            Where("opportunity_no LIKE ?", "SJ"+time.Now().Format("20060102")+"%").
//	            Where("opportunity_no != ''").Count(&n).Error
//	        return n, err
//	    },
//	})
//
// 然后在 Create 里:
//
//	no, _ := numbergen.Generate(ctx, "opportunity")
package numbergen

import (
	"context"
	"fmt"
	"strconv"
	"strings"
	"sync"
	"time"

	"qzt-go-server/internal/pkg/setting"
)

// Rule 编号规则(默认值)。CountFunc 由各模块实现,返回当日同前缀已存在记录数。
type Rule struct {
	Enabled    bool
	Prefix     string
	DateFormat string // "YYYYMMDD" / "YYYYMM" / ""
	SeqWidth   int
	CountFunc  func(ctx context.Context, prefix, datePart string) (int64, error)
}

var (
	mu       sync.RWMutex
	defaults = make(map[string]Rule)
)

// Register 注册一个模块的编号规则(在 init() 中调用)。
func Register(module string, r Rule) {
	mu.Lock()
	defer mu.Unlock()
	defaults[module] = r
}

// Generate 按 module 规则生成编号。
// enabled=false 或未注册 → 返回空串(调用方不强制赋值)。
func Generate(ctx context.Context, module string) (string, error) {
	mu.RLock()
	def, ok := defaults[module]
	mu.RUnlock()
	if !ok {
		return "", nil // 未注册,不生成
	}

	// 读配置(读不到用默认值)
	enabled := def.Enabled
	if v := setting.Get(ctx, "number."+module+".enabled"); v != "" {
		enabled = strings.EqualFold(v, "true") || v == "1"
	}
	if !enabled {
		return "", nil
	}

	prefix := getConfig(ctx, module, "prefix", def.Prefix)
	dateFmt := getConfig(ctx, module, "date_format", def.DateFormat)
	seqWidth := def.SeqWidth
	if v := setting.Get(ctx, "number."+module+".seq_width"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			seqWidth = n
		}
	}

	// 日期段
	datePart := ""
	now := time.Now()
	switch strings.ToUpper(dateFmt) {
	case "YYYYMMDD":
		datePart = now.Format("20060102")
	case "YYYYMM":
		datePart = now.Format("200601")
	case "", "NONE":
		datePart = ""
	default:
		datePart = now.Format("20060102")
	}

	// 当日序号 = 已存在同前缀+日期段的记录数 + 1
	var count int64
	if def.CountFunc != nil {
		c, err := def.CountFunc(ctx, prefix, datePart)
		if err != nil {
			return "", fmt.Errorf("生成编号失败(计数): %w", err)
		}
		count = c
	}

	return fmt.Sprintf("%s%s%0*d", prefix, datePart, seqWidth, count+1), nil
}

func getConfig(ctx context.Context, module, field, fallback string) string {
	if v := setting.Get(ctx, "number."+module+"."+field); v != "" {
		return v
	}
	return fallback
}
