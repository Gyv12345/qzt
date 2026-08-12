package service

// esign_job.go 电子签定时任务:扫描 PENDING/FAILED 任务渲染签署 PDF。
// 在包加载时通过 init() 注册到 enterprise 调度框架(JobHandlerRegistry),
// 由 sys_job 表中 status=1 且 bean_class='crm.esign.retry' 的记录按 cron 表达式触发。

import (
	"context"

	entsvc "qzt-go-server/internal/module/enterprise/service"
)

func init() {
	entsvc.RegisterJobHandler("crm.esign.retry", &esignRetryJob{})
}

// esignRetryJob 电子签 PDF 生成/重试任务(半自动:渲染成功后停在 READY,不自动发起签署)。
type esignRetryJob struct{}

// Execute 扫描 PENDING(新任务立即渲染)与 FAILED(退避到期重试),生成签署 PDF。
// 总开关 esign.enabled=false 时 ProcessPendingTasks 内部直接返回。
func (h *esignRetryJob) Execute(ctx context.Context) error {
	return NewEsignService().ProcessPendingTasks(ctx)
}
