package enterprise

import (
	"context"

	"gorm.io/gorm"

	entmodel "qzt-go-server/internal/model/enterprise"
	"qzt-go-server/internal/repository"
)

// job.go 定时任务 repository。

// repoDB 返回当前 context 下的 *gorm.DB。
func repoDB(ctx context.Context) *gorm.DB { return repository.DBFrom(ctx) }
// 含 ListEnabled(启动时加载已启用的任务)和 WriteLog(记录执行日志)。

type JobRepo struct {
	repository.BaseRepo[entmodel.SysJob]
}

func NewJobRepo() *JobRepo { return &JobRepo{} }

// Update 覆写泛型版本,只更新业务字段。
func (r *JobRepo) Update(ctx context.Context, m *entmodel.SysJob) error {
	return r.BaseRepo.Update(ctx, m, "JobName", "JobGroup", "CronExpression", "BeanClass", "Status", "Remark")
}

// ListEnabled 列出所有启用的任务(status=1)。
func (r *JobRepo) ListEnabled(ctx context.Context) ([]entmodel.SysJob, error) {
	var list []entmodel.SysJob
	if err := repoDB(ctx).Where("status = ?", entmodel.JobStatusRun).Order("id ASC").Find(&list).Error; err != nil {
		return nil, err
	}
	return list, nil
}

// JobLogRepo 任务执行日志 repository。
type JobLogRepo struct {
	repository.BaseRepo[entmodel.SysJobLog]
}

func NewJobLogRepo() *JobLogRepo { return &JobLogRepo{} }
