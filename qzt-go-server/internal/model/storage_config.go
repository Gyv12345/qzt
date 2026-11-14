package model

import (
	"qzt-go-server/internal/model/base"
)

// 存储驱动类型。
const (
	StorageDriverLocal = "local"
	StorageDriverOSS   = "oss"
	StorageDriverS3    = "s3"
)

// SysStorageConfig 文件存储配置(sys_storage_config v2)。
// 多条配置可并存,单条 is_active=1 生效;后台启用时热切换(构建新 Uploader 成功才提交)。
// 密钥字段(oss_access_key_secret/s3_secret_key)落库原文,列表接口脱敏只回尾 4 位。
type SysStorageConfig struct {
	ID uint `json:"id" gorm:"primaryKey"`
	// 自定义名称
	Name string `json:"name" gorm:"size:100;not null;comment:自定义名称"`
	// 存储驱动(local/oss/s3)
	Driver string `json:"driver" gorm:"size:20;not null;default:local;comment:存储驱动(local/oss/s3)"`
	// 是否当前生效(全表仅一条为1)
	IsActive int8 `json:"is_active" gorm:"not null;default:0;comment:是否当前生效(全表仅一条为1)"`
	// 单文件上传大小上限(MB)
	MaxUploadMB int64 `json:"max_upload_mb" gorm:"not null;default:50;comment:单文件上传大小上限(MB)"`
	// 备注
	Remark string `json:"remark" gorm:"size:255;not null;default:'';comment:备注"`

	// ── local 驱动 ──
	// 本地公共存储根目录
	LocalPath string `json:"local_path" gorm:"size:500;not null;default:'';comment:本地公共存储根目录(driver=local)"`
	// 本地私有存储根目录
	PrivatePath string `json:"private_path" gorm:"size:500;not null;default:'';comment:本地私有存储根目录(driver=local)"`
	// 公共资源访问域名
	ResourceDomain string `json:"resource_domain" gorm:"size:500;not null;default:'';comment:公共资源访问域名(driver=local)"`
	// 私有文件代理下载 URL 前缀
	DownloadPrefix string `json:"download_prefix" gorm:"size:200;not null;default:'';comment:私有文件代理下载URL前缀(driver=local)"`

	// ── oss 驱动(阿里云原生,双桶) ──
	// OSS Endpoint
	OSSEndpoint string `json:"oss_endpoint" gorm:"column:oss_endpoint;size:255;not null;default:'';comment:OSS Endpoint"`
	// OSS AccessKeyID
	OSSAccessKeyID string `json:"oss_access_key_id" gorm:"column:oss_access_key_id;size:255;not null;default:'';comment:OSS AccessKeyID"`
	// OSS AccessKeySecret(列表脱敏只回尾4位)
	OSSAccessKeySecret string `json:"oss_access_key_secret" gorm:"column:oss_access_key_secret;size:255;not null;default:'';comment:OSS AccessKeySecret(列表脱敏只回尾4位)"`
	// OSS 公共桶名称
	OSSBucketName string `json:"oss_bucket_name" gorm:"column:oss_bucket_name;size:128;not null;default:'';comment:OSS 公共桶名称"`
	// OSS 公共桶自定义域名/CDN
	OSSCustomDomain string `json:"oss_custom_domain" gorm:"column:oss_custom_domain;size:500;not null;default:'';comment:OSS 公共桶自定义域名/CDN"`
	// OSS 私有桶名称(留空禁用私有附件)
	OSSPrivateBucketName string `json:"oss_private_bucket_name" gorm:"column:oss_private_bucket_name;size:128;not null;default:'';comment:OSS 私有桶名称(留空禁用私有附件)"`
	// OSS 私有桶自定义域名(一般留空)
	OSSPrivateCustomDomain string `json:"oss_private_custom_domain" gorm:"column:oss_private_custom_domain;size:500;not null;default:'';comment:OSS 私有桶自定义域名(一般留空)"`

	// ── s3 兼容驱动(七牛/MinIO/RustFS/COS 等,双桶) ──
	// S3 兼容 Endpoint
	S3Endpoint string `json:"s3_endpoint" gorm:"column:s3_endpoint;size:255;not null;default:'';comment:S3 兼容 Endpoint"`
	// S3 Region(部分厂商可空)
	S3Region string `json:"s3_region" gorm:"column:s3_region;size:64;not null;default:'';comment:S3 Region(部分厂商可空)"`
	// S3 公共桶名称
	S3BucketPublic string `json:"s3_bucket_public" gorm:"column:s3_bucket_public;size:128;not null;default:'';comment:S3 公共桶名称"`
	// S3 公共桶访问域名/CDN(空则 endpoint/bucket 拼)
	S3DomainPublic string `json:"s3_domain_public" gorm:"column:s3_domain_public;size:500;not null;default:'';comment:S3 公共桶访问域名/CDN"`
	// S3 私有桶名称(留空禁用私有附件)
	S3BucketPrivate string `json:"s3_bucket_private" gorm:"column:s3_bucket_private;size:128;not null;default:'';comment:S3 私有桶名称(留空禁用私有附件)"`
	// S3 私有桶自定义域名(一般留空)
	S3DomainPrivate string `json:"s3_domain_private" gorm:"column:s3_domain_private;size:500;not null;default:'';comment:S3 私有桶自定义域名(一般留空)"`
	// S3 AccessKey
	S3AccessKey string `json:"s3_access_key" gorm:"column:s3_access_key;size:255;not null;default:'';comment:S3 AccessKey"`
	// S3 SecretKey(列表脱敏只回尾4位)
	S3SecretKey string `json:"s3_secret_key" gorm:"column:s3_secret_key;size:255;not null;default:'';comment:S3 SecretKey(列表脱敏只回尾4位)"`
	// 是否 path-style 寻址(MinIO/RustFS 常为1)
	S3PathStyle int8 `json:"s3_path_style" gorm:"column:s3_path_style;not null;default:0;comment:是否 path-style 寻址"`

	base.BaseModel
}

func (SysStorageConfig) TableName() string { return "sys_storage_config" }
