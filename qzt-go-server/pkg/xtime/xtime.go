// Package xtime 提供自定义时间类型,统一 API 的 JSON 时间格式为 "2006-01-02 15:04:05"。
//
// 标准库 time.Time 默认序列化为 RFC3339("2026-08-03T14:30:27+08:00"),
// 前端通常期望 "yyyy-MM-dd HH:mm:ss"。本包用命名类型覆盖 MarshalJSON/UnmarshalJSON,
// 同时实现 database/sql 的 Valuer/Scanner,保证 GORM 能正确读写与自动填充。
package xtime

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"strings"
	"time"
)

// 时间格式常量。
const (
	DateTimeFormat = "2006-01-02 15:04:05" // 默认完整日期时间
	DateFormat     = "2006-01-02"          // 纯日期(回款计划日期、合同签订日期等)
	RFC3339Format  = time.RFC3339          // 兼容旧格式解析
)

// parseLayouts UnmarshalJSON 尝试解析的格式(按优先级)。
var parseLayouts = []string{
	DateTimeFormat,
	DateFormat,
	"2006-01-02 15:04:05.000",
	"2006/01/02 15:04:05",
	"2006/01/02",
	RFC3339Format,
	"2006-01-02T15:04:05", // 不带时区的 ISO
}

// parseTime 尝试用多种格式解析字符串,失败返回 error。
func parseTime(s string) (time.Time, error) {
	str := strings.TrimSpace(s)
	for _, layout := range parseLayouts {
		if t, err := time.ParseInLocation(layout, str, time.Local); err == nil {
			return t, nil
		}
	}
	return time.Time{}, fmt.Errorf("无法解析时间 %q,支持格式: %s / %s / RFC3339", s, DateTimeFormat, DateFormat)
}

// ── DateTime ──
// DateTime 替代 time.Time,JSON 输出 "2006-01-02 15:04:05"。
// 作为 time.Time 的命名类型,GORM 可识别其为时间类型并自动填充 created_at/updated_at。
type DateTime time.Time

// NewDateTime 由标准 time.Time 构造。
func NewDateTime(t time.Time) DateTime { return DateTime(t) }

// Now 返回当前时间的 DateTime。
func Now() DateTime { return DateTime(time.Now()) }

// Time 转回标准 time.Time(供业务逻辑使用)。
func (d DateTime) Time() time.Time { return time.Time(d) }

// IsZero 是否零值。
func (d DateTime) IsZero() bool { return time.Time(d).IsZero() }

// String 格式化字符串表示。
func (d DateTime) String() string { return time.Time(d).Format(DateTimeFormat) }

// MarshalJSON 输出 "2006-01-02 15:04:05";零值输出空字符串(便于前端判空)。
func (d DateTime) MarshalJSON() ([]byte, error) {
	t := time.Time(d)
	if t.IsZero() {
		return []byte(`""`), nil
	}
	return []byte(`"` + t.Format(DateTimeFormat) + `"`), nil
}

// UnmarshalJSON 支持多种格式解析;空字符串解析为零值(不报错)。
func (d *DateTime) UnmarshalJSON(data []byte) error {
	var s string
	if err := json.Unmarshal(data, &s); err != nil {
		// 兼容数字时间戳(毫秒)
		var ms int64
		if err2 := json.Unmarshal(data, &ms); err2 == nil {
			*d = DateTime(time.UnixMilli(ms))
			return nil
		}
		return err
	}
	if s == "" {
		*d = DateTime{}
		return nil
	}
	t, err := parseTime(s)
	if err != nil {
		return err
	}
	*d = DateTime(t)
	return nil
}

// Value 实现 driver.Valuer,GORM 写入时调用。返回 any 以兼容 MySQL 驱动。
func (d DateTime) Value() (driver.Value, error) {
	t := time.Time(d)
	if t.IsZero() {
		return nil, nil
	}
	return t, nil
}

