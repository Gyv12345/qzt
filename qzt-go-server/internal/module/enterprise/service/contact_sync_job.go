package service

// contact_sync_job.go 通讯录同步定时任务注册(P32)。
//
// bean_class:contact.sync.dingtalk / contact.sync.feishu,
// cron 在 docs/sql/p32_im_sync.sql 注册(每日 02:00 / 02:30,6 段式)。
// enterprise/service 包被 handler import,init() 必然执行,
// 无需改 main.go(调度器已无条件启动,见 scheduler.go/JobService)。

import (
	"context"

	"qzt-go-server/internal/model"
	"qzt-go-server/pkg/xlogger"
)

func init() {
	RegisterJobHandler("contact.sync.dingtalk", &contactSyncJob{platform: model.IDSourceDingtalk})
	RegisterJobHandler("contact.sync.feishu", &contactSyncJob{platform: model.IDSourceFeishu})
}

// contactSyncJob 单平台通讯录同步任务。
type contactSyncJob struct{ platform string }

// Execute 平台未启用时 Sync 返回业务错误(计入任务失败日志),不静默吞掉——
// 管理员在任务日志里能直接看到「未启用/配置不完整」原因。
func (h *contactSyncJob) Execute(ctx context.Context) error {
	res, err := NewContactSyncService().Sync(ctx, h.platform)
	if res != nil {
		xlogger.InfofCtx(ctx, "定时通讯录同步 job 结束 platform=%s result=%+v", h.platform, res)
	}
	return err
}
