package service

import (
	"context"

	"gorm.io/gorm"

	"qzt-go-server/internal/repository"
)

// helpers.go approval service 内部辅助函数。

// repoDB 返回当前 context 下的 *gorm.DB(事务内复用事务,否则全局 DB)。
func repoDB(ctx context.Context) *gorm.DB { return repository.DBFrom(ctx) }
