// catalog.go 事件目录与订阅校验(纯函数,可单测)。
package service

import (
	"strings"
)

// EventInfo 事件目录条目。
type EventInfo struct {
	Code string `json:"code"`
	Name string `json:"name"`
	Desc string `json:"desc"`
}

// EventCatalog 平台出站事件目录。
// 事件来源:xevent 总线(审批/回款已有发布点) + psi 出库(本期新增发布点)。
var EventCatalog = []EventInfo{
	{Code: "approval.passed", Name: "审批通过", Desc: "审批实例全部通过时触发"},
	{Code: "approval.rejected", Name: "审批驳回", Desc: "审批实例被驳回时触发"},
	{Code: "approval.revoked", Name: "审批撤回", Desc: "审批实例被发起人撤回时触发"},
	{Code: "crm.payment.created", Name: "回款登记", Desc: "合同回款记录创建时触发"},
	{Code: "psi.sales_order.stock_out", Name: "销售出库", Desc: "销售订单执行出库时触发"},
}

// eventCodeSet 目录内事件码集合。
var eventCodeSet = func() map[string]bool {
	m := make(map[string]bool, len(EventCatalog))
	for _, e := range EventCatalog {
		m[e.Code] = true
	}
	return m
}()

// ValidEvent 判断事件码是否在目录内。
func ValidEvent(code string) bool { return eventCodeSet[code] }

// ValidEvents 校验逗号分隔的事件串(空串=订阅全部,合法)。
func ValidEvents(events string) bool {
	if events == "" {
		return true
	}
	for _, part := range strings.Split(events, ",") {
		if !ValidEvent(strings.TrimSpace(part)) {
			return false
		}
	}
	return true
}
