package service

import (
	"time"

	"qzt-go-server/pkg/xtime"
)

// date.go 日期/时间字符串解析 helper。PSI 单据的日期字段前端以字符串传入。

// parseNullDate 把 "2006-01-02" 或 "2006-01-02 15:04:05" 解析为 NullDateTime。
// 空串或解析失败返回零值(入库即 NULL)。
func parseNullDate(s string) xtime.NullDateTime {
	if s == "" {
		return xtime.NullDateTime{}
	}
	for _, layout := range []string{"2006-01-02 15:04:05", "2006-01-02", time.RFC3339} {
		if t, err := time.Parse(layout, s); err == nil {
			return xtime.NewNullDateTimeFromTime(t)
		}
	}
	return xtime.NullDateTime{}
}

// parseOrderDateOnCreate 单据创建场景的单据日期:未传时缺省当天。
// 单据日期参与日期过滤型报表(财务概览/采购销售对比)聚合,落 NULL 会被漏计。
func parseOrderDateOnCreate(s string) xtime.NullDateTime {
	if nd := parseNullDate(s); !nd.IsZero() {
		return nd
	}
	return xtime.NewNullDateTimeFromTime(time.Now())
}
