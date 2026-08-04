package model

// storage_config.go 文件存储配置(sys_storage_config)。
// 全局单条记录(id=1),后台管理页面可改。修改后触发 app.ReloadUploader() 重建客户端。
// 支持本地存储(local)和阿里云 OSS(oss)两种驱动,通过 driver 字段切换。

// 存储驱动类型。
const (
	StorageDriverLocal = "local"
	StorageDriverOSS   = "oss"
)

// SysStorageConfig 文件存储配置。
type SysStorageConfig struct {
	ID                 uint   `json:"id" gorm:"primaryKey"`
	Driver             string `json:"driver" gorm:"size:20;default:local;comment:存储驱动(local/oss)"`
	// local 驱动配置
	LocalPath          string `json:"local_path" gorm:"size:500;default:./storage/uploads;comment:本地存储根目录"`
	ResourceDomain     string `json:"resource_domain" gorm:"size:500;comment:本地资源访问域名"`
	// OSS 驱动配置
	OSSEndpoint        string `json:"oss_endpoint" gorm:"size:255;comment:OSS Endpoint"`
	OSSAccessKeyID     string `json:"oss_access_key_id" gorm:"size:255;comment:OSS AccessKeyID"`
	OSSAccessKeySecret string `json:"-" gorm:"size:255;comment:OSS AccessKeySecret(脱敏不返回)"`
	OSSBucketName      string `json:"oss_bucket_name" gorm:"size:128;comment:OSS Bucket名称"`
	OSSCustomDomain    string `json:"oss_custom_domain" gorm:"size:500;comment:OSS 自定义域名/CDN"`
	// 通用
	MaxUploadMB        int    `json:"max_upload_mb" gorm:"default:20;comment:单文件大小上限(MB)"`
	Remark             string `json:"remark" gorm:"size:255;comment:备注"`
	BaseModel
}

func (SysStorageConfig) TableName() string { return "sys_storage_config" }
