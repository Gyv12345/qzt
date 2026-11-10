package service

import (
	"context"

	entsvc "qzt-go-server/internal/module/enterprise/service"
	"qzt-go-server/pkg/xlogger"
)

// job.go GEO 监测定时任务。
//
// bean_class=geo.monitor.run,cron 在 docs/sql/geo_monitor.sql 注册(每周一 09:00)。
// geo/service 包已被 handler import,init() 必然执行,无需改 main.go
// (调度器无条件启动)。注意 sys_job 记录插入后需重启服务才会被调度器加载。

func init() {
	entsvc.RegisterJobHandler("geo.monitor.run", &monitorJob{})
	entsvc.RegisterJobHandler("geo.source.run", &sourceJob{})
}

type monitorJob struct{}

// Execute 触发一轮监测（异步执行,任务立即返回;轮次状态在 geo_run 表跟踪）。
func (h *monitorJob) Execute(ctx context.Context) error {
	result, err := NewMonitorService().StartRun(ctx, "schedule")
	if err != nil {
		if err == errRunRunning {
			xlogger.InfofCtx(ctx, "geo: 定时监测跳过——已有轮次在执行中")
			return nil
		}
		return err
	}
	xlogger.InfofCtx(ctx, "geo: 定时监测已启动 run=%d 提示词=%d 平台=%d",
		result.Run.ID, result.PromptCount, result.PlatformCount)
	return nil
}

// sourceJob 每日信源产线（选题→图文+视频→投递），bean_class=geo.source.run。
type sourceJob struct{}

// Execute 同步跑一轮产线（选题/写稿/视频生成总耗时可达数分钟，调度器在协程中执行）。
func (h *sourceJob) Execute(ctx context.Context) error {
	res, err := NewSourceService().RunPipeline(ctx, "schedule")
	if err != nil {
		return err
	}
	xlogger.InfofCtx(ctx, "geo: 定时产线完成 选题+%d 图文=%d(推送=%v) 视频=%d 备注=%s",
		res.TopicsGenerated, res.ArticleID, res.ArticlePushed, res.VideoID, res.Notes)
	return nil
}
