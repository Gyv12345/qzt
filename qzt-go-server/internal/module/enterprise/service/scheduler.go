package service

import (
	"context"
	"fmt"

	"github.com/robfig/cron/v3"

	entmodel "qzt-go-server/internal/model/enterprise"
	"qzt-go-server/pkg/xlogger"
)

// scheduler.go 定时任务调度器。
// 启动时从 DB 加载 status=1 的任务,用 robfig/cron 注册。
// Cron 表达式用 6 段式(秒 分 时 日 月 周),与 qztcrm 的 Quartz 格式一致。
// 支持运行时增删改任务(通过 ReloadAll)。

// JobScheduler 定时任务调度器(全局单例)。
type JobScheduler struct {
	cron    *cron.Cron
	jobSvc  *JobService
	entryMap map[uint]cron.EntryID // jobID → cron entryID
}

// NewJobScheduler 创建调度器。需在 DB 初始化后调用。
func NewJobScheduler() *JobScheduler {
	return &JobScheduler{
		cron:     cron.New(cron.WithSeconds(), cron.WithChain(cron.Recover(cron.DefaultLogger))),
		jobSvc:   NewJobService(),
		entryMap: make(map[uint]cron.EntryID),
	}
}

// Start 启动调度器:加载全部已启用任务,开始调度。
func (s *JobScheduler) Start(ctx context.Context) error {
	if err := s.ReloadAll(ctx); err != nil {
		return err
	}
	s.cron.Start()
	xlogger.InfofCtx(ctx, "定时任务调度器已启动,共 %d 个任务", len(s.entryMap))
	return nil
}

// Stop 停止调度器。
func (s *JobScheduler) Stop() {
	if s.cron != nil {
		ctx := s.cron.Stop()
		<-ctx.Done()
	}
}

// ReloadAll 重新加载全部已启用任务(先清后加)。任务增删改后调用。
func (s *JobScheduler) ReloadAll(ctx context.Context) error {
	jobs, err := s.jobSvc.ListEnabled(ctx)
	if err != nil {
		return fmt.Errorf("加载定时任务失败: %w", err)
	}

	// 移除全部已注册的 cron entry
	for jobID, entryID := range s.entryMap {
		s.cron.Remove(entryID)
		delete(s.entryMap, jobID)
	}

	// 重新注册
	for i := range jobs {
		job := jobs[i] // 避免闭包捕获循环变量
		if err := s.addJob(ctx, &job); err != nil {
			xlogger.ErrorfCtx(ctx, "注册定时任务失败 jobID=%d name=%s cron=%s: %v",
				job.ID, job.JobName, job.CronExpression, err)
		}
	}
	return nil
}

// addJob 注册单个任务到 cron。
func (s *JobScheduler) addJob(ctx context.Context, job *entmodel.SysJob) error {
	entryID, err := s.cron.AddFunc(job.CronExpression, func() {
		// 每次执行都用新的 context(不携带 HTTP 上下文)
		s.jobSvc.executeJob(context.Background(), job, entmodel.JobTriggerSchedule)
	})
	if err != nil {
		return fmt.Errorf("解析 cron 表达式 %q 失败: %w", job.CronExpression, err)
	}
	s.entryMap[job.ID] = entryID
	xlogger.InfofCtx(ctx, "已注册定时任务: id=%d name=%s cron=%s handler=%s",
		job.ID, job.JobName, job.CronExpression, job.BeanClass)
	return nil
}
