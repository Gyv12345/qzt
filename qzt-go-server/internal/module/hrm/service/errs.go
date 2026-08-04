package service

import (
	"errors"

	"gorm.io/gorm"
)

// errs.go HRM service 错误处理辅助。

// notFoundOr 把 gorm.ErrRecordNotFound 翻译为友好消息,其余错误原样上抛。
func notFoundOr(err error, notFoundMsg string) error {
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return errors.New(notFoundMsg)
	}
	return err
}
