package service

import (
	"context"
	"strings"

	entsvc "qzt-go-server/internal/module/enterprise/service"
	mktrepo "qzt-go-server/internal/repository/marketing"
	"qzt-go-server/pkg/xlogger"
)

// job.go 飞鱼线索拉取定时任务。
//
// bean_class=marketing.feiyu.pull,cron 在 docs/sql/marketing.sql 注册(每 15 分钟)。
// marketing/service 包已被 handler import,init() 必然执行,无需改 main.go
// (调度器已无条件启动)。注意 sys_job 记录插入后需重启服务才会被调度器加载。

func init() {
	entsvc.RegisterJobHandler("marketing.feiyu.pull", &feiyuPullJob{})
}

type feiyuPullJob struct{}

// Execute 遍历「启用且已授权」的账号逐个同步,单账号失败记日志不中断其余账号。
func (h *feiyuPullJob) Execute(ctx context.Context) error {
	accounts, err := mktrepo.NewAccountRepo().ListSyncable(ctx)
	if err != nil {
		return err
	}
	if len(accounts) == 0 {
		return nil
	}
	svc := NewSyncService()
	var errs []string
	for _, account := range accounts {
		result, err := svc.SyncAccount(ctx, account.ID)
		if err != nil {
			xlogger.ErrorfCtx(ctx, "抖音线索同步失败(account=%d %s): %v", account.ID, account.Name, err)
			errs = append(errs, account.Name+": "+err.Error())
			continue
		}
		if result.Inserted+result.Skipped+result.Failed > 0 {
			xlogger.InfofCtx(ctx, "抖音线索同步完成(account=%d %s): 入库 %d, 跳过 %d, 失败 %d",
				account.ID, account.Name, result.Inserted, result.Skipped, result.Failed)
		}
	}
	if len(errs) == len(accounts) {
		return &syncAllFailedError{msg: strings.Join(errs, "; ")}
	}
	return nil
}

// syncAllFailedError 全部账号失败时返回,让 sys_job_log 记为失败;部分失败视为成功。
type syncAllFailedError struct{ msg string }

func (e *syncAllFailedError) Error() string { return "全部账号同步失败: " + e.msg }
