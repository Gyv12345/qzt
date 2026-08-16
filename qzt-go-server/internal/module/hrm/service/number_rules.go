package service

import (
	"context"

	"qzt-go-server/internal/pkg/numbergen"
	hrmrepo "qzt-go-server/internal/repository/hrm"
)

// number_rules.go 注册 HRM 各业务的编号规则到公共 numbergen 包。
// 前缀计数查询收口在 repository/hrm 各 repo 的 CountByNoPrefix。

// 编号规则用的只读 repo(init 注册时 service 实例尚未创建,用包级变量持有)。
var (
	leaveNoRepo       = hrmrepo.NewLeaveRepo()
	overtimeNoRepo    = hrmrepo.NewOvertimeRepo()
	jobNoRepo         = hrmrepo.NewJobRepo()
	performanceNoRepo = hrmrepo.NewPerformanceRepo()
)

func init() {
	// 请假 QJ
	numbergen.Register("leave", numbergen.Rule{
		Enabled: true, Prefix: "QJ", DateFormat: "YYYYMMDD", SeqWidth: 3,
		CountFunc: func(ctx context.Context, prefix, datePart string) (int64, error) {
			return leaveNoRepo.CountByNoPrefix(ctx, prefix+datePart)
		},
	})

	// 加班 JB
	numbergen.Register("overtime", numbergen.Rule{
		Enabled: true, Prefix: "JB", DateFormat: "YYYYMMDD", SeqWidth: 3,
		CountFunc: func(ctx context.Context, prefix, datePart string) (int64, error) {
			return overtimeNoRepo.CountByNoPrefix(ctx, prefix+datePart)
		},
	})

	// 招聘职位 ZP
	numbergen.Register("job", numbergen.Rule{
		Enabled: true, Prefix: "ZP", DateFormat: "YYYYMMDD", SeqWidth: 3,
		CountFunc: func(ctx context.Context, prefix, datePart string) (int64, error) {
			return jobNoRepo.CountByNoPrefix(ctx, prefix+datePart)
		},
	})

	// 绩效考核 JX
	numbergen.Register("performance", numbergen.Rule{
		Enabled: true, Prefix: "JX", DateFormat: "YYYYMMDD", SeqWidth: 3,
		CountFunc: func(ctx context.Context, prefix, datePart string) (int64, error) {
			return performanceNoRepo.CountByNoPrefix(ctx, prefix+datePart)
		},
	})
}
