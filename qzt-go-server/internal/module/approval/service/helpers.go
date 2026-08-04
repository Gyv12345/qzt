package service

import (
	"context"
	"errors"

	"gorm.io/gorm"

	"qzt-go-server/internal/repository"
)

// helpers.go approval service 内部辅助函数。

// repoDB 返回当前 context 下的 *gorm.DB(事务内复用事务,否则全局 DB)。
func repoDB(ctx context.Context) *gorm.DB { return repository.DBFrom(ctx) }

// notFoundOr 把 gorm.ErrRecordNotFound 翻译为友好消息。
func notFoundOr(err error, notFoundMsg string) error {
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return errors.New(notFoundMsg)
	}
	return err
}