// Scan 实现 sql.Scanner,GORM 读取时调用。
func (d *DateTime) Scan(value any) error {
	if value == nil {
		*d = DateTime{}
		return nil
	}
	switch v := value.(type) {
	case time.Time:
		*d = DateTime(v)
	case []byte:
		t, err := parseTime(string(v))
		if err != nil {
			return err
		}
		*d = DateTime(t)
	case string:
		t, err := parseTime(v)
		if err != nil {
			return err
		}
		*d = DateTime(t)
	default:
		return fmt.Errorf("xtime.DateTime.Scan: 不支持的类型 %T", value)
	}
	return nil
}

// ── NullDateTime ──
// NullDateTime 替代 *time.Time。基于 time.Time 命名类型,零值表示 null。
// 必须是 time.Time 的命名类型(不能是 struct),否则 GORM 会按 struct 字段推断列类型。
// JSON 输出:零值 → null,非零值 → "2006-01-02 15:04:05"。
// DB 读写:零值 → NULL,非零值 → datetime。
type NullDateTime time.Time

// NewNullDateTime 由 *time.Time 构造(nil 或零值 → 零值 NullDateTime)。
func NewNullDateTime(t *time.Time) NullDateTime {
	if t == nil || t.IsZero() {
		return NullDateTime{}
	}
	return NullDateTime(*t)
}

// NewNullDateTimeFromTime 由 time.Time 构造(零值 → 零值 NullDateTime)。
func NewNullDateTimeFromTime(t time.Time) NullDateTime {
	if t.IsZero() {
		return NullDateTime{}
	}
	return NullDateTime(t)
}

// Ptr 转回 *time.Time(零值时返回 nil)。
func (n NullDateTime) Ptr() *time.Time {
	if time.Time(n).IsZero() {
		return nil
	}
	t := time.Time(n)
	return &t
}

// IsZero 是否零值(等同于 null)。
func (n NullDateTime) IsZero() bool { return time.Time(n).IsZero() }

// MarshalJSON 零值 → null;非零值 → "2006-01-02 15:04:05"。
func (n NullDateTime) MarshalJSON() ([]byte, error) {
	t := time.Time(n)
	if t.IsZero() {
		return []byte("null"), nil
	}
	return []byte(`"` + t.Format(DateTimeFormat) + `"`), nil
}

// UnmarshalJSON 支持 null、空字符串、多种日期格式。
func (n *NullDateTime) UnmarshalJSON(data []byte) error {
	s := strings.TrimSpace(string(data))
	if s == "null" || s == `""` {
		*n = NullDateTime{}
		return nil
	}
	var str string
	if err := json.Unmarshal(data, &str); err != nil {
		var ms int64
		if err2 := json.Unmarshal(data, &ms); err2 == nil {
			*n = NullDateTime(time.UnixMilli(ms))
			return nil
		}
		return err
	}
	if str == "" {
		*n = NullDateTime{}
		return nil
	}
	t, err := parseTime(str)
	if err != nil {
		return err
	}
	*n = NullDateTime(t)
	return nil
}

// Value 实现 driver.Valuer。零值写入 NULL。
func (n NullDateTime) Value() (driver.Value, error) {
	t := time.Time(n)
	if t.IsZero() {
		return nil, nil
	}
	return t, nil
}

// Scan 实现 sql.Scanner。
func (n *NullDateTime) Scan(value any) error {
	if value == nil {
		*n = NullDateTime{}
		return nil
	}
	switch v := value.(type) {
	case time.Time:
		*n = NullDateTime(v)
	case []byte:
		t, err := parseTime(string(v))
		if err != nil {
			return err
		}
		*n = NullDateTime(t)
	case string:
		t, err := parseTime(v)
		if err != nil {
			return err
		}
		*n = NullDateTime(t)
	default:
		return fmt.Errorf("xtime.NullDateTime.Scan: 不支持的类型 %T", value)
	}
	return nil
}
