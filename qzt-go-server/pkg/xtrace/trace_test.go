package xtrace_test

import (
	"context"
	"testing"

	"qzt-go-server/pkg/xauth"
	"qzt-go-server/pkg/xtrace"
)

func TestGetTraceID(t *testing.T) {
	// === Happy path ===
	t.Run("happy: with trace ID", func(t *testing.T) {
		ctx := context.WithValue(context.Background(), xauth.XTraceId, "abc-123")
		if got := xtrace.GetTraceID(ctx); got != "abc-123" {
			t.Errorf("GetTraceID = %q, want %q", got, "abc-123")
		}
	})

	// === Boundary values ===
	t.Run("boundary: empty context returns empty", func(t *testing.T) {
		if got := xtrace.GetTraceID(context.Background()); got != "" {
			t.Errorf("GetTraceID(empty) = %q, want empty", got)
		}
	})

	t.Run("boundary: nil context returns empty", func(t *testing.T) {
		var nilCtx context.Context //nolint:staticcheck // 测试 nil context 防御性处理
		if got := xtrace.GetTraceID(nilCtx); got != "" {
			t.Errorf("GetTraceID(nil) = %q, want empty", got)
		}
	})

	t.Run("boundary: wrong type value returns empty", func(t *testing.T) {
		ctx := context.WithValue(context.Background(), xauth.XTraceId, 12345)
		if got := xtrace.GetTraceID(ctx); got != "" {
			t.Errorf("GetTraceID(wrong type) = %q, want empty", got)
		}
	})

	t.Run("boundary: empty string value returns empty", func(t *testing.T) {
		ctx := context.WithValue(context.Background(), xauth.XTraceId, "")
		if got := xtrace.GetTraceID(ctx); got != "" {
			t.Errorf("GetTraceID(empty string) = %q, want empty", got)
		}
	})
}

func TestNewContextWithTrace(t *testing.T) {
	// === Happy path ===
	t.Run("happy: sets trace ID", func(t *testing.T) {
		ctx := xtrace.NewContextWithTrace(context.Background(), "trace-xyz")
		got := xtrace.GetTraceID(ctx)
		if got != "trace-xyz" {
			t.Errorf("GetTraceID after NewContextWithTrace = %q, want %q", got, "trace-xyz")
		}
	})

	// === Boundary values ===
	t.Run("boundary: overwrites existing trace ID", func(t *testing.T) {
		ctx := context.WithValue(context.Background(), xauth.XTraceId, "old-id")
		ctx = xtrace.NewContextWithTrace(ctx, "new-id")
		if got := xtrace.GetTraceID(ctx); got != "new-id" {
			t.Errorf("GetTraceID after overwrite = %q, want %q", got, "new-id")
		}
	})

	t.Run("boundary: sets empty string", func(t *testing.T) {
		ctx := xtrace.NewContextWithTrace(context.Background(), "")
		if got := xtrace.GetTraceID(ctx); got != "" {
			t.Errorf("GetTraceID(empty) = %q, want empty", got)
		}
	})

	t.Run("boundary: nil context is handled", func(t *testing.T) {
		// NewContextWithTrace must not panic on a nil context
		ctx := xtrace.NewContextWithTrace(nil, "trace-nil")
		if got := xtrace.GetTraceID(ctx); got != "trace-nil" {
			t.Errorf("GetTraceID(nil ctx) = %q, want %q", got, "trace-nil")
		}
	})
}

// ========================
// Benchmark
// ========================

func BenchmarkGetTraceID(b *testing.B) {
	ctx := context.WithValue(context.Background(), xauth.XTraceId, "bench-trace-id")
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = xtrace.GetTraceID(ctx)
	}
}
