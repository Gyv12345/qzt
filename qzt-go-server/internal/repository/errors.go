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
