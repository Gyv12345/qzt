package mcp

import (
	"fmt"
	"strings"
	"time"

	"github.com/mark3labs/mcp-go/mcp"

	"qzt-go-server/pkg/xtime"
)

// tools_helpers.go 各 tool 文件共用的参数解析/响应构造辅助函数。
// resultText / resultError / userIDFromContext 分别在 server.go / tools_customer.go。

// mcpPage 解析分页参数(页码默认1,每页默认20,上限100)。
func mcpPage(req mcp.CallToolRequest) (page, pageSize int) {
	page = int(req.GetFloat("page", 1))
	pageSize = int(req.GetFloat("page_size", 20))
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 || pageSize > 100 {
		pageSize = 20
	}
	return
}

// argPresent 判断调用方是否显式传了某参数(区分「未传」与「传了零值」)。
func argPresent(req mcp.CallToolRequest, key string) bool {
	args := req.GetArguments()
	if args == nil {
		return false
	}
	_, ok := args[key]
	return ok
}

// optUintPtr 创建场景取可选 uint 指针(>0 才返回指针,否则 nil)。
func optUintPtr(req mcp.CallToolRequest, key string) *uint {
	if v := uint(req.GetFloat(key, 0)); v > 0 {
		return &v
	}
	return nil
}

// halfUintPtr 半增量 uint 指针:未提供则保留 existing;提供 0 视为清空(nil);>0 设值。
func halfUintPtr(req mcp.CallToolRequest, key string, existing *uint) *uint {
	if argPresent(req, key) {
		v := uint(req.GetFloat(key, 0))
		if v > 0 {
			return &v
		}
		return nil
	}
	return existing
}

// halfString 半增量字符串:未提供则保留 existing。
func halfString(req mcp.CallToolRequest, key, existing string) string {
	if argPresent(req, key) {
		return req.GetString(key, "")
	}
	return existing
}

// halfInt 半增量 int:未提供则保留 existing。
func halfInt(req mcp.CallToolRequest, key string, existing int) int {
	if argPresent(req, key) {
		return int(req.GetFloat(key, 0))
	}
	return existing
}

// halfFloat 半增量 float64:未提供则保留 existing。
func halfFloat(req mcp.CallToolRequest, key string, existing float64) float64 {
	if argPresent(req, key) {
		return req.GetFloat(key, 0)
	}
	return existing
}

// parseFlexTime 解析 "YYYY-MM-DD[ HH:mm:ss]" 或 RFC3339。
func parseFlexTime(s string) (time.Time, error) {
	str := strings.TrimSpace(s)
	for _, layout := range []string{xtime.DateTimeFormat, xtime.DateFormat, time.RFC3339, "2006-01-02T15:04:05"} {
		if t, err := time.ParseInLocation(layout, str, time.Local); err == nil {
			return t, nil
		}
	}
	return time.Time{}, fmt.Errorf("无法解析时间 %q,支持格式: YYYY-MM-DD HH:mm:ss / YYYY-MM-DD", s)
}

// parseNullDate 解析日期字符串为 NullDateTime(空串返回零值)。
func parseNullDate(s string) (xtime.NullDateTime, error) {
	if strings.TrimSpace(s) == "" {
		return xtime.NullDateTime{}, nil
	}
	t, err := parseFlexTime(s)
	if err != nil {
		return xtime.NullDateTime{}, err
	}
	return xtime.NewNullDateTimeFromTime(t), nil
}

// parseNullDateTime 同 parseNullDate,语义别名(时间字段)。
func parseNullDateTime(s string) (xtime.NullDateTime, error) {
	return parseNullDate(s)
}
