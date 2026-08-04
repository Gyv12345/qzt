package hrm

import (
	"context"

	"gorm.io/gorm"

	"qzt-go-server/internal/repository"
)

// helpers.go HRM repository 内部便捷函数。

// repoDB 返回当前 context 下的 *gorm.DB(事务内复用事务,否则全局 DB)。
func repoDB(ctx context.Context) *gorm.DB { return repository.DBFrom(ctx) }
