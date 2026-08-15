package service

import (
	"context"
	"fmt"
	"runtime/debug"
	"time"

	entmodel "qzt-go-server/internal/model/enterprise"
	"qzt-go-server/internal/repository"
	entrepo "qzt-go-server/internal/repository/enterprise"
	"qzt-go-server/pkg/xlogger"
)

// job.go 定时任务服务。
// 设计:sys_job.bean_class 存「处理器注册名」,由全局 JobHandlerRegistry 查找执行。
// 调度器(JobScheduler)在 app 启动时从 DB 加载 status=1 的任务,用 robfig/cron 注册。
// 执行时记录 sys_job_log(成功/失败 + 异常堆栈 + 耗时)。

// JobHandler 定时任务处理器接口。各业务模块实现并注册到 JobHandlerRegistry。
type JobHandler interface {
	Execute(ctx context.Context) error
}

// JobHandlerRegistry 处理器注册表(全局,启动时填充)。
var JobHandlerRegistry = map[string]JobHandler{}

// RegisterJobHandler 注册定时任务处理器。
func RegisterJobHandler(name string, handler JobHandler) {
	JobHandlerRegistry[name] = handler
}

// JobService 定时任务配置管理(CRUD + 手动触发 + 执行日志)。
type JobService struct {
	repo     *entrepo.JobRepo
	logRepo  *entrepo.JobLogRepo
}

func NewJobService() *JobService {
	return &JobService{repo: entrepo.NewJobRepo(), logRepo: entrepo.NewJobLogRepo()}
}

// CreateSysJobRequest 创建任务请求。
type CreateSysJobRequest struct {
	JobName        string `json:"job_name" binding:"required"`
	JobGroup       string `json:"job_group"`
	CronExpression string `json:"cron_expression" binding:"required"`
	BeanClass      string `json:"bean_class" binding:"required"`
	Status         int8   `json:"status"`
	Remark         string `json:"remark"`
}

// Create 创建任务。
func (s *JobService) Create(ctx context.Context, req *CreateSysJobRequest) (*entmodel.SysJob, error) {
	if _, ok := JobHandlerRegistry[req.BeanClass]; !ok {
		return nil, fmt.Errorf("处理器 %q 未注册", req.BeanClass)
	}
	status := req.Status
	if status == 0 {
		status = entmodel.JobStatusRun
	}
	job := &entmodel.SysJob{
		JobName:        req.JobName,
		JobGroup:       req.JobGroup,
		CronExpression: req.CronExpression,
		BeanClass:      req.BeanClass,
		Status:         status,
		Remark:         req.Remark,
	}
	if err := s.repo.Create(ctx, job); err != nil {
		return nil, err
	}
	return job, nil
}

// GetByID 任务详情。
func (s *JobService) GetByID(ctx context.Context, id uint) (*entmodel.SysJob, error) {
	job, err := s.repo.GetByID(ctx, id)
	return job, repository.NotFoundOr(err, "任务不存在")
}

// UpdateSysJobRequest 更新任务请求。
type UpdateSysJobRequest struct {
	JobName        string `json:"job_name" binding:"required"`
	JobGroup       string `json:"job_group"`
	CronExpression string `json:"cron_expression" binding:"required"`
	BeanClass      string `json:"bean_class" binding:"required"`
	Status         int8   `json:"status"`
	Remark         string `json:"remark"`
}

// Update 更新任务。
func (s *JobService) Update(ctx context.Context, id uint, req *UpdateSysJobRequest) error {
	job, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return repository.NotFoundOr(err, "任务不存在")
	}
	job.JobName = req.JobName
	job.JobGroup = req.JobGroup
	job.CronExpression = req.CronExpression
	job.BeanClass = req.BeanClass
	job.Status = req.Status
	job.Remark = req.Remark
	return s.repo.Update(ctx, job)
}

// Delete 删除任务。
func (s *JobService) Delete(ctx context.Context, id uint) error {
	if _, err := s.repo.GetByID(ctx, id); err != nil {
		return repository.NotFoundOr(err, "任务不存在")
	}
	return s.repo.Delete(ctx, id)
}

// List 分页查询任务。
func (s *JobService) List(ctx context.Context, page, pageSize int) ([]entmodel.SysJob, int64, error) {
	return s.repo.PageList(ctx, page, pageSize, nil)
}

// ListEnabled 列出所有启用的任务(调度器启动时加载)。
func (s *JobService) ListEnabled(ctx context.Context) ([]entmodel.SysJob, error) {
	return s.repo.ListEnabled(ctx)
}

// RunOnce 手动触发执行一次任务。
// 注意:用独立 context 而非请求 ctx —— goroutine 在响应返回后继续执行,
// 请求 ctx 会被取消导致任务内的 DB 查询报 "context canceled"。
func (s *JobService) RunOnce(ctx context.Context, id uint) error {
	job, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return repository.NotFoundOr(err, "任务不存在")
	}
	go s.executeJob(context.Background(), job, entmodel.JobTriggerManual)
	return nil
}

// executeJob 执行单个任务并记录日志。per-job panic 恢复,不影响调度器。
func (s *JobService) executeJob(ctx context.Context, job *entmodel.SysJob, triggerSource string) {
	start := time.Now()
	logEntry := &entmodel.SysJobLog{
		JobID:         job.ID,
		JobName:       job.JobName,
		JobGroup:      job.JobGroup,
		BeanClass:     job.BeanClass,
		TriggerSource: triggerSource,
	}

	defer func() {
		logEntry.CostTime = time.Since(start).Milliseconds()
		if err := s.logRepo.Create(context.Background(), logEntry); err != nil {
			xlogger.ErrorfCtx(ctx, "写入任务日志失败 jobID=%d: %v", job.ID, err)
		}
	}()

	handler, ok := JobHandlerRegistry[job.BeanClass]
	if !ok {
		logEntry.Status = entmodel.JobLogFail
		logEntry.Message = fmt.Sprintf("处理器 %q 未注册", job.BeanClass)
		return
	}

	defer func() {
		if r := recover(); r != nil {
			logEntry.Status = entmodel.JobLogFail
			logEntry.Message = fmt.Sprintf("panic: %v", r)
			logEntry.ExceptionInfo = string(debug.Stack())
			xlogger.ErrorfCtx(ctx, "定时任务 panic jobID=%d name=%s: %v\n%s", job.ID, job.JobName, r, debug.Stack())
		}
	}()

	if err := handler.Execute(ctx); err != nil {
		logEntry.Status = entmodel.JobLogFail
		logEntry.Message = err.Error()
		xlogger.ErrorfCtx(ctx, "定时任务执行失败 jobID=%d name=%s: %v", job.ID, job.JobName, err)
		return
	}
	logEntry.Status = entmodel.JobLogSuccess
	logEntry.Message = "执行成功"
}

// ListLogs 任务执行日志分页(可选按 jobID 过滤)。
func (s *JobService) ListLogs(ctx context.Context, page, pageSize int, jobID uint) ([]entmodel.SysJobLog, int64, error) {
	opts := &repository.QueryOptions{Order: []string{"id DESC"}}
	if jobID > 0 {
		opts.Where = map[string]any{"job_id": jobID}
	}
	return s.logRepo.PageList(ctx, page, pageSize, opts)
}
