package service

import (
	"errors"

	"gorm.io/gorm"
)

// helpers.go enterprise 服务层共享辅助函数。

// notFoundOr 把 gorm.ErrRecordNotFound 翻译为友好消息。
func notFoundOr(err error, notFoundMsg string) error {
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return errors.New(notFoundMsg)
	}
	return err
}
