package service

import (
	"context"

	sfmodel "qzt-go-server/internal/model/storefront"
	"qzt-go-server/internal/pkg/numbergen"
	"qzt-go-server/internal/repository"
)

// number_rules.go 注册独立站订单编号规则到公共 numbergen 包。
// init() 在包加载时自动执行,无需手动调用。

func init() {
	// 独立站订单 SF + yyyyMMdd + 3 位序号
	numbergen.Register("storefront_order", numbergen.Rule{
		Enabled: true, Prefix: "SF", DateFormat: "YYYYMMDD", SeqWidth: 3,
		CountFunc: func(ctx context.Context, prefix, datePart string) (int64, error) {
			var n int64
			err := repository.DBFrom(ctx).Model(&sfmodel.StorefrontOrder{}).
				Where("order_no LIKE ?", prefix+datePart+"%").
				Where("order_no != ''").Count(&n).Error
			return n, err
		},
	})
}
