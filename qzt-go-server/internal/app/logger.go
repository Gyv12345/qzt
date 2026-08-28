package app

import (
	"go.uber.org/zap"

	"qzt-go-server/config"
	"qzt-go-server/internal/version"
	"qzt-go-server/pkg/xlogger"
)

// Log 全局 SugaredLogger，供非业务关键路径（启动、关停等）使用。
// 业务代码应使用 xlogger 的 Ctx 变体（InfofCtx/ErrorfCtx），以便带上 trace_id。
var Log *zap.SugaredLogger

// InitLogger 初始化 zap 全局 logger 并设置 app.Log。
// 必须在 config.Init 之后调用。
func InitLogger(logPath string) {
	cfg := config.Get()
	xlogger.Init(logPath, xlogger.Options{
		BaseServiceName:      cfg.Application.Server.Name,
		BaseServiceVersion:   version.Get().Version,
		Output:               cfg.Log.Output,
		LogEncoder:           cfg.Log.LogEncoder,
		AccessEncoder:        cfg.Log.AccessEncoder,
		LogFileMaxAgeDays:    cfg.Log.LogFileMaxAgeDays,
		AccessFileMaxAgeDays: cfg.Log.AccessFileMaxAgeDays,
	})
	// xlogger.Init 已 ReplaceGlobals，这里取一份 Sugared 便于快捷调用
	Log = zap.S()
}
