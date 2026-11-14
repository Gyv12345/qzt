package service

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"qzt-go-server/internal/app"
	"qzt-go-server/internal/model"
	"qzt-go-server/internal/pkg/storage"
	"qzt-go-server/internal/repository"
	cloudrepo "qzt-go-server/internal/repository/cloud"
	"qzt-go-server/pkg/xlogger"
)

// storage_config.go 文件存储配置服务(系统管理-文件存储页)。
// sys_storage_config v2:多条配置并存,单条 is_active=1 生效;
// 「启用」= 事务内清全表生效标记 → 置该行 → 构建新 Uploader 成功才提交,
// 提交后 app.ReloadStorage 热切换,所有上传/签名路径懒取新实例即刻生效。
// 密钥字段(oss_access_key_secret/s3_secret_key)列表脱敏只回尾 4 位;
// 保存时收到脱敏值(****开头)则保留原值不覆盖。

// StorageConfigService 存储配置服务。
type StorageConfigService struct {
	repo     *repository.StorageConfigRepo
	fileRepo *cloudrepo.CloudRepo
}

func NewStorageConfigService() *StorageConfigService {
	return &StorageConfigService{
		repo:     repository.NewStorageConfigRepo(),
		fileRepo: cloudrepo.NewCloudRepo(),
	}
}

