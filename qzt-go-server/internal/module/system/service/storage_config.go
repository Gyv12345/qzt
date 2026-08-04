package service

import (
	"context"
	"errors"

	"github.com/aliyun/aliyun-oss-go-sdk/oss"

	"qzt-go-server/internal/app"
	"qzt-go-server/internal/model"
	"qzt-go-server/internal/pkg/storage"
	"qzt-go-server/internal/repository"
)

// storage_config.go 文件存储配置服务(后台管理)。
// 修改后自动重建 app.Uploader(动态切换 local/oss 无需重启)。

// StorageConfigService 文件存储配置服务。
type StorageConfigService struct {
	repo *repository.StorageConfigRepo
}

func NewStorageConfigService() *StorageConfigService {
	return &StorageConfigService{repo: repository.NewStorageConfigRepo()}
}

// Get 获取存储配置(secret 脱敏,由 model json:"-" 保证)。
func (s *StorageConfigService) Get(ctx context.Context) (*model.SysStorageConfig, error) {
	cfg, err := s.repo.Get(ctx)
	if err != nil {
		return nil, notFoundOr(err, "存储配置不存在")
	}
	return cfg, nil
}

// EnsureConfig 启动时确保 DB 有配置记录。若不存在,用 yaml 默认值创建。
func (s *StorageConfigService) EnsureConfig(ctx context.Context, defaultCfg *model.SysStorageConfig) error {
	_, err := s.repo.Get(ctx)
	if err == nil {
		return nil // 已存在
	}
	// 不存在 → 创建默认记录(id=1)
	defaultCfg.ID = 1
	if defaultCfg.Driver == "" {
		defaultCfg.Driver = model.StorageDriverLocal
	}
	if defaultCfg.MaxUploadMB == 0 {
		defaultCfg.MaxUploadMB = 20
	}
	return s.repo.Create(ctx, defaultCfg)
}

// UpdateStorageConfigRequest 更新存储配置请求。
// OSSAccessKeySecret 为空时保留原值(不修改)。
type UpdateStorageConfigRequest struct {
	Driver             string `json:"driver" binding:"required"`
	LocalPath          string `json:"local_path"`
	ResourceDomain     string `json:"resource_domain"`
	OSSEndpoint        string `json:"oss_endpoint"`
	OSSAccessKeyID     string `json:"oss_access_key_id"`
	OSSAccessKeySecret string `json:"oss_access_key_secret"`
	OSSBucketName      string `json:"oss_bucket_name"`
	OSSCustomDomain    string `json:"oss_custom_domain"`
	MaxUploadMB        int    `json:"max_upload_mb"`
	Remark             string `json:"remark"`
}

// Update 更新存储配置并重建 Uploader。
func (s *StorageConfigService) Update(ctx context.Context, req *UpdateStorageConfigRequest) error {
	if req.Driver != model.StorageDriverLocal && req.Driver != model.StorageDriverOSS {
		return errors.New("driver 只能是 local 或 oss")
	}

	cfg, err := s.repo.Get(ctx)
	if err != nil {
		return notFoundOr(err, "存储配置不存在")
	}

	cfg.Driver = req.Driver
	cfg.LocalPath = req.LocalPath
	cfg.ResourceDomain = req.ResourceDomain
	cfg.OSSEndpoint = req.OSSEndpoint
	cfg.OSSAccessKeyID = req.OSSAccessKeyID
	cfg.OSSBucketName = req.OSSBucketName
	cfg.OSSCustomDomain = req.OSSCustomDomain
	cfg.MaxUploadMB = req.MaxUploadMB
	cfg.Remark = req.Remark
	if req.OSSAccessKeySecret != "" {
		cfg.OSSAccessKeySecret = req.OSSAccessKeySecret // 空串 = 不改
	}

	// 保存到 DB
	if err := s.repo.Update(ctx, cfg); err != nil {
		return err
	}

	// 重建 Uploader
	return s.reloadUploader(cfg)
}

// reloadUploader 按配置重建 app.Uploader。
func (s *StorageConfigService) reloadUploader(cfg *model.SysStorageConfig) error {
	return app.ReloadUploader(
		cfg.Driver,
		cfg.LocalPath,
		cfg.ResourceDomain,
		cfg.OSSEndpoint,
		cfg.OSSAccessKeyID,
		cfg.OSSAccessKeySecret,
		cfg.OSSBucketName,
		cfg.OSSCustomDomain,
		cfg.MaxUploadMB,
	)
}

// TestConnection 测试 OSS 连接(验证 AK/SK/Bucket 是否有效)。
// 仅 driver=oss 时有意义;local 模式检查目录是否存在。
func (s *StorageConfigService) TestConnection(ctx context.Context, req *UpdateStorageConfigRequest) error {
	if req.Driver == model.StorageDriverLocal {
		// local: 尝试初始化(检查目录权限)
		_, err := storage.NewLocal(storage.LocalConfig{
			Directory:    req.LocalPath,
			PublicURL:    req.ResourceDomain,
			MaxBytes:     1024,
			AllowedTypes: map[string]string{"png": "image/png"},
		})
		return err
	}

	// oss: 尝试连接 + 验证 Bucket 存在
	if req.OSSEndpoint == "" || req.OSSAccessKeyID == "" || req.OSSAccessKeySecret == "" || req.OSSBucketName == "" {
		return errors.New("OSS 配置不完整(endpoint/access_key_id/access_key_secret/bucket_name 均必填)")
	}
	client, err := oss.New(req.OSSEndpoint, req.OSSAccessKeyID, req.OSSAccessKeySecret)
	if err != nil {
		return errors.New("创建 OSS 客户端失败: " + err.Error())
	}
	// 轻量验证:列出 Bucket(验证 AK/SK 是否有效),再检查目标 Bucket 是否存在
	result, err := client.ListBuckets()
	if err != nil {
		return errors.New("OSS 连接验证失败(检查 AK/SK/Endpoint): " + err.Error())
	}
	for _, b := range result.Buckets {
		if b.Name == req.OSSBucketName {
			return nil // 找到目标 Bucket,连接成功
		}
	}
	return errors.New("OSS 连接成功,但未找到 Bucket: " + req.OSSBucketName)
}

// Reload 手动重建 Uploader(从 DB 读当前配置)。
func (s *StorageConfigService) Reload(ctx context.Context) error {
	cfg, err := s.repo.Get(ctx)
	if err != nil {
		return notFoundOr(err, "存储配置不存在")
	}
	return s.reloadUploader(cfg)
}
