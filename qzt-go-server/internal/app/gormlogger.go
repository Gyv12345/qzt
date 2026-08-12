package app

import (
	"context"
	"errors"
	"time"

	"go.uber.org/zap"

	"gorm.io/gorm"
	gormlogger "gorm.io/gorm/logger"

	"qzt-go-server/pkg/xtrace"
)

// zapGormLogger 将 GORM 的日志适配到 zap，使 SQL 日志与业务日志结构一致、
// 统一输出到文件/控制台，并按级别控制；避免 GORM 默认走标准库 log 带 ANSI 颜色码
// （写入文件时变成乱码）。
type zapGormLogger struct {
	level         gormlogger.LogLevel
	slowThreshold time.Duration
}

func newGormLogger(level gormlogger.LogLevel, slowThreshold time.Duration) gormlogger.Interface {
	if slowThreshold <= 0 {
		slowThreshold = 200 * time.Millisecond
	}
	return &zapGormLogger{level: level, slowThreshold: slowThreshold}
}

func (l *zapGormLogger) LogMode(level gormlogger.LogLevel) gormlogger.Interface {
	nl := *l
	nl.level = level
	return &nl
}

func (l *zapGormLogger) Info(ctx context.Context, msg string, args ...any) {
	if l.level >= gormlogger.Info {
		xloggerSugared(ctx).Infof(msg, args...)
	}
}

func (l *zapGormLogger) Warn(ctx context.Context, msg string, args ...any) {
	if l.level >= gormlogger.Warn {
		xloggerSugared(ctx).Warnf(msg, args...)
	}
}

func (l *zapGormLogger) Error(ctx context.Context, msg string, args ...any) {
	if l.level >= gormlogger.Error {
		xloggerSugared(ctx).Errorf(msg, args...)
	}
}

func (l *zapGormLogger) Trace(ctx context.Context, begin time.Time, fc func() (string, int64), err error) {
	if l.level <= gormlogger.Silent {
		return
	}
	elapsed := time.Since(begin)
	sql, rows := fc()
	logger := xloggerSugared(ctx)
	switch {
	case err != nil && l.level >= gormlogger.Error && !errors.Is(err, gorm.ErrRecordNotFound):
		logger.Errorw("gorm sql error", "elapsed", elapsed.String(), "rows", rows, "sql", sql, "err", err)
	case l.slowThreshold > 0 && elapsed > l.slowThreshold && l.level >= gormlogger.Warn:
		logger.Warnw("gorm slow sql", "elapsed", elapsed.String(), "rows", rows, "sql", sql)
	case l.level >= gormlogger.Info:
		logger.Infow("gorm sql", "elapsed", elapsed.String(), "rows", rows, "sql", sql)
	}
}

// xloggerSugared 返回带 trace_id 的 SugaredLogger；ctx 无 trace_id 时退化为全局 logger。
func xloggerSugared(ctx context.Context) *zap.SugaredLogger {
	if tid := xtrace.GetTraceID(ctx); tid != "" {
		return zap.L().With(zap.String("trace_id", tid)).Sugar()
	}
	return zap.S()
}
