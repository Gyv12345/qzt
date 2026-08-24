package oa

import (
	"context"

	oamodel "qzt-go-server/internal/model/oa"
	"qzt-go-server/internal/repository"
	"qzt-go-server/internal/pkg/datascope"
)

// work_log.go OA 工作日志 repository。

type WorkLogRepo struct {
	repository.BaseRepo[oamodel.OaWorkLog]
}

func NewWorkLogRepo() *WorkLogRepo { return &WorkLogRepo{} }

// PageList 分页查询。支持按类型/日期范围筛选;数据权限通过 datascope 注入。
func (r *WorkLogRepo) PageList(ctx context.Context, page, pageSize int, logType, logDate, startDate, endDate string) ([]oamodel.OaWorkLog, int64, error) {
	var list []oamodel.OaWorkLog
	q := repository.DBFrom(ctx).Model(&oamodel.OaWorkLog{})
	if logType != "" {
		q = q.Where("log_type = ?", logType)
	}
	if logDate != "" {
		q = q.Where("log_date = ?", logDate)
	}
	if startDate != "" {
		q = q.Where("log_date >= ?", startDate)
	}
	if endDate != "" {
		q = q.Where("log_date <= ?", endDate)
	}
	// 数据权限:按 creator_id 过滤
	if dsCond := datascope.BuildCond(ctx, "creator_id"); dsCond != nil {
		q = q.Where(dsCond.Query, dsCond.Args...)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	err := q.Order("id DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&list).Error
	return list, total, err
}

func (r *WorkLogRepo) Update(ctx context.Context, m *oamodel.OaWorkLog) error {
	return r.BaseRepo.Update(ctx, m, "LogType", "LogDate", "Content", "Plan", "Problems", "DeptID")
}
