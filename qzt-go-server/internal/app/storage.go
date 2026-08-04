package app

import (
	"fmt"
	"sync"

	"qzt-go-server/config"
	"qzt-go-server/internal/pkg/storage"
)

const bytesPerMegabyte int64 = 1024 * 1024

// uploaderMu 保护 uploader 的读写(配置变更时重建)。
var uploaderMu sync.RWMutex

// uploader 当前文件存储驱动实例。
var uploader storage.Uploader

// GetUploader 线程安全地获取当前 Uploader(上传时每次调用取最新)。
func GetUploader() storage.Uploader {
	uploaderMu.RLock()
	defer uploaderMu.RUnlock()
	return uploader
}

// setUploader 线程安全地替换 Uploader(配置变更后调用)。
func setUploader(u storage.Uploader) {
	uploaderMu.Lock()
	defer uploaderMu.Unlock()
	uploader = u
}

// Uploader 兼容旧代码的全局变量(指向当前 uploader,仅用于 handler 构造时的默认值)。
// 上传时请用 GetUploader() 取最新实例。
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
	"docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	"xls":  "application/vnd.ms-excel",
	"xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	"zip":  "application/zip",
}

// InitStorage 启动时初始化文件存储。
// 优先从 DB 读取 sys_storage_config;若 DB 无记录(首次启动),用 yaml 配置初始化。
func InitStorage() error {
	cfg := config.Get().Storage
	maxBytes := int64(20) * bytesPerMegabyte
	if cfg.MaxUploadMB > 0 {
		maxBytes = int64(cfg.MaxUploadMB) * bytesPerMegabyte
	}

	u, driver, err := buildUploaderFromYAML(cfg, maxBytes)
	if err != nil {
		return err
	}
	setUploader(u)
	Uploader = u
	Log.Infof("文件存储已初始化(来自配置文件): %s", driver)
	return nil
}

// ReloadUploader 根据存储配置重建 Uploader(配置变更后调用)。
// driver/local/oss 全部从传入的 StorageConfigData 构建。
func ReloadUploader(driver, localPath, resourceDomain, ossEndpoint, ossAK, ossSK, ossBucket, ossCustomDomain string, maxUploadMB int) error {
	maxBytes := int64(20) * bytesPerMegabyte
	if maxUploadMB > 0 {
		maxBytes = int64(maxUploadMB) * bytesPerMegabyte
	}

	var u storage.Uploader
	switch driver {
	case "", "local":
		uploader, err := storage.NewLocal(storage.LocalConfig{
			Directory:    localPath,
			PublicURL:    resourceDomain,
			MaxBytes:     maxBytes,
			AllowedTypes: defaultAllowedTypes,
		})
		if err != nil {
			return fmt.Errorf("init local storage failed: %w", err)
		}
		u = uploader
		Log.Info("文件存储已重建: local")

	case "oss":
		uploader, err := storage.NewOSS(storage.OSSConfig{
			Endpoint:        ossEndpoint,
			AccessKeyID:     ossAK,
			AccessKeySecret: ossSK,
			BucketName:      ossBucket,
			CustomDomain:    ossCustomDomain,
			MaxBytes:        maxBytes,
			AllowedTypes:    defaultAllowedTypes,
		})
		if err != nil {
			return fmt.Errorf("init oss storage failed: %w", err)
		}
		u = uploader
		Log.Infof("文件存储已重建: oss (bucket=%s)", ossBucket)

	default:
		return fmt.Errorf("unsupported storage driver: %q (use local or oss)", driver)
	}

	setUploader(u)
	Uploader = u
	return nil
}

// buildUploaderFromYAML 用 yaml 配置构建 Uploader(首次启动,DB 无记录时用)。
func buildUploaderFromYAML(cfg config.StorageConfig, maxBytes int64) (storage.Uploader, string, error) {
	switch cfg.Driver {
	case "", "local":
		u, err := storage.NewLocal(storage.LocalConfig{
			Directory:    cfg.LocalPath,
			PublicURL:    cfg.ResourceDomain,
			MaxBytes:     maxBytes,
			AllowedTypes: defaultAllowedTypes,
		})
		return u, "local", err
	case "oss":
		u, err := storage.NewOSS(storage.OSSConfig{
			Endpoint:        cfg.OSS.Endpoint,
			AccessKeyID:     cfg.OSS.AccessKeyID,
			AccessKeySecret: cfg.OSS.AccessKeySecret,
			BucketName:      cfg.OSS.BucketName,
			CustomDomain:    cfg.OSS.CustomDomain,
			MaxBytes:        maxBytes,
			AllowedTypes:    defaultAllowedTypes,
		})
		return u, "oss", err
	default:
		return nil, "", fmt.Errorf("unsupported storage driver: %q", cfg.Driver)
	}
}
