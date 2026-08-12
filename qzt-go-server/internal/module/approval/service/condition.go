package service

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"

	apprmodel "qzt-go-server/internal/model/approval"
	"qzt-go-server/internal/repository"
)

// condition.go 审批条件分支求值引擎。
//
// 配合 approval.go 的 getNextNode:当流转到条件分叉点(出边含 CONDITION 节点)时,
// 对每个 CONDITION 节点的 conditionConfig 用当前业务表单数据求值,选出匹配分支。
//
// conditionConfig JSON 结构(与前端 NodeConfigPanel 对齐):
//
//	{"logic":"AND|OR","conditions":[{"field":"total_amount","op":"GT","value":"100000"}]}
//
// field 取自 form_fields.go 的 FieldMeta.Key(固定字段=列名;CRM自定义=field_id;OA_CUSTOM=字段key)。

// 条件操作符。
const (
	OpEQ  = "EQ"
	OpNE  = "NE"
	OpGT  = "GT"
	OpGTE = "GTE"
	OpLT  = "LT"
	OpLTE = "LTE"
)

// conditionConfig 条件配置(分支匹配规则)。
type conditionConfig struct {
	Logic      string          `json:"logic"` // AND|OR
	Conditions []conditionItem `json:"conditions"`
}

// conditionItem 单个条件。
type conditionItem struct {
	Field string `json:"field"`
	Op    string `json:"op"`
	Value string `json:"value"`
}

// evalCondition 对业务表单数据求值条件配置。
// 纯函数(无 DB 依赖),便于单测。
// 解析失败或 conditions 为空时返回 true(无约束=放行,符合"未配条件"直觉)。
func evalCondition(condCfg string, data map[string]any) bool {
	if strings.TrimSpace(condCfg) == "" {
		return true
	}
	var cfg conditionConfig
	if err := json.Unmarshal([]byte(condCfg), &cfg); err != nil {
		return true
	}
	if len(cfg.Conditions) == 0 {
		return true
	}
	isOR := strings.EqualFold(cfg.Logic, "OR")
	for _, c := range cfg.Conditions {
		ok := evalOne(c, data)
		if isOR && ok {
			return true // 或签:任一满足
		}
		if !isOR && !ok {
			return false // 与签:任一不满足即假
		}
	}
	return !isOR // AND 走完全部都真→true;OR 走完全部都假→false
}

// evalOne 求值单个条件。按值类型启发式选择比较方式:数值→日期→字符串。
func evalOne(c conditionItem, data map[string]any) bool {
	raw, ok := data[c.Field]
	if !ok {
		return false
	}
	// 1. 数值优先(金额/数量/天数/税率/状态码)
	if lf, ok1 := toFloat64(raw); ok1 {
		if rf, ok2 := toFloat64Str(c.Value); ok2 {
			return compareNum(lf, rf, c.Op)
		}
	}
	// 2. 日期(raw 是 time.Time,且 value 可解析为时间)
	if lt, ok1 := toTime(raw); ok1 {
		if rt, ok2 := parseTimeStr(c.Value); ok2 {
			return compareTime(lt, rt, c.Op)
		}
	}
	// 3. 字符串(EQ/NE 为主;GT/LT 按字典序兜底)
	return compareStr(toString(raw), c.Value, c.Op)
}

// ── 类型归一 ──

func toString(v any) string {
	switch x := v.(type) {
	case nil:
		return ""
	case []byte:
		return string(x)
	case string:
		return x
	case time.Time:
		return x.Format("2006-01-02 15:04:05")
	case json.Number:
		return x.String()
	default:
		return fmt.Sprint(v)
	}
}

func toFloat64(v any) (float64, bool) {
	switch x := v.(type) {
	case float64:
		return x, true
	case float32:
		return float64(x), true
	case int:
		return float64(x), true
	case int8:
		return float64(x), true
	case int16:
		return float64(x), true
	case int32:
		return float64(x), true
	case int64:
		return float64(x), true
	case uint:
		return float64(x), true
	case []byte:
		return toFloat64Str(string(x))
	case string:
		return toFloat64Str(x)
	case json.Number:
		return toFloat64Str(x.String())
	}
	return 0, false
}

func toFloat64Str(s string) (float64, bool) {
	s = strings.TrimSpace(s)
	if s == "" {
		return 0, false
	}
	f, err := strconv.ParseFloat(s, 64)
	if err != nil {
		return 0, false
	}
	return f, true
}

