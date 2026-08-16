package service

import (
	"context"

	"qzt-go-server/internal/pkg/numbergen"
	psirepo "qzt-go-server/internal/repository/psi"
)

// number_rules.go 注册 PSI 各业务的编号规则到公共 numbergen 包。
// 前缀计数查询收口在 repository/psi 各 repo 的 CountByNoPrefix。

func init() {
	// 供应商 GYS
	numbergen.Register("supplier", numbergen.Rule{
		Enabled: true, Prefix: "GYS", DateFormat: "YYYYMMDD", SeqWidth: 3,
		CountFunc: func(ctx context.Context, prefix, datePart string) (int64, error) {
			return psirepo.NewSupplierRepo().CountByNoPrefix(ctx, prefix+datePart)
		},
	})
}
