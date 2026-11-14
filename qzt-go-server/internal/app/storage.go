package app

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"sync"
	"sync/atomic"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"qzt-go-server/config"
	"qzt-go-server/internal/model"
	"qzt-go-server/internal/pkg/storage"
)

const bytesPerMegabyte int64 = 1024 * 1024

// storage.go 全局文件存储单例(v2:DB 配置驱动,单条 is_active=1 生效,可热切换)。
// 启动时 InitStorage 优先读 sys_storage_config 的生效行;表为空时从 config.Storage
// (yaml + .env)播种一行入库(密钥随 yaml 读入 DB),再构建 Uploader。
// 后台「文件存储」页启用另一条配置时,service 调 ReloadStorage 原子替换实例,
// 所有上传/签名路径经 GetUploader() 懒取,即刻拿到新驱动。

// uploaderMu 保护 uploader 的读写(启动写入一次 + 后台热切换写)。
var uploaderMu sync.RWMutex

// uploader 当前文件存储驱动实例(双桶:公共+私有)。
var uploader storage.Uploader

// GetUploader 线程安全地获取当前 Uploader。所有持有方应懒取(使用时调用),
// 确保热切换后各路径拿到新实例。
func GetUploader() storage.Uploader {
	uploaderMu.RLock()
	defer uploaderMu.RUnlock()
	return uploader
}

// setUploader 线程安全地替换 Uploader。
func setUploader(u storage.Uploader) {
	uploaderMu.Lock()
	defer uploaderMu.Unlock()
	uploader = u
}

// Uploader 兼容旧代码的全局变量(handler 构造时快照)。
// 上传/签名等运行期路径请用 GetUploader() 取最新实例(热切换后旧快照失效)。
var Uploader storage.Uploader

// defaultAllowedTypes 默认允许上传的扩展名 → MIME 映射。
var defaultAllowedTypes = map[string]string{
	"jpg":  "image/jpeg",
	"jpeg": "image/jpeg",
	"png":  "image/png",
	"gif":  "image/gif",
	"webp": "image/webp",
	"pdf":  "application/pdf",
	"doc":  "application/msword",
	"docx": "application/vnd.openxmlformats.wordprocessingml.document",
	"xls":  "application/vnd.ms-excel",
	"xlsx": "application/vnd.openxmlformats.spreadsheetml.sheet",
	"zip":  "application/zip",
	"mp4":  "video/mp4",
}

// IsAllowedFileExt 判断扩展名(带点小写,如 ".png")是否在上传白名单内。
// 供 STS 直传等不经过 Uploader.Save 校验的通道复用同一份白名单。
func IsAllowedFileExt(ext string) bool {
	ext = strings.ToLower(strings.TrimSpace(ext))
	if !strings.HasPrefix(ext, ".") || len(ext) < 2 {
		return false
	}
	_, ok := defaultAllowedTypes[ext[1:]]
	return ok
}

// seedStorageConfigID yaml 播种行的固定主键(与 docs/sql/storage_v2.sql 建表配套,
// 表为空时才插入,ON DUPLICATE 幂等;后台后续管理的配置不受影响)。
const seedStorageConfigID = 1

// InitStorage 初始化全局文件存储(启动时调用一次)。
// 顺序:读 sys_storage_config 生效行 → 表为空则从 yaml 播种一行 → 构建 setUploader。
// 需在 InitDatabase 之后调用(DB 配置是数据源);yaml storage 节保留为播种来源与
// DB 异常时的兜底,不再作为唯一配置入口。
func InitStorage() error {
	var (
		active *model.SysStorageConfig
		driver string // 日志用:生效配置来源
	)
	if DB != nil {
		row, err := loadActiveStorageConfig(context.Background())
		switch {
		case err == nil:
			active = row
			driver = "db:" + row.Driver
		case errors.Is(err, gorm.ErrRecordNotFound):
			// 无生效行:表为空才从 yaml 播种(有配置但无 active 属后台数据异常,
			// 不静默改数据,落 yaml 兜底并告警,提示去后台启用一条)。
			total, cntErr := countStorageConfigs(context.Background())
			if cntErr != nil {
				return fmt.Errorf("count storage configs: %w", cntErr)
			}
			if total == 0 {
				seeded, seedErr := seedStorageConfigFromYaml(context.Background())
				if seedErr != nil {
					return fmt.Errorf("seed storage config from yaml: %w", seedErr)
				}
				active = seeded
				driver = "yaml-seed:" + seeded.Driver
			} else {
				Log.Warnf("sys_storage_config 存在 %d 条配置但无生效行(is_active=1),本次回退 yaml 存储配置;请在后台「文件存储」启用一条", total)
			}
		default:
			return fmt.Errorf("load active storage config: %w", err)
		}
	}

	var u storage.Uploader
	var err error
	if active != nil {
		u, err = BuildUploaderFromStorageConfig(active)
	} else {
		// DB 不可用(理论不发生:InitStorage 已移至 InitDatabase 之后)或无生效行的兜底。
		u, err = buildUploader(config.Get().Storage)
		if driver == "" {
			driver = "yaml-fallback:" + config.Get().Storage.Driver
		}
	}
	if err != nil {
		return err
	}
	setUploader(u)
	Uploader = u
	if active != nil && active.MaxUploadMB > 0 {
		SetActiveMaxUploadMB(active.MaxUploadMB)
	}
	Log.Infof("文件存储已初始化: source=%s", driver)
	return nil
}

