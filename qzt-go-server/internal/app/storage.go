package app

import (
	"fmt"
	"strings"
	"sync"

	"qzt-go-server/config"
	"qzt-go-server/internal/pkg/storage"
)

const bytesPerMegabyte int64 = 1024 * 1024

// uploaderMu 保护 uploader 的读写(启动时写入一次)。
var uploaderMu sync.RWMutex

// uploader 当前文件存储驱动实例(双桶:公共+私有)。
var uploader storage.Uploader

// GetUploader 线程安全地获取当前 Uploader。
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
	"docx": "application/vnd.openxmlformats.wordprocessingml.document",
	"xls":  "application/vnd.ms-excel",
	"xlsx": "application/vnd.openxmlformats.spreadsheetml.sheet",
	"zip":  "application/zip",
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

// InitStorage 从 config.StorageConfig 构建全局 Uploader(启动时调用一次)。
// 存储配置走配置文件(config.{env}.yaml + .env),不再从 DB 读取;
// 改配置需重启服务(运维级配置,热重载反而危险)。
func InitStorage() error {
	cfg := config.Get().Storage
	u, err := buildUploader(cfg)
	if err != nil {
		return err
	}
	setUploader(u)
	Uploader = u
	Log.Infof("文件存储已初始化: driver=%s", cfg.Driver)
	return nil
}

// buildUploader 根据存储配置构建 Uploader(双桶:公共+私有)。
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
