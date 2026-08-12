package service

import (
	"context"

	oamodel "qzt-go-server/internal/model/oa"
	"qzt-go-server/internal/pkg/numbergen"
	"qzt-go-server/internal/repository"
)

// number_rules.go 注册 OA 编号规则到 numbergen。init() 包加载时执行。

func init() {
	// 报销单 BX
	numbergen.Register("expense", numbergen.Rule{
		Enabled: true, Prefix: "BX", DateFormat: "YYYYMMDD", SeqWidth: 3,
		CountFunc: countLike(&oamodel.OaExpense{}, "expense_no"),
	})
	// 出差 CC
	numbergen.Register("trip", numbergen.Rule{
		Enabled: true, Prefix: "CC", DateFormat: "YYYYMMDD", SeqWidth: 3,
		CountFunc: countLike(&oamodel.OaBusinessTrip{}, "trip_no"),
	})
	// 借款 JK
	numbergen.Register("loan", numbergen.Rule{
		Enabled: true, Prefix: "JK", DateFormat: "YYYYMMDD", SeqWidth: 3,
		CountFunc: countLike(&oamodel.OaLoan{}, "loan_no"),
	})
	// 工作日志 RZ
	numbergen.Register("worklog", numbergen.Rule{
		Enabled: true, Prefix: "RZ", DateFormat: "YYYYMMDD", SeqWidth: 3,
		CountFunc: countLike(&oamodel.OaWorkLog{}, "log_no"),
	})
	// 日程 RC
	numbergen.Register("schedule", numbergen.Rule{
		Enabled: true, Prefix: "RC", DateFormat: "YYYYMMDD", SeqWidth: 3,
		CountFunc: countLike(&oamodel.OaSchedule{}, "schedule_no"),
	})
	// 会议预订 HY
	numbergen.Register("meeting", numbergen.Rule{
		Enabled: true, Prefix: "HY", DateFormat: "YYYYMMDD", SeqWidth: 3,
		CountFunc: countLike(&oamodel.OaMeetingBooking{}, "booking_no"),
	})
	// 自定义表单 BD
	numbergen.Register("form", numbergen.Rule{
		Enabled: true, Prefix: "BD", DateFormat: "YYYYMMDD", SeqWidth: 3,
		CountFunc: countLike(&oamodel.OaFormData{}, "data_no"),
	})
}

// countLike 统计指定 model 表中 column 列 LIKE "前缀+日期%" 的记录数。
func countLike(model any, column string) func(ctx context.Context, prefix, datePart string) (int64, error) {
	return func(ctx context.Context, prefix, datePart string) (int64, error) {
		var n int64
		err := repository.DBFrom(ctx).Model(model).
			Where(column+" LIKE ?", prefix+datePart+"%").
			Where(column + " != ''").
			Count(&n).Error
		return n, err
	}
}
