// passpost.go PassPostConfig / RejectPostConfig 执行器(P17)。
//
// 配置存于 approval_node_approver.pass_post_config / reject_post_config(节点级,
// 在途实例走旧版快照不受影响)。JSON schema:
//
//	{"field_updates":[{"field":"stage","value":"SIGNED"}],"webhook_event":"contract.signed"}
//
// field_updates 列名经 FormUpdatableFields 白名单校验(防 SQL 标识符注入),
// 值走参数化写入;webhook_event 经 xevent 总线以 open.webhook.emit 发布,
// 由 open 模块统一转发为出站 webhook——approval 与 open 两模块零 import 耦合。
package service

import (
	"context"
	"encoding/json"
	"regexp"
	"strings"

	apprmodel "qzt-go-server/internal/model/approval"
	apprrepo "qzt-go-server/internal/repository/approval"
	"qzt-go-server/pkg/xevent"
	"qzt-go-server/pkg/xlogger"
)

// webhookEventName 自定义 webhook 事件名约束(小写字母开头,小写字母/数字/点)。
var webhookEventName = regexp.MustCompile(`^[a-z][a-z0-9.]{1,63}$`)

// PostConfig 通过/驳回后操作配置。
type PostConfig struct {
	FieldUpdates []PostFieldUpdate `json:"field_updates"`
	WebhookEvent string            `json:"webhook_event"`
}

// PostFieldUpdate 单条字段更新。
type PostFieldUpdate struct {
	Field string `json:"field"`
	Value string `json:"value"`
}

// ParsePostConfig 解析并校验配置 JSON;空串返回 nil(无配置)。解析失败返回 nil。
func ParsePostConfig(raw string) *PostConfig {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil
	}
	var cfg PostConfig
	if err := json.Unmarshal([]byte(raw), &cfg); err != nil {
		return nil
	}
	return &cfg
}

// ApplyPostConfig 执行节点级通过/驳回后配置。
// kind 仅用于日志标识("pass"/"reject");失败仅记日志,不阻断审批主流程。
func ApplyPostConfig(ctx context.Context, rawConfig string, instance *apprmodel.ApprovalInstance, kind string) {
	cfg := ParsePostConfig(rawConfig)
	if cfg == nil {
		return
	}
	// 1. 字段更新:列白名单 + 参数化写入
	table, ok := apprmodel.FormTable[instance.Type]
	if !ok {
		xlogger.ErrorfCtx(ctx, "PassPostConfig 表单类型无表映射 type=%s", instance.Type)
		return
	}
	allowed := apprmodel.FormUpdatableFields[instance.Type]
	updates := make(map[string]any, len(cfg.FieldUpdates))
	for _, fu := range cfg.FieldUpdates {
		if !isAllowedColumn(allowed, fu.Field) {
			xlogger.ErrorfCtx(ctx, "PassPostConfig 列不在白名单 type=%s field=%s", instance.Type, fu.Field)
			continue
		}
		if len(fu.Value) > 64 {
			fu.Value = fu.Value[:64]
		}
		updates[fu.Field] = fu.Value
	}
	if len(updates) > 0 {
		if _, err := apprrepo.UpdateResourceFields(ctx, table, instance.ResourceID, updates); err != nil {
			xlogger.ErrorfCtx(ctx, "PassPostConfig 字段更新失败 type=%s id=%d: %v", instance.Type, instance.ResourceID, err)
		}
	}
	// 2. 自定义 webhook 事件(经 open.webhook.emit 总线,open 模块转发)
	if cfg.WebhookEvent != "" {
		if !webhookEventName.MatchString(cfg.WebhookEvent) {
			xlogger.ErrorfCtx(ctx, "PassPostConfig 非法事件名 %q", cfg.WebhookEvent)
			return
		}
		xevent.Publish(ctx, "open.webhook.emit", map[string]any{
			"event_type":    cfg.WebhookEvent,
			"instance_id":   instance.ID,
			"resource_type": instance.Type,
			"resource_id":   instance.ResourceID,
			"kind":          kind,
		})
	}
}

// isAllowedColumn 白名单校验。
func isAllowedColumn(allowed []string, col string) bool {
	for _, a := range allowed {
		if a == col {
			return true
		}
	}
	return false
}
