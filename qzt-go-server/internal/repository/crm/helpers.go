package crm

import (
	"context"

	"gorm.io/gorm"

	"qzt-go-server/internal/repository"
)

// helpers.go CRM repository 内部便捷函数。

// repoDB 返回当前 context 下的 *gorm.DB(事务内复用事务,否则全局 DB)。
func repoDB(ctx context.Context) *gorm.DB { return repository.DBFrom(ctx) }

// DeleteByColumn 按列名软删除(GORM 软删除自动加 deleted_at 条件)。供 service 级联删除用。
// model 为表对应的 model 实例(如 &CrmCustomerContact{}),column/value 定位要删的行。
func DeleteByColumn(ctx context.Context, model any, column string, value uint) error {
	return repoDB(ctx).Where(column+" = ?", value).Delete(model).Error
}
