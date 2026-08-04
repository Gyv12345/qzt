package repository

import (
	"context"

	"qzt-go-server/internal/model"
)

// storage_config.go 文件存储配置 repository。
// 全局单条记录(id=1)。

type StorageConfigRepo struct {
	BaseRepo[model.SysStorageConfig]
}

func NewStorageConfigRepo() *StorageConfigRepo { return &StorageConfigRepo{} }

// Get 获取唯一的存储配置记录(id=1)。不存在返回 ErrRecordNotFound。
func (r *StorageConfigRepo) Get(ctx context.Context) (*model.SysStorageConfig, error) {
	var cfg model.SysStorageConfig
	if err := dbFrom(ctx).First(&cfg, 1).Error; err != nil {
		return nil, err
	}
	return &cfg, nil
}

// Update 更新配置(仅 id=1)。
func (r *StorageConfigRepo) Update(ctx context.Context, cfg *model.SysStorageConfig) error {
	return r.BaseRepo.Update(ctx, cfg,
		"Driver", "LocalPath", "ResourceDomain",
		"OSSEndpoint", "OSSAccessKeyID", "OSSAccessKeySecret", "OSSBucketName", "OSSCustomDomain",
		"MaxUploadMB", "Remark")
}

// EnsureConfig 确保配置记录存在(id=1)。不存在则创建。
func (r *StorageConfigRepo) EnsureConfig(ctx context.Context, cfg *model.SysStorageConfig) error {
	var existing model.SysStorageConfig
	err := dbFrom(ctx).First(&existing, 1).Error
	if err == nil {
		return nil // 已存在
	}
	cfg.ID = 1
	return dbFrom(ctx).Create(cfg).Error
}
