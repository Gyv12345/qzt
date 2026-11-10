// listener.go xevent 订阅 → 出站 webhook 转发。
// 订阅在包 init 时注册;Publish 落 outbox,由 open.webhook.dispatch job 异步投递。
package service

import (
	"context"

	"qzt-go-server/pkg/xevent"
)

// 全局 webhook 服务实例(listener 与 passpost 执行器共用)。
var openWebhookSvc = NewWebhookService()

// init 注册 xevent 订阅(进程内总线,多订阅者按注册顺序执行)。
func init() {
	// 审批完成:approved/rejected 映射为独立事件码;revoked 由 Revoke 路径直接发布
	xevent.Subscribe("approval.finished", func(ctx context.Context, payload any) {
		m, ok := payload.(map[string]any)
		if !ok {
			return
		}
		result, _ := m["result"].(string)
		code := ""
		switch result {
		case "approved":
			code = "approval.passed"
		case "rejected":
			code = "approval.rejected"
		default:
			return
		}
		openWebhookSvc.Publish(ctx, code, m)
	})

	// 审批撤回(approval 模块 Revoke 路径直接发布 approval.revoked)
	xevent.Subscribe("approval.revoked", func(ctx context.Context, payload any) {
		m, ok := payload.(map[string]any)
		if !ok {
			return
		}
		openWebhookSvc.Publish(ctx, "approval.revoked", m)
	})

	// 回款登记(crm 模块已有发布点,原样转发)
	xevent.Subscribe("crm.payment.created", func(ctx context.Context, payload any) {
		m, ok := payload.(map[string]any)
		if !ok {
			return
		}
		openWebhookSvc.Publish(ctx, "crm.payment.created", m)
	})

	// 销售出库(psi 模块本期新增发布点,原样转发)
	xevent.Subscribe("psi.sales_order.stock_out", func(ctx context.Context, payload any) {
		m, ok := payload.(map[string]any)
		if !ok {
			return
		}
		openWebhookSvc.Publish(ctx, "psi.sales_order.stock_out", m)
	})

	// PassPostConfig 自定义事件(approval 模块经 open.webhook.emit 中转,approval 与 open 零 import 耦合)
	xevent.Subscribe("open.webhook.emit", func(ctx context.Context, payload any) {
		m, ok := payload.(map[string]any)
		if !ok {
			return
		}
		eventType, _ := m["event_type"].(string)
		if eventType == "" {
			return
		}
		openWebhookSvc.Publish(ctx, eventType, m)
	})
}
