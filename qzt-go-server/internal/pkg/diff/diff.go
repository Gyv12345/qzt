package diff

// diff.go 通用 struct 字段对比工具。
// 用反射对比指定字段,返回变更列表。供 service 层 Update 方法记录字段变更历史。

import (
	"fmt"
	"reflect"
)

// FieldDef 定义要对比的字段。
type FieldDef struct {
	Name  string // struct 字段名(大小写敏感,与 Go struct 一致)
	Label string // 中文标签
}

// FieldChange 一个字段的变更记录。
type FieldChange struct {
	Field      string
	FieldLabel string
	OldValue   string
	NewValue   string
}

// DiffStructs 对比 old 和 new 两个同类型 struct 的指定字段,返回有变化的字段列表。
// 支持基本类型(string/int/int8/float)和指针类型(*string/*int 等)。
// 指针 nil 视为空字符串。
func DiffStructs(old, new any, fields []FieldDef) []FieldChange {
	oldV := reflect.ValueOf(old)
	newV := reflect.ValueOf(new)
	// 解指针
	if oldV.Kind() == reflect.Ptr {
		oldV = oldV.Elem()
	}
	if newV.Kind() == reflect.Ptr {
		newV = newV.Elem()
	}

	var changes []FieldChange
	for _, fd := range fields {
		oldField := oldV.FieldByName(fd.Name)
		newField := newV.FieldByName(fd.Name)
		if !oldField.IsValid() || !newField.IsValid() {
			continue
		}
		oldStr := fieldToString(oldField)
		newStr := fieldToString(newField)
		if oldStr != newStr {
			changes = append(changes, FieldChange{
				Field:      fd.Name,
				FieldLabel: fd.Label,
				OldValue:   oldStr,
				NewValue:   newStr,
			})
		}
	}
	return changes
}

// fieldToString 把反射值转成字符串(指针 nil = "")。
func fieldToString(v reflect.Value) string {
	// 解指针
	if v.Kind() == reflect.Ptr {
		if v.IsNil() {
			return ""
		}
		v = v.Elem()
	}
	switch v.Kind() {
	case reflect.String:
		return v.String()
	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
		return fmt.Sprintf("%d", v.Int())
	case reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64:
		return fmt.Sprintf("%d", v.Uint())
	case reflect.Float32, reflect.Float64:
		return fmt.Sprintf("%v", v.Float())
	case reflect.Bool:
		if v.Bool() {
			return "1"
		}
		return "0"
	default:
		return fmt.Sprintf("%v", v.Interface())
	}
}
