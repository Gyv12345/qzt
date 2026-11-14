// event_sub.go 自动化工作流事件触发(P27):事件目录 + xevent 订阅分发。
package service

import (
	"context"
	"encoding/json"
	"fmt"

	wfmodel "qzt-go-server/internal/model/workflow"
	"qzt-go-server/internal/repository"
	wfrepo "qzt-go-server/internal/repository/workflow"
	"qzt-go-server/pkg/xevent"
	"qzt-go-server/pkg/xlogger"
)

// EventItem 事件目录项。
type EventItem struct {
	Event string `json:"event"`
	Label string `json:"label"`
	Desc  string `json:"desc"`
}

// EventCatalog 可作为工作流触发的事件目录。
// 扩展:新事件发布后在此登记 + 定义侧即可选它做触发器。
var EventCatalog = []EventItem{
	{Event: "approval.finished", Label: "审批完成", Desc: "合同/请假/报销等审批流结束时"},
	{Event: "approval.task.assigned", Label: "审批待办产生", Desc: "审批节点到达新审批人时"},
	{Event: "crm.lead.created", Label: "新线索入库", Desc: "线索创建(含公海导入/抖音线索同步)后"},
	{Event: "crm.customer.created", Label: "新客户建档", Desc: "客户创建后"},
	{Event: "crm.payment.created", Label: "回款登记", Desc: "合同回款登记后"},
	{Event: "psi.sales_order.stock_out", Label: "销售出库", Desc: "销售订单出库后"},
}

// ValidateEventName 校验事件名在目录内。
func ValidateEventName(event string) error {
	for _, it := range EventCatalog {
		if it.Event == event {
			return nil
		}
	}
	return fmt.Errorf("事件不在目录内: %s(可在代码内扩展 EventCatalog)", event)
}

// RegisterEventSubscribers 启动时注册事件订阅(对目录事件逐个挂 xevent)。
// handler 内异步执行,不阻塞事件发布方主链路。
func RegisterEventSubscribers(ctx context.Context) {
	for _, it := range EventCatalog {
		ev := it.Event
		xevent.Subscribe(ev, func(ctx context.Context, payload any) {
			go dispatchEvent(ctx, ev, payload)
		})
	}
}

// dispatchEvent 事件 → 匹配启用的 EVENT 定义 → 异步执行。
func dispatchEvent(ctx context.Context, event string, payload any) {
	defer func() {
		if r := recover(); r != nil {
			xlogger.ErrorfCtx(ctx, "工作流事件分发 panic event=%s: %v", event, r)
		}
	}()
	m, ok := payload.(map[string]any)
	if !ok {
		// 具名 struct payload 转 JSON 快照
		b, _ := json.Marshal(payload)
		_ = json.Unmarshal(b, &m)
	}
	if m == nil {
		m = map[string]any{"raw": fmt.Sprintf("%v", payload)}
	}
	m["event"] = event
	defRepo := wfrepo.NewDefinitionRepo()
	q := &repository.QueryOptions{
		Where: map[string]any{"trigger_type": wfmodel.TriggerEvent, "enabled": int8(1)},
		Order: []string{"id ASC"},
	}
	defs, _, err := defRepo.PageList(ctx, 1, 200, q)
	if err != nil {
		xlogger.ErrorfCtx(ctx, "工作流事件分发:查询定义失败 event=%s: %v", event, err)
		return
	}
	for _, d := range defs {
		var cfg struct {
			Event string `json:"event"`
		}
		_ = json.Unmarshal([]byte(d.TriggerConfig), &cfg)
		if cfg.Event == event {
			defaultEngine.RunAsync(d.ID, wfmodel.TriggerEvent, m)
		}
	}
}
