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
}

// countLike 统计指定 model 表中 column 列 LIKE "前缀+日期%" 的记录数。
func countLike(model interface{}, column string) func(ctx context.Context, prefix, datePart string) (int64, error) {
	return func(ctx context.Context, prefix, datePart string) (int64, error) {
		var n int64
		err := repository.DBFrom(ctx).Model(model).
			Where(column+" LIKE ?", prefix+datePart+"%").
			Where(column + " != ''").
			Count(&n).Error
		return n, err
	}
}