func toTime(v any) (time.Time, bool) {
	if t, ok := v.(time.Time); ok {
		return t, true
	}
	return parseTimeStr(toString(v))
}

// dateFormats 日期/时间解析候选格式。
var dateFormats = []string{
	"2006-01-02 15:04:05",
	"2006-01-02",
	time.RFC3339,
	"2006/01/02",
}

func parseTimeStr(s string) (time.Time, bool) {
	s = strings.TrimSpace(s)
	if s == "" {
		return time.Time{}, false
	}
	for _, f := range dateFormats {
		if t, err := time.ParseInLocation(f, s, time.Local); err == nil {
			return t, true
		}
	}
	return time.Time{}, false
}

// ── 比较 ──

func compareNum(l, r float64, op string) bool {
	switch op {
	case OpEQ:
		return l == r
	case OpNE:
		return l != r
	case OpGT:
		return l > r
	case OpGTE:
		return l >= r
	case OpLT:
		return l < r
	case OpLTE:
		return l <= r
	}
	return false
}

func compareTime(l, r time.Time, op string) bool {
	switch op {
	case OpEQ:
		return l.Equal(r)
	case OpNE:
		return !l.Equal(r)
	case OpGT:
		return l.After(r)
	case OpGTE:
		return l.After(r) || l.Equal(r)
	case OpLT:
		return l.Before(r)
	case OpLTE:
		return l.Before(r) || l.Equal(r)
	}
	return false
}

func compareStr(l, r, op string) bool {
	switch op {
	case OpEQ:
		return l == r
	case OpNE:
		return l != r
	case OpGT:
		return l > r
	case OpGTE:
		return l >= r
	case OpLT:
		return l < r
	case OpLTE:
		return l <= r
	}
	return false
}

// ── 取数 ──

// buildFormData 汇总审批实例对应的业务表单数据,供条件求值。
//   - 非 OA_CUSTOM: 裸查业务表(FormTable 映射)→ map[列名]值
//   - CONTRACT: 额外合并 contract_field/contract_field_blob 自定义值 → map[field_id]值
//   - OA_CUSTOM: 解析 oa_form_data.field_values JSON → map[字段key]值
func (s *ApprovalService) buildFormData(ctx context.Context, instance *apprmodel.ApprovalInstance) map[string]any {
	data := make(map[string]any)
	if instance == nil {
		return data
	}

	// OA_CUSTOM: 解析 field_values JSON
	if instance.Type == apprmodel.FormTypeCustomForm {
		if fd, err := s.formDataRepo.GetByID(ctx, instance.ResourceID); err == nil && fd != nil {
			_ = json.Unmarshal([]byte(fd.FieldValues), &data)
		}
		return data
	}

	// 通用: 裸查业务表
	table := apprmodel.FormTable[instance.Type]
	if table == "" {
		return data
	}
	repository.DBFrom(ctx).Table(table).
		Where("id = ?", instance.ResourceID).
		Where("deleted_at IS NULL").
		Scan(&data)

	// CONTRACT: 合并自定义字段值(Key=field_id)
	if instance.Type == apprmodel.FormTypeContract {
		for k, v := range loadContractFieldValues(ctx, instance.ResourceID) {
			data[k] = v
		}
	}
	return data
}

// loadContractFieldValues 查合同的自定义字段值(单值 + blob)→ map[field_id]value。
// resource_id 在值表里是 VARCHAR(32)(与 qztcrm 一致),用合同 ID 的字符串形式查询。
func loadContractFieldValues(ctx context.Context, contractID uint) map[string]string {
	out := make(map[string]string)
	if contractID == 0 {
		return out
	}
	rid := strconv.FormatUint(uint64(contractID), 10)
	db := repository.DBFrom(ctx)
	var rows []struct {
		FieldID    string `gorm:"column:field_id"`
		FieldValue string `gorm:"column:field_value"`
	}
	// 单值表(VARCHAR255)
	if err := db.Table("contract_field").Where("resource_id = ?", rid).Scan(&rows).Error; err == nil {
		for _, r := range rows {
			out[r.FieldID] = r.FieldValue
		}
	}
	// 大值表(TEXT)
	var blobRows []struct {
		FieldID    string `gorm:"column:field_id"`
		FieldValue string `gorm:"column:field_value"`
	}
	if err := db.Table("contract_field_blob").Where("resource_id = ?", rid).Scan(&blobRows).Error; err == nil {
		for _, r := range blobRows {
			out[r.FieldID] = r.FieldValue
		}
	}
	return out
}
