// Package xevent 提供进程内轻量事件总线,用于模块间解耦。
//
// 设计:同步分发(保证消息落库)+ panic 恢复(单个 handler 失败不影响其他)。
// 不依赖外部 MQ,适合模块化单体;后续多实例时可迁移到 Redis Stream。
//
// 典型用法:
//
//	// 启动时注册监听
//	xevent.Subscribe("approval.task.assigned", func(ctx, payload) {
//	    msgSvc.SendSystemMessage(payload.ApproverID, "您有新的审批待办", ...)
//	})
//	// 业务代码发布事件
//	xevent.Publish(ctx, "approval.task.assigned", TaskAssignedPayload{...})
package xevent

import (
	"context"
	"sync"

	"qzt-go-server/pkg/xlogger"
)

// Handler 事件处理器。payload 的具体类型由发布者约定。
type Handler func(ctx context.Context, payload any)

// EventBus 事件总线(全局单例)。
type EventBus struct {
	mu       sync.RWMutex
	handlers map[string][]Handler
}

// Bus 全局事件总线实例。
var Bus = &EventBus{handlers: make(map[string][]Handler)}

// Subscribe 订阅事件。可对同一事件注册多个 handler(按注册顺序执行)。
func Subscribe(eventType string, handler Handler) {
	Bus.mu.Lock()
	defer Bus.mu.Unlock()
	Bus.handlers[eventType] = append(Bus.handlers[eventType], handler)
}

// Publish 同步发布事件。所有 handler 按顺序执行,单个 panic 不影响其他。
// 同步执行保证 handler 内的消息落库(DB 事务可见);若需异步,在 handler 内自行 go。
func Publish(ctx context.Context, eventType string, payload any) {
	Bus.mu.RLock()
	handlers := Bus.handlers[eventType]
	Bus.mu.RUnlock()

	for _, h := range handlers {
		func() {
			defer func() {
				if r := recover(); r != nil {
					xlogger.ErrorfCtx(ctx, "事件 handler panic event=%s: %v", eventType, r)
				}
			}()
			h(ctx, payload)
		}()
	}
}

// Clear 清空全部订阅(仅测试用)。
func (b *EventBus) Clear() {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.handlers = make(map[string][]Handler)
}
