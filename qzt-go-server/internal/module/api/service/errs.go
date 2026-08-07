package service

import (
	"errors"

	"gorm.io/gorm"
)

// errs.go service 层错误转换 helper。

// notFoundOr 在 err 为 gorm.ErrRecordNotFound 时返回友好的 notFoundMsg,
// 否则原样返回 err(避免把真实 DB 故障误报成"记录不存在")。
func notFoundOr(err error, notFoundMsg string) error {
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return errors.New(notFoundMsg)
	}
	return err
}
