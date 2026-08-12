package service

import (
	"context"

	entsvc "qzt-go-server/internal/module/enterprise/service"
)

// wecom_clock_job.go 企微打卡数据同步定时任务。
//
// bean_class=hrm.wecom.clock_sync,cron 在 docs/sql/wecom_clock.sql 注册(每小时整点)。
// hrm/service 包已被 handler import,init() 必然执行,无需改 main.go(调度器已无条件启动)。

func init() {
	entsvc.RegisterJobHandler("hrm.wecom.clock_sync", &wecomClockSyncJob{})
}

type wecomClockSyncJob struct{}

// Execute 执行企微打卡同步(最近 6 小时窗口,幂等)。
func (h *wecomClockSyncJob) Execute(ctx context.Context) error {
	return NewWecomClockSyncService().SyncWecomClock(ctx)
}
