package repository

import (
	"errors"
	"fmt"

	"gorm.io/gorm"
)

// errors.go repository 公共错误转换 helper(各模块 service 共用)。

// NotFoundOr 在 err 为 gorm.ErrRecordNotFound 时返回友好的业务错误消息,
// 否则原样返回 err(避免把真实 DB 故障误报成"记录不存在")。
// format 不含格式动词且无 args 时等价于 errors.New(format),
// 与历史上各模块本地的 notFoundOr 实现行为完全一致。
func NotFoundOr(err error, format string, args ...any) error {
	if errors.Is(err, gorm.ErrRecordNotFound) {
		if len(args) == 0 {
			return errors.New(format)
		}
		return fmt.Errorf(format, args...)
	}
	return err
}

// IsNotFound 报告 err 是否为 gorm.ErrRecordNotFound,供 service 层在不直接
// import gorm 的情况下区分"记录不存在"与其他 DB 故障(三路分支场景)。
func IsNotFound(err error) bool {
	return errors.Is(err, gorm.ErrRecordNotFound)
}
