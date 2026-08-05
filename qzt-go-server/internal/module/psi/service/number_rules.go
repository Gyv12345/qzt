package service

import (
	"context"

	psimodel "qzt-go-server/internal/model/psi"
	"qzt-go-server/internal/pkg/numbergen"
	"qzt-go-server/internal/repository"
)

// number_rules.go 注册 PSI 各业务的编号规则到公共 numbergen 包。

func init() {
	// 供应商 GYS
	numbergen.Register("supplier", numbergen.Rule{
		Enabled: true, Prefix: "GYS", DateFormat: "YYYYMMDD", SeqWidth: 3,
		CountFunc: func(ctx context.Context, prefix, datePart string) (int64, error) {
			var n int64
			err := repository.DBFrom(ctx).Model(&psimodel.PsiSupplier{}).
				Where("supplier_no LIKE ?", prefix+datePart+"%").
				Where("supplier_no != ''").
				Count(&n).Error
			return n, err
		},
	})
}
