package pool

// recycle_evaluator.go 公海回收规则引擎(移植自 qztcrm 的 RecycleRuleEvaluator)。
// 纯函数、无状态:输入规则(AND/OR 组合 + 条件列表)与目标的时间字段,输出是否应回收。
// 设计原则:保守——空规则、解析失败、未知字段一律不回收(避免误删客户)。

import (
	"encoding/json"
	"strings"
	"time"
)

// TimeField 回收条件的时间字段。
type TimeField string

const (
	TimeLastFollowTime TimeField = "LAST_FOLLOW_TIME" // 最近跟进时间
	TimeStorageTime    TimeField = "STORAGE_TIME"     // 领取时间(入库时间)
)

// Operator 回收条件的运算符。
type Operator string

const (
	OpDynamic TimeOperator = "DYNAMIC" // N 天前(动态阈值)
	OpFixed   TimeOperator = "FIXED"   // 固定日期区间 [start,end]
)

// TimeOperator 别名,与 qztcrm 字段对齐。
type TimeOperator string

// 组合方式。
const (
	CombineAnd = "AND" // 所有条件都满足才回收
	CombineOr  = "OR"  // 任一条件满足即回收
)

// RecycleCondition 单条回收条件(对应 conditions JSON 数组的一项)。
type RecycleCondition struct {
	TimeField     TimeField     `json:"timeField"`               // LAST_FOLLOW_TIME / STORAGE_TIME
	Operator      TimeOperator  `json:"operator"`                // DYNAMIC / FIXED
	Value         string        `json:"value"`                   // DYNAMIC:天数;FIXED:"2026-01-01,2026-06-01"
	NullSatisfied bool          `json:"nullSatisfied,omitempty"` // 字段为空时是否视为满足(默认 false 保守不回收)
}

// Recyclable 被回收判定的目标(客户/线索实现此接口提供时间字段)。
type Recyclable interface {
	GetLastFollowTime() *time.Time // 最近跟进时间,nil 表示从未跟进
	GetStorageTime() *time.Time    // 领取时间(进私海时间),nil 表示未领取
}

// ShouldRecycle 判断目标是否应被回收。
//   - operator: AND(全部满足)/OR(任一满足),空值默认 AND。
//   - conditions: RecycleCondition 的 JSON 数组字符串。
//   - 空 conditions 或 JSON 解析失败 → 返回 false(不回收)。
//   - 单条件解析失败 → 跳过该条件(保守)。
func ShouldRecycle(combine, conditions string, target Recyclable, now time.Time) bool {
	if strings.TrimSpace(conditions) == "" {
		return false
	}
	var conds []RecycleCondition
	if err := json.Unmarshal([]byte(conditions), &conds); err != nil {
		return false
	}
	if len(conds) == 0 {
		return false
	}

	op := strings.ToUpper(strings.TrimSpace(combine))
	if op == "" {
		op = CombineAnd
	}

	for _, c := range conds {
		matched := evaluate(c, target, now)
		if op == CombineOr && matched {
			return true // OR:任一满足即回收
		}
		if op == CombineAnd && !matched {
			return false // AND:任一不满足即不回收
		}
	}
	// AND 走完全部都满足 → true;OR 走完全部都不满足 → false
	return op == CombineAnd
}

// evaluate 评估单条条件。
func evaluate(c RecycleCondition, target Recyclable, now time.Time) bool {
	var fieldTime *time.Time
	switch c.TimeField {
	case TimeLastFollowTime:
		fieldTime = target.GetLastFollowTime()
	case TimeStorageTime:
		fieldTime = target.GetStorageTime()
	default:
		return false // 未知字段保守不满足
	}

	if fieldTime == nil {
		return c.NullSatisfied // 默认 false:无跟进时间不回收
	}

	switch c.Operator {
	case OpDynamic:
		return evalDynamic(c.Value, *fieldTime, now)
	case OpFixed:
		return evalFixed(c.Value, *fieldTime)
	default:
		return false
	}
}

// evalDynamic 动态阈值:fieldTime <= now - N 天(即 N 天未跟进/未领取)。
func evalDynamic(value string, fieldTime, now time.Time) bool {
	days, err := atoiPositive(value)
	if err != nil {
		return false
	}
	threshold := now.AddDate(0, 0, -days)
	return !fieldTime.After(threshold) // fieldTime <= threshold
}

// evalFixed 固定区间:fieldTime 的日期落在 [start,end] 内(闭区间)。
func evalFixed(value string, fieldTime time.Time) bool {
	parts := strings.SplitN(value, ",", 2)
	if len(parts) != 2 {
		return false
	}
	start, err1 := time.ParseInLocation("2006-01-02", strings.TrimSpace(parts[0]), time.Local)
	end, err2 := time.ParseInLocation("2006-01-02", strings.TrimSpace(parts[1]), time.Local)
	if err1 != nil || err2 != nil {
		return false
	}
	end = end.Add(24*time.Hour - time.Second) // end 取当天 23:59:59
	day := time.Date(fieldTime.Year(), fieldTime.Month(), fieldTime.Day(), 0, 0, 0, 0, time.Local)
	return !day.Before(start) && !day.After(end)
}

// atoiPositive 解析正整数字符串(天数)。
func atoiPositive(s string) (int, error) {
	s = strings.TrimSpace(s)
	n := 0
	for _, ch := range s {
		if ch < '0' || ch > '9' {
			return 0, errInvalidNumber
		}
		n = n*10 + int(ch-'0')
		if n < 0 {
			return 0, errInvalidNumber
		}
	}
	if n <= 0 {
		return 0, errInvalidNumber
	}
	return n, nil
}

var errInvalidNumber = &parseError{"invalid positive integer"}

type parseError struct{ msg string }

func (e *parseError) Error() string { return e.msg }
