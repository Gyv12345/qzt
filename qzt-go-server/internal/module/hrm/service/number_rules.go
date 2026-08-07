package service

import (
	"context"

	hrmmodel "qzt-go-server/internal/model/hrm"
	"qzt-go-server/internal/pkg/numbergen"
	"qzt-go-server/internal/repository"
)

// number_rules.go 注册 HRM 各业务的编号规则到公共 numbergen 包。

func init() {
	// 请假 QJ
	numbergen.Register("leave", numbergen.Rule{
		Enabled: true, Prefix: "QJ", DateFormat: "YYYYMMDD", SeqWidth: 3,
		CountFunc: func(ctx context.Context, prefix, datePart string) (int64, error) {
			var n int64
			err := repository.DBFrom(ctx).Model(&hrmmodel.HrmLeave{}).
				Where("leave_no LIKE ?", prefix+datePart+"%").
				Where("leave_no != ''").
				Count(&n).Error
			return n, err
		},
	})

	// 加班 JB
	numbergen.Register("overtime", numbergen.Rule{
		Enabled: true, Prefix: "JB", DateFormat: "YYYYMMDD", SeqWidth: 3,
		CountFunc: func(ctx context.Context, prefix, datePart string) (int64, error) {
			var n int64
			err := repository.DBFrom(ctx).Model(&hrmmodel.HrmOvertime{}).
				Where("overtime_no LIKE ?", prefix+datePart+"%").
				Where("overtime_no != ''").
				Count(&n).Error
			return n, err
		},
	})

	// 招聘职位 ZP
	numbergen.Register("job", numbergen.Rule{
		Enabled: true, Prefix: "ZP", DateFormat: "YYYYMMDD", SeqWidth: 3,
		CountFunc: func(ctx context.Context, prefix, datePart string) (int64, error) {
			var n int64
			err := repository.DBFrom(ctx).Model(&hrmmodel.HrmJob{}).
				Where("job_no LIKE ?", prefix+datePart+"%").
				Where("job_no != ''").
				Count(&n).Error
			return n, err
		},
	})

	// 绩效考核 JX
	numbergen.Register("performance", numbergen.Rule{
		Enabled: true, Prefix: "JX", DateFormat: "YYYYMMDD", SeqWidth: 3,
		CountFunc: func(ctx context.Context, prefix, datePart string) (int64, error) {
			var n int64
			err := repository.DBFrom(ctx).Model(&hrmmodel.HrmPerformance{}).
				Where("perf_no LIKE ?", prefix+datePart+"%").
				Where("perf_no != ''").
				Count(&n).Error
			return n, err
		},
	})
}