// loadActiveStorageConfig / countStorageConfigs / seedStorageConfigFromYaml 直接走
// app.DB 而非 repository 包——repository 依赖 app(取全局 DB),app 启动期自举
// sys_storage_config 时反向引用会成环;此处为 app 层例外,仅供存储启动初始化使用。

// loadActiveStorageConfig 读当前生效配置行(is_active=1,软删除自动过滤)。
func loadActiveStorageConfig(ctx context.Context) (*model.SysStorageConfig, error) {
	var row model.SysStorageConfig
	if err := DB.WithContext(ctx).Where("is_active = ?", 1).First(&row).Error; err != nil {
		return nil, err
	}
	return &row, nil
}

// countStorageConfigs 统计配置条数(含软删除,Unscoped)。
func countStorageConfigs(ctx context.Context) (int64, error) {
	var total int64
	err := DB.WithContext(ctx).Unscoped().Model(&model.SysStorageConfig{}).Count(&total).Error
	return total, err
}

// seedStorageConfigFromYaml 把 config.Storage(yaml+.env)播种为 sys_storage_config
// 首条生效配置(密钥随 yaml 读入 DB,幂等:固定 ID + ON DUPLICATE DO NOTHING)。
// 仅在表为空时由 InitStorage 调用。
func seedStorageConfigFromYaml(ctx context.Context) (*model.SysStorageConfig, error) {
	cfg := config.Get().Storage
	driver := cfg.Driver
	if driver == "" {
		driver = model.StorageDriverLocal
	}
	if driver != model.StorageDriverLocal && driver != model.StorageDriverOSS {
		return nil, fmt.Errorf("yaml storage.driver 不支持播种: %q(仅 local/oss)", driver)
	}
	seed := &model.SysStorageConfig{
		ID:                     seedStorageConfigID,
		Name:                   "初始配置(yaml 播种)",
		Driver:                 driver,
		IsActive:               1,
		LocalPath:              cfg.LocalPath,
		PrivatePath:            cfg.PrivatePath,
		ResourceDomain:         cfg.ResourceDomain,
		DownloadPrefix:         cfg.DownloadPrefix,
		OSSEndpoint:            cfg.OSS.Endpoint,
		OSSAccessKeyID:         cfg.OSS.AccessKeyID,
		OSSAccessKeySecret:     cfg.OSS.AccessKeySecret,
		OSSBucketName:          cfg.OSS.BucketName,
		OSSCustomDomain:        cfg.OSS.CustomDomain,
		OSSPrivateBucketName:   cfg.OSS.PrivateBucketName,
		OSSPrivateCustomDomain: cfg.OSS.PrivateCustomDomain,
		Remark:                 "首次启动由 config storage 节自动播种,可在后台修改",
	}
	if err := DB.WithContext(ctx).Clauses(gormclauseOnConflictDoNothing()).Create(seed).Error; err != nil {
		return nil, err
	}
	return seed, nil
}

// ReloadStorage 热切换全局 Uploader(后台启用新配置且构建成功后调用)。
// 复用 setUploader 并同步兼容变量,运行期上传/签名路径即刻拿到新实例。
func ReloadStorage(u storage.Uploader) {
	setUploader(u)
	Uploader = u
	if Log != nil {
		Log.Info("文件存储已热切换,新配置即时生效")
	}
}

// activeMaxUploadMB 当前生效存储配置的单文件上限(MB);0 表示未初始化(调用方回退 yaml 值)。
// 供上传 handler 做请求体上限,保证 DB 配置热切换后上限同步生效(原子读写,无锁开销)。
var activeMaxUploadMB atomic.Int64

// SetActiveMaxUploadMB 记录当前生效配置的单文件上限(InitStorage/后台启用成功后调用)。
func SetActiveMaxUploadMB(maxMB int64) {
	activeMaxUploadMB.Store(maxMB)
}

// GetActiveMaxUploadMB 取当前生效配置的单文件上限(MB);未初始化时回退 yaml 配置值。
func GetActiveMaxUploadMB() int64 {
	if v := activeMaxUploadMB.Load(); v > 0 {
		return v
	}
	if mb := config.Get().Storage.MaxUploadMB; mb > 0 {
		return int64(mb)
	}
	return 0
}

