package repository

import (
	"context"

	"qzt-go-server/internal/model"
)

// storage_config.go 文件存储配置 repository(sys_storage_config v2)。
// 配置类表,读多写少;启用切换的「清全表 is_active → 置该行」在 service 层用
// repository.Transaction 保证原子性,此处只提供单行/单表操作。

// StorageConfigRepo 存储配置 repository。
type StorageConfigRepo struct {
	BaseRepo[model.SysStorageConfig]
}

func NewStorageConfigRepo() *StorageConfigRepo { return &StorageConfigRepo{} }

// GetActive 取当前生效配置(is_active=1);无生效配置返回 gorm.ErrRecordNotFound。
func (r *StorageConfigRepo) GetActive(ctx context.Context) (*model.SysStorageConfig, error) {
	return r.GetOne(ctx, &QueryOptions{Where: map[string]any{"is_active": 1}})
}

// ClearActive 事务内清空全表生效标记(调用方需在 repository.Transaction 中执行)。
func (r *StorageConfigRepo) ClearActive(ctx context.Context) error {
	return DBFrom(ctx).Model(&model.SysStorageConfig{}).Where("is_active = 1").Update("is_active", 0).Error
}

// SetActive 事务内置指定配置为生效(调用方需在 repository.Transaction 中执行)。
func (r *StorageConfigRepo) SetActive(ctx context.Context, id uint) error {
	return DBFrom(ctx).Model(&model.SysStorageConfig{}).Where("id = ?", id).Update("is_active", 1).Error
}

// CountAll 统计配置条数(含已软删除外)。判断全空表用于 yaml 播种幂等判断。
func (r *StorageConfigRepo) CountAll(ctx context.Context) (int64, error) {
	var total int64
	err := DBFrom(ctx).Unscoped().Model(&model.SysStorageConfig{}).Count(&total).Error
	return total, err
}