// StorageConfigItem 列表行(密钥脱敏)。
type StorageConfigItem struct {
	ID          uint   `json:"id"`
	Name        string `json:"name"`
	Driver      string `json:"driver"`
	IsActive    int8   `json:"is_active"`
	MaxUploadMB int64  `json:"max_upload_mb"`
	Remark      string `json:"remark"`
	// local
	LocalPath      string `json:"local_path"`
	PrivatePath    string `json:"private_path"`
	ResourceDomain string `json:"resource_domain"`
	DownloadPrefix string `json:"download_prefix"`
	// oss
	OSSEndpoint            string `json:"oss_endpoint"`
	OSSAccessKeyID         string `json:"oss_access_key_id"`
	OSSAccessKeySecret     string `json:"oss_access_key_secret"` // 脱敏:****abcd
	OSSBucketName          string `json:"oss_bucket_name"`
	OSSCustomDomain        string `json:"oss_custom_domain"`
	OSSPrivateBucketName   string `json:"oss_private_bucket_name"`
	OSSPrivateCustomDomain string `json:"oss_private_custom_domain"`
	// s3
	S3Endpoint      string    `json:"s3_endpoint"`
	S3Region        string    `json:"s3_region"`
	S3BucketPublic  string    `json:"s3_bucket_public"`
	S3DomainPublic  string    `json:"s3_domain_public"`
	S3BucketPrivate string    `json:"s3_bucket_private"`
	S3DomainPrivate string    `json:"s3_domain_private"`
	S3AccessKey     string    `json:"s3_access_key"`
	S3SecretKey     string    `json:"s3_secret_key"` // 脱敏:****abcd
	S3PathStyle     int8      `json:"s3_path_style"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

// SaveStorageConfigRequest 保存(新建/更新)请求。密钥字段传脱敏值(****开头)→ 保留原值。
type SaveStorageConfigRequest struct {
	Name        string `json:"name" binding:"required"`
	Driver      string `json:"driver" binding:"required"`
	MaxUploadMB int64  `json:"max_upload_mb"`
	Remark      string `json:"remark"`
	// local
	LocalPath      string `json:"local_path"`
	PrivatePath    string `json:"private_path"`
	ResourceDomain string `json:"resource_domain"`
	DownloadPrefix string `json:"download_prefix"`
	// oss
	OSSEndpoint            string `json:"oss_endpoint"`
	OSSAccessKeyID         string `json:"oss_access_key_id"`
	OSSAccessKeySecret     string `json:"oss_access_key_secret"`
	OSSBucketName          string `json:"oss_bucket_name"`
	OSSCustomDomain        string `json:"oss_custom_domain"`
	OSSPrivateBucketName   string `json:"oss_private_bucket_name"`
	OSSPrivateCustomDomain string `json:"oss_private_custom_domain"`
	// s3
	S3Endpoint      string `json:"s3_endpoint"`
	S3Region        string `json:"s3_region"`
	S3BucketPublic  string `json:"s3_bucket_public"`
	S3DomainPublic  string `json:"s3_domain_public"`
	S3BucketPrivate string `json:"s3_bucket_private"`
	S3DomainPrivate string `json:"s3_domain_private"`
	S3AccessKey     string `json:"s3_access_key"`
	S3SecretKey     string `json:"s3_secret_key"`
	S3PathStyle     int8   `json:"s3_path_style"`
}

// toItem 配置行 → 脱敏列表项。
func toItem(c *model.SysStorageConfig) *StorageConfigItem {
	return &StorageConfigItem{
		ID:                     c.ID,
		Name:                   c.Name,
		Driver:                 c.Driver,
		IsActive:               c.IsActive,
		MaxUploadMB:            c.MaxUploadMB,
		Remark:                 c.Remark,
		LocalPath:              c.LocalPath,
		PrivatePath:            c.PrivatePath,
		ResourceDomain:         c.ResourceDomain,
		DownloadPrefix:         c.DownloadPrefix,
		OSSEndpoint:            c.OSSEndpoint,
		OSSAccessKeyID:         c.OSSAccessKeyID,
		OSSAccessKeySecret:     MaskSecret(c.OSSAccessKeySecret),
		OSSBucketName:          c.OSSBucketName,
		OSSCustomDomain:        c.OSSCustomDomain,
		OSSPrivateBucketName:   c.OSSPrivateBucketName,
		OSSPrivateCustomDomain: c.OSSPrivateCustomDomain,
		S3Endpoint:             c.S3Endpoint,
		S3Region:               c.S3Region,
		S3BucketPublic:         c.S3BucketPublic,
		S3DomainPublic:         c.S3DomainPublic,
		S3BucketPrivate:        c.S3BucketPrivate,
		S3DomainPrivate:        c.S3DomainPrivate,
		S3AccessKey:            c.S3AccessKey,
		S3SecretKey:            MaskSecret(c.S3SecretKey),
		S3PathStyle:            c.S3PathStyle,
		CreatedAt:              c.CreatedAt.Time(),
		UpdatedAt:              c.UpdatedAt.Time(),
	}
}

// List 配置列表(密钥脱敏)。
func (s *StorageConfigService) List(ctx context.Context) ([]*StorageConfigItem, error) {
	list, err := s.repo.List(ctx, &repository.QueryOptions{Order: []string{"is_active DESC", "id ASC"}})
	if err != nil {
		return nil, err
	}
	out := make([]*StorageConfigItem, 0, len(list))
	for i := range list {
		out = append(out, toItem(&list[i]))
	}
	return out, nil
}

// Create 新建配置(不自动激活)。密钥字段传脱敏值按空处理。
func (s *StorageConfigService) Create(ctx context.Context, req *SaveStorageConfigRequest) (*StorageConfigItem, error) {
	if err := validateStorageConfigRequest(req); err != nil {
		return nil, err
	}
	cfg := &model.SysStorageConfig{
		Name:                   strings.TrimSpace(req.Name),
		Driver:                 req.Driver,
		IsActive:               0, // 不自动激活,由「启用」操作显式切换
		MaxUploadMB:            normalizeMaxUploadMB(req.MaxUploadMB),
		Remark:                 req.Remark,
		LocalPath:              req.LocalPath,
		PrivatePath:            req.PrivatePath,
		ResourceDomain:         req.ResourceDomain,
		DownloadPrefix:         req.DownloadPrefix,
		OSSEndpoint:            req.OSSEndpoint,
		OSSAccessKeyID:         req.OSSAccessKeyID,
		OSSAccessKeySecret:     unmaskSecret(req.OSSAccessKeySecret),
		OSSBucketName:          req.OSSBucketName,
		OSSCustomDomain:        req.OSSCustomDomain,
		OSSPrivateBucketName:   req.OSSPrivateBucketName,
		OSSPrivateCustomDomain: req.OSSPrivateCustomDomain,
		S3Endpoint:             req.S3Endpoint,
		S3Region:               req.S3Region,
		S3BucketPublic:         req.S3BucketPublic,
		S3DomainPublic:         req.S3DomainPublic,
		S3BucketPrivate:        req.S3BucketPrivate,
		S3DomainPrivate:        req.S3DomainPrivate,
		S3AccessKey:            req.S3AccessKey,
		S3SecretKey:            unmaskSecret(req.S3SecretKey),
		S3PathStyle:            req.S3PathStyle,
	}
	if err := s.repo.Create(ctx, cfg); err != nil {
		return nil, err
	}
	return toItem(cfg), nil
}

// Update 更新配置。密钥字段传脱敏值(****开头)保留原值不覆盖;不改动 is_active。
func (s *StorageConfigService) Update(ctx context.Context, id uint, req *SaveStorageConfigRequest) error {
	if err := validateStorageConfigRequest(req); err != nil {
		return err
	}
	cfg, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return repository.NotFoundOr(err, "配置不存在")
	}
	cfg.Name = strings.TrimSpace(req.Name)
	cfg.Driver = req.Driver
	cfg.MaxUploadMB = normalizeMaxUploadMB(req.MaxUploadMB)
	cfg.Remark = req.Remark
	cfg.LocalPath = req.LocalPath
	cfg.PrivatePath = req.PrivatePath
	cfg.ResourceDomain = req.ResourceDomain
	cfg.DownloadPrefix = req.DownloadPrefix
	cfg.OSSEndpoint = req.OSSEndpoint
	cfg.OSSAccessKeyID = req.OSSAccessKeyID
	cfg.OSSBucketName = req.OSSBucketName
	cfg.OSSCustomDomain = req.OSSCustomDomain
	cfg.OSSPrivateBucketName = req.OSSPrivateBucketName
	cfg.OSSPrivateCustomDomain = req.OSSPrivateCustomDomain
	cfg.S3Endpoint = req.S3Endpoint
	cfg.S3Region = req.S3Region
	cfg.S3BucketPublic = req.S3BucketPublic
	cfg.S3DomainPublic = req.S3DomainPublic
	cfg.S3BucketPrivate = req.S3BucketPrivate
	cfg.S3DomainPrivate = req.S3DomainPrivate
	cfg.S3AccessKey = req.S3AccessKey
	cfg.S3PathStyle = req.S3PathStyle
	// 密钥:脱敏值(****开头)保留原值,明文值才覆盖(与 oauth_config 空串不改的口径对齐)
	if v := unmaskSecret(req.OSSAccessKeySecret); v != "" {
		cfg.OSSAccessKeySecret = v
	}
	if v := unmaskSecret(req.S3SecretKey); v != "" {
		cfg.S3SecretKey = v
	}
	fields := []string{"Name", "Driver", "MaxUploadMB", "Remark",
		"LocalPath", "PrivatePath", "ResourceDomain", "DownloadPrefix",
		"OSSEndpoint", "OSSAccessKeyID", "OSSBucketName", "OSSCustomDomain",
		"OSSPrivateBucketName", "OSSPrivateCustomDomain",
		"S3Endpoint", "S3Region", "S3BucketPublic", "S3DomainPublic",
		"S3BucketPrivate", "S3DomainPrivate", "S3AccessKey", "S3PathStyle"}
	if !isMaskedSecret(req.OSSAccessKeySecret) {
		fields = append(fields, "OSSAccessKeySecret")
	}
	if !isMaskedSecret(req.S3SecretKey) {
		fields = append(fields, "S3SecretKey")
	}
	return s.repo.Update(ctx, cfg, fields...)
}

// Delete 删除配置。当前生效(is_active=1)的配置拒绝删除——删除会使运行中的存储失去配置来源。
func (s *StorageConfigService) Delete(ctx context.Context, id uint) error {
	cfg, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return repository.NotFoundOr(err, "配置不存在")
	}
	if cfg.IsActive == 1 {
		return errors.New("当前生效的存储配置不允许删除,请先启用其他配置")
	}
	return s.repo.Delete(ctx, id)
}

// Activate 启用配置(热切换):事务内「清全表 is_active → 置该行」,
// 构建新 Uploader 成功才提交(失败回滚生效标记并报错);提交成功后 ReloadStorage 即刻生效。
func (s *StorageConfigService) Activate(ctx context.Context, id uint) error {
	var newUploader storage.Uploader
	err := repository.Transaction(ctx, func(ctx context.Context) error {
		cfg, err := s.repo.GetByID(ctx, id)
		if err != nil {
			return repository.NotFoundOr(err, "配置不存在")
		}
		u, buildErr := app.BuildUploaderFromStorageConfig(cfg)
		if buildErr != nil {
			return fmt.Errorf("存储驱动构建失败,未切换: %w", buildErr)
		}
		newUploader = u
		if err := s.repo.ClearActive(ctx); err != nil {
			return err
		}
		return s.repo.SetActive(ctx, id)
	})
	if err != nil {
		return err
	}
	app.ReloadStorage(newUploader)
	// 同步上传请求体上限(与生效配置一致,热切换即生效)
	var cfg *model.SysStorageConfig
	cfg, err = s.repo.GetByID(ctx, id)
	if err == nil && cfg.MaxUploadMB > 0 {
		app.SetActiveMaxUploadMB(cfg.MaxUploadMB)
	}
	return nil
}

// Test 测试配置连接:构建 Uploader(构造期 Ping 两桶/建目录),不激活不 reload。
func (s *StorageConfigService) Test(ctx context.Context, id uint) error {
	cfg, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return repository.NotFoundOr(err, "配置不存在")
	}
	if _, err := app.BuildUploaderFromStorageConfig(cfg); err != nil {
		return fmt.Errorf("连接失败: %w", err)
	}
	return nil
}

// StorageFileItem 存储文件列表行(管理员视角,跨用户全量)。
type StorageFileItem struct {
	ID           uint      `json:"id"`
	Name         string    `json:"name"`
	Size         int64     `json:"size"`
	ContentType  string    `json:"content_type"`
	UploaderName string    `json:"uploader_name"`
	CreatedAt    time.Time `json:"created_at"`
	DownloadURL  string    `json:"download_url"` // 公共直链或私有短期签名 URL
}

// adminFileSignTTL 管理端私有文件签名 URL 有效期(与 /api/file/sign 口径一致)。
const adminFileSignTTL = time.Hour

// ListFiles 分页列出 cloud_file 全量(管理员视角跨用户;仓库层为全局共享层的例外查询)。
// download_url 按文件形态解析:公共文件 URL 非空 → 直链;否则 SignURL 短期签名
// (与网盘分享 share.go 的解析口径一致)。
func (s *StorageConfigService) ListFiles(ctx context.Context, keyword string, page, pageSize int) ([]*StorageFileItem, int64, error) {
	rows, total, err := s.fileRepo.ListAdminFiles(ctx, keyword, page, pageSize)
	if err != nil {
		return nil, 0, err
	}
	uploader := app.GetUploader()
	out := make([]*StorageFileItem, 0, len(rows))
	for i := range rows {
		row := &rows[i]
		item := &StorageFileItem{
			ID:           row.ID,
			Name:         row.Name,
			Size:         row.Size,
			ContentType:  row.ContentType,
			UploaderName: row.UploaderName,
			CreatedAt:    row.CreatedAt.Time(),
		}
		// 公共文件上传时已生成公开 URL(URL 字段非空)→ 直链;
		// 私有文件 URL 为空/objectKey 形态 → 现签短期下载 URL。
		if row.URL != "" && strings.HasPrefix(row.URL, "http") {
			item.DownloadURL = row.URL
		} else if row.ObjectKey != "" && uploader != nil {
			signed, signErr := uploader.SignURL(row.ObjectKey, adminFileSignTTL)
			if signErr != nil {
				// 单行签名失败不阻断列表,留空并记日志
				xlogger.ErrorfCtx(ctx, "存储文件列表:签名失败 id=%d key=%s: %v", row.ID, row.ObjectKey, signErr)
			} else {
				item.DownloadURL = signed
			}
		} else if row.URL != "" {
			// local 公共文件存完整 URL(可能非 http 形态,如反代路径),原样回传
			item.DownloadURL = row.URL
		}
		out = append(out, item)
	}
	return out, total, nil
}

// ── 校验与脱敏纯函数(单测覆盖) ──

// validateStorageConfigRequest 按驱动校验必填参数。
// local 需公共路径;oss 需 endpoint+公共桶;s3 需 endpoint+双桶。
func validateStorageConfigRequest(req *SaveStorageConfigRequest) error {
	switch req.Driver {
	case model.StorageDriverLocal:
		if strings.TrimSpace(req.LocalPath) == "" {
			return errors.New("local 驱动必须填写公共存储路径(local_path)")
		}
	case model.StorageDriverOSS:
		if strings.TrimSpace(req.OSSEndpoint) == "" {
			return errors.New("oss 驱动必须填写 Endpoint")
		}
		if strings.TrimSpace(req.OSSBucketName) == "" {
			return errors.New("oss 驱动必须填写公共桶名称")
		}
	case model.StorageDriverS3:
		if strings.TrimSpace(req.S3Endpoint) == "" {
			return errors.New("s3 驱动必须填写 Endpoint")
		}
		if strings.TrimSpace(req.S3BucketPublic) == "" {
			return errors.New("s3 驱动必须填写公共桶名称")
		}
		if strings.TrimSpace(req.S3BucketPrivate) == "" {
			return errors.New("s3 驱动必须填写私有桶名称")
		}
	default:
		return errors.New("不支持的存储驱动: " + req.Driver + "(支持 local/oss/s3)")
	}
	if strings.TrimSpace(req.Name) == "" {
		return errors.New("配置名称不能为空")
	}
	return nil
}

// normalizeMaxUploadMB 上限归一:<=0 回落默认 50MB;上限 10GB 防误配。
func normalizeMaxUploadMB(mb int64) int64 {
	if mb <= 0 {
		return 50
	}
	if mb > 10*1024 {
		return 10 * 1024
	}
	return mb
}

// MaskSecret 密钥脱敏:回 **** + 尾 4 位(不足 4 位全掩);空串原样返回空。
func MaskSecret(s string) string {
	if s == "" {
		return ""
	}
	if len(s) <= 4 {
		return "****" + s
	}
	return "****" + s[len(s)-4:]
}

// isMaskedSecret 判断是否为脱敏值(****开头),前端原样回传时保留原值不覆盖。
func isMaskedSecret(s string) bool {
	return strings.HasPrefix(s, "****")
}

// unmaskSecret 脱敏值 → 空串(新建时无原值可保留,更新时配合 isMaskedSecret 跳过覆盖)。
func unmaskSecret(s string) string {
	if isMaskedSecret(s) {
		return ""
	}
	return s
}