// BuildUploaderFromStorageConfig 按 sys_storage_config 行构建 Uploader(双桶)。
// 供启动初始化与后台「启用/测试连接」复用;构建失败返回错误由调用方决定回滚/报错。
func BuildUploaderFromStorageConfig(cfg *model.SysStorageConfig) (storage.Uploader, error) {
	maxBytes := int64(50) * bytesPerMegabyte
	if cfg.MaxUploadMB > 0 {
		maxBytes = cfg.MaxUploadMB * bytesPerMegabyte
	}

	switch cfg.Driver {
	case "", model.StorageDriverLocal:
		localPath := cfg.LocalPath
		if localPath == "" {
			localPath = "./storage/public"
		}
		privatePath := cfg.PrivatePath
		if privatePath == "" {
			privatePath = "./storage/private"
		}
		// local 私有文件代理下载 URL 的签名密钥复用 JWT secret(已在启动时校验非空)。
		u, err := storage.NewLocal(storage.LocalConfig{
			Directory:        localPath,
			PrivateDirectory: privatePath,
			PublicURL:        cfg.ResourceDomain,
			SignSecret:       config.Get().JWT.JwtSecret,
			DownloadPrefix:   cfg.DownloadPrefix,
			MaxBytes:         maxBytes,
			AllowedTypes:     defaultAllowedTypes,
		})
		return u, err

	case model.StorageDriverOSS:
		u, err := storage.NewOSS(storage.OSSConfig{
			Endpoint:            cfg.OSSEndpoint,
			AccessKeyID:         cfg.OSSAccessKeyID,
			AccessKeySecret:     cfg.OSSAccessKeySecret,
			BucketName:          cfg.OSSBucketName,
			CustomDomain:        cfg.OSSCustomDomain,
			PrivateBucketName:   cfg.OSSPrivateBucketName,
			PrivateCustomDomain: cfg.OSSPrivateCustomDomain,
			MaxBytes:            maxBytes,
			AllowedTypes:        defaultAllowedTypes,
		})
		return u, err

	case model.StorageDriverS3:
		u, err := storage.NewS3(storage.S3Config{
			Endpoint:      cfg.S3Endpoint,
			Region:        cfg.S3Region,
			AccessKey:     cfg.S3AccessKey,
			SecretKey:     cfg.S3SecretKey,
			BucketPublic:  cfg.S3BucketPublic,
			DomainPublic:  cfg.S3DomainPublic,
			BucketPrivate: cfg.S3BucketPrivate,
			DomainPrivate: cfg.S3DomainPrivate,
			PathStyle:     cfg.S3PathStyle == 1,
			MaxBytes:      maxBytes,
			AllowedTypes:  defaultAllowedTypes,
		})
		return u, err

	default:
		return nil, fmt.Errorf("unsupported storage driver: %q (use local/oss/s3)", cfg.Driver)
	}
}

// buildUploader 根据 yaml 存储配置构建 Uploader(播种来源与 DB 异常兜底)。
func buildUploader(cfg config.StorageConfig) (storage.Uploader, error) {
	maxBytes := int64(20) * bytesPerMegabyte
	if cfg.MaxUploadMB > 0 {
		maxBytes = int64(cfg.MaxUploadMB) * bytesPerMegabyte
	}

	switch cfg.Driver {
	case "", "local":
		localPath := cfg.LocalPath
		if localPath == "" {
			localPath = "./storage/public"
		}
		privatePath := cfg.PrivatePath
		if privatePath == "" {
			privatePath = "./storage/private"
		}
		// local 私有文件代理下载 URL 的签名密钥复用 JWT secret(已在启动时校验非空)。
		signSecret := config.Get().JWT.JwtSecret
		u, err := storage.NewLocal(storage.LocalConfig{
			Directory:        localPath,
			PrivateDirectory: privatePath,
			PublicURL:        cfg.ResourceDomain,
			SignSecret:       signSecret,
			DownloadPrefix:   cfg.DownloadPrefix,
			MaxBytes:         maxBytes,
			AllowedTypes:     defaultAllowedTypes,
		})
		return u, err

	case "oss":
		u, err := storage.NewOSS(storage.OSSConfig{
			Endpoint:            cfg.OSS.Endpoint,
			AccessKeyID:         cfg.OSS.AccessKeyID,
			AccessKeySecret:     cfg.OSS.AccessKeySecret,
			BucketName:          cfg.OSS.BucketName,
			CustomDomain:        cfg.OSS.CustomDomain,
			PrivateBucketName:   cfg.OSS.PrivateBucketName,
			PrivateCustomDomain: cfg.OSS.PrivateCustomDomain,
			MaxBytes:            maxBytes,
			AllowedTypes:        defaultAllowedTypes,
		})
		return u, err

	default:
		return nil, fmt.Errorf("unsupported storage driver: %q (use local or oss)", cfg.Driver)
	}
}

// gormclauseOnConflictDoNothing INSERT ... ON DUPLICATE KEY UPDATE id=id(幂等播种)。
func gormclauseOnConflictDoNothing() clause.Expression {
	return clause.OnConflict{Columns: []clause.Column{{Name: "id"}}, DoUpdates: clause.Assignments(map[string]any{"id": gorm.Expr("id")})}
}
