// steps.go 工作流动作节点执行器(P27):注册表 + notify/field_update。
// http/llm 执行器见 steps_http_llm.go。
package service

import (
	"context"
	"fmt"
	"strconv"

	wfmodel "qzt-go-server/internal/model/workflow"
	oasvc "qzt-go-server/internal/module/oa/service"
	"qzt-go-server/internal/repository"
)

// stepOut 单个动作节点的执行输出。
type stepOut map[string]any

// stepFunc 动作执行器签名。
type stepFunc func(ctx context.Context, node wfmodel.GraphNode, rc *runCtx) (stepOut, error)

// stepRegistry 动作执行器注册表(key = ACTION 节点 config.action)。
var stepRegistry = map[string]stepFunc{
	"notify":       stepNotify,
	"field_update": stepFieldUpdate,
	"http":         stepHTTP,
	"llm":          stepLLM,
}

// ActionCatalog 动作目录(供前端动作面板与 MCP 展示)。
var ActionCatalog = []map[string]string{
	{"action": "notify", "label": "发送通知", "desc": "站内信+SSE+企微/服务号,一次调用全通道"},
	{"action": "field_update", "label": "更新字段", "desc": "按白名单更新业务表字段(crm_lead.status / crm_customer.level/status)"},
	{"action": "http", "label": "HTTP 请求", "desc": "出站 HTTP 调用,支持可选 HMAC 签名头"},
	{"action": "llm", "label": "AI 生成", "desc": "调内部 LLM 网关生成文本(跟进建议/摘要等)"},
}

// fieldUpdateWhitelist 字段更新白名单(表 → 允许更新的列)。
// MVP 仅低危字段;扩展白名单需评审(字段名是服务端可信代码,禁拼客户端输入)。
var fieldUpdateWhitelist = map[string]map[string]bool{
	"crm_lead":     {"status": true},
	"crm_customer": {"level": true, "status": true},
}

// str any → 字符串(nil 安全)。
func str(v any) string {
	if v == nil {
		return ""
	}
	return fmt.Sprintf("%v", v)
}

// truncRunes 按字符截断。
func truncRunes(s string, n int) string {
	r := []rune(s)
	if len(r) <= n {
		return s
	}
	return string(r[:n])
}

// stepNotify 发送通知:站内信(落库)+SSE+企微/服务号,一次调用全通道。
func stepNotify(ctx context.Context, node wfmodel.GraphNode, rc *runCtx) (stepOut, error) {
	cfg := node.Config
	receiverStr := rc.renderTpl(str(cfg["receiver"]))
	receiver, err := strconv.ParseUint(receiverStr, 10, 64)
	if err != nil || receiver == 0 {
		return nil, fmt.Errorf("通知接收人无效: %q", receiverStr)
	}
	title := rc.renderTpl(str(cfg["title"]))
	content := rc.renderTpl(str(cfg["content"]))
	path := ""
	if p, ok := cfg["path"].(string); ok {
		path = rc.renderTpl(p)
	}
	msgSvc := oasvc.NewMessageService()
	if err := msgSvc.SendSystemMessageWithPath(ctx, uint(receiver),
		truncRunes(title, 60), truncRunes(content, 500), truncRunes(path, 200)); err != nil {
		return nil, fmt.Errorf("发送通知失败: %w", err)
	}
	return stepOut{"receiver": receiver, "title": truncRunes(title, 60)}, nil
}

// stepFieldUpdate 按白名单更新业务表字段。
func stepFieldUpdate(ctx context.Context, node wfmodel.GraphNode, rc *runCtx) (stepOut, error) {
	cfg := node.Config
	table := str(cfg["table"])
	field := str(cfg["field"])
	wField := str(cfg["where_field"])
	wValue := rc.renderTpl(str(cfg["where_value"]))
	if wField == "" {
		wField = "id"
	}
	fields, ok := fieldUpdateWhitelist[table]
	if !ok {
		return nil, fmt.Errorf("表不在白名单: %s", table)
	}
	if !fields[field] {
		return nil, fmt.Errorf("字段不在白名单: %s.%s", table, field)
	}
	if wValue == "" {
		return nil, fmt.Errorf("定位值不能为空: %s", wField)
	}
	value := rc.renderValue(cfg["value"])
	res := repository.DBFrom(ctx).Table(table).
		Where(wField+" = ?", wValue).
		Updates(map[string]any{field: value})
	if res.Error != nil {
		return nil, fmt.Errorf("更新失败: %w", res.Error)
	}
	return stepOut{"table": table, "field": field, "updated": res.RowsAffected}, nil
}
