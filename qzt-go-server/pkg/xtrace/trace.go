package xtrace

import (
	"context"

	"qzt-go-server/pkg/xauth"
)

// xtrace 提供轻量的 trace_id 传递能力。
//
// 第一阶段不接入 OpenTelemetry/OTLP，仅通过 context 携带 trace_id，
// 供日志中间件与 xlogger 做日志关联。后续若需要分布式链路追踪，
// 可在此包内补充 OTLP exporter 初始化，无需改动调用方。

// GetTraceID 只读 context，不生成 ID。
func GetTraceID(ctx context.Context) string {
	if ctx == nil {
		return ""
	}
	if tid, ok := ctx.Value(xauth.XTraceId).(string); ok {
		return tid
	}
	return ""
}

// NewContextWithTrace 注入 trace_id 到 context。
func NewContextWithTrace(ctx context.Context, traceID string) context.Context {
	if ctx == nil {
		ctx = context.Background()
	}
	return context.WithValue(ctx, xauth.XTraceId, traceID)
}
