package storage

import (
	"fmt"
	"mime/multipart"
	"strings"
	"time"

	"github.com/aliyun/aliyun-oss-go-sdk/oss"
)

// oss.go 阿里云 OSS 对象存储实现。
// 通过 config.driver=oss 启用。文件校验逻辑与 local 一致(复用 validateUpload)。

// OSSConfig 阿里云 OSS 配置（双桶：公共桶 + 私有桶，共用一组 AK/SK）。
type OSSConfig struct {
	Endpoint            string // 如 oss-cn-hangzhou.aliyuncs.com
	AccessKeyID         string
	AccessKeySecret     string
	BucketName          string // 公共桶(public-read)
	CustomDomain        string // 公共桶 CDN/自定义域名(拼接 URL),空则用默认域名
	PrivateBucketName   string // 私有桶(private,签名 GET 访问);留空则私有功能禁用
	PrivateCustomDomain string // 私有桶自定义域名(一般留空,签名 URL 直接走 OSS 源站)
	MaxBytes            int64
	AllowedTypes        map[string]string
}

// OSS 阿里云 OSS 存储实现（双桶）。
type OSS struct {
	bucket             *oss.Bucket // 公共桶
	privateBucket      *oss.Bucket // 私有桶(为 nil 表示未配置)
	customDomain       string
	privateCustomDomain string
	maxBytes           int64
	allowedTypes       map[string]string
	now                func() time.Time
}

// NewOSS 创建阿里云 OSS 存储实例。私有桶为空时 privateBucket=nil(私有功能降级)。
func NewOSS(cfg OSSConfig) (*OSS, error) {
	if cfg.Endpoint == "" || cfg.AccessKeyID == "" || cfg.AccessKeySecret == "" || cfg.BucketName == "" {
		return nil, fmt.Errorf("oss config incomplete: endpoint/access_key/bucket required")
	}
	client, err := oss.New(cfg.Endpoint, cfg.AccessKeyID, cfg.AccessKeySecret)
	if err != nil {
		return nil, fmt.Errorf("create oss client: %w", err)
	}
	bucket, err := client.Bucket(cfg.BucketName)
	if err != nil {
		return nil, fmt.Errorf("get oss public bucket %q: %w", cfg.BucketName, err)
	}

	var privateBucket *oss.Bucket
	if strings.TrimSpace(cfg.PrivateBucketName) != "" {
		privateBucket, err = client.Bucket(cfg.PrivateBucketName)
		if err != nil {
			return nil, fmt.Errorf("get oss private bucket %q: %w", cfg.PrivateBucketName, err)
		}
	}

	// 与 NewLocal 一致:扩展名 key 归一化为带点小写(与 filepath.Ext 输出对齐),
	// 否则 defaultAllowedTypes 的 "png"(无点)永远匹配不上 filepath.Ext 的 ".png"。
	allowedTypes := make(map[string]string, len(cfg.AllowedTypes))
	for ext, ct := range cfg.AllowedTypes {
		ext = strings.ToLower(strings.TrimSpace(ext))
		if !strings.HasPrefix(ext, ".") {
			ext = "." + ext
		}
		allowedTypes[ext] = strings.ToLower(ct)
	}

	return &OSS{
		bucket:              bucket,
		privateBucket:       privateBucket,
		customDomain:        strings.TrimSuffix(cfg.CustomDomain, "/"),
		privateCustomDomain: strings.TrimSuffix(cfg.PrivateCustomDomain, "/"),
		maxBytes:            cfg.MaxBytes,
		allowedTypes:        allowedTypes,
		now:                 time.Now,
	}, nil
}

// Save 实现 Uploader 接口。校验文件 → 随机文件名 → 上传到 OSS → 返回 UploadedFile。
func (s *OSS) Save(file *multipart.FileHeader, folders ...string) (*UploadedFile, error) {
	if file == nil {
		return nil, ErrEmptyFile
	}
	if len(folders) > 1 {
		return nil, ErrInvalidFolder
	}

	// 文件校验(大小 + 扩展名 + MIME 嗅探)
	val, err := validateUpload(file, s.maxBytes, s.allowedTypes)
	if err != nil {
		return nil, err
	}

	// 解析目录(与 local 一致:空则按日期,否则校验合法性)
	folder := ""
	if len(folders) == 1 {
		folder = folders[0]
	}
	relativeFolder, err := s.resolveFolder(folder)
	if err != nil {
		return nil, err
	}

	// 随机文件名
	fileName, err := randomFileName(val.extension)
	if err != nil {
		return nil, err
	}
	relativePath := relativeFolder + "/" + fileName

	// 读取完整文件内容(直接从 multipart file 读,header 仅用于校验不写入)
	src, err := file.Open()
	if err != nil {
		return nil, fmt.Errorf("open upload file: %w", err)
	}
	defer src.Close()

	// 上传到公共桶(显式 public-read,确保直链可访问;inline 允许浏览器内联预览)
	objectKey := relativePath
	if err := s.bucket.PutObject(objectKey, src,
		oss.ContentType(val.contentType),
		oss.ContentDisposition("inline"),
		oss.ObjectACL(oss.ACLPublicRead),
	); err != nil {
		return nil, fmt.Errorf("upload to oss public bucket failed: %w", err)
	}

	// 拼接 URL
	url := s.buildURL(objectKey)

	return &UploadedFile{
		OriginalName: file.Filename,
		FileName:     fileName,
		RelativePath: relativePath,
		URL:          url,
		Size:         file.Size,
		ContentType:  val.contentType,
		Visibility:   VisibilityPublic,
	}, nil
}

// SavePrivate 上传文件到私有桶(ACL private),返回的 URL 为 objectKey。
// 私有桶未配置时返回 ErrPrivateBucketDisabled。
func (s *OSS) SavePrivate(file *multipart.FileHeader, folders ...string) (*UploadedFile, error) {
	if s.privateBucket == nil {
		return nil, ErrPrivateBucketDisabled
	}
	if file == nil {
		return nil, ErrEmptyFile
	}
	if len(folders) > 1 {
		return nil, ErrInvalidFolder
	}

	val, err := validateUpload(file, s.maxBytes, s.allowedTypes)
	if err != nil {
		return nil, err
	}

	folder := ""
	if len(folders) == 1 {
		folder = folders[0]
	}
	relativeFolder, err := s.resolveFolder(folder)
	if err != nil {
		return nil, err
	}

	fileName, err := randomFileName(val.extension)
	if err != nil {
		return nil, err
	}
	relativePath := relativeFolder + "/" + fileName

	src, err := file.Open()
	if err != nil {
		return nil, fmt.Errorf("open upload file: %w", err)
	}
	defer src.Close()

	// 上传到私有桶(显式 private;attachment 触发下载而非内联,更安全)
	objectKey := relativePath
	if err := s.privateBucket.PutObject(objectKey, src,
		oss.ContentType(val.contentType),
		oss.ContentDisposition("attachment"),
		oss.ObjectACL(oss.ACLPrivate),
	); err != nil {
		return nil, fmt.Errorf("upload to oss private bucket failed: %w", err)
	}

	// 私有文件 URL 存 objectKey(非明文),调用方用 SignURL 取短期下载 URL。
	return &UploadedFile{
		OriginalName: file.Filename,
		FileName:     fileName,
		RelativePath: relativePath,
		URL:          relativePath,
		Size:         file.Size,
		ContentType:  val.contentType,
		Visibility:   VisibilityPrivate,
	}, nil
}

// SignURL 为私有桶文件生成阿里云预签名 GET URL(带过期时间)。
func (s *OSS) SignURL(objectKey string, ttl time.Duration) (string, error) {
	if s.privateBucket == nil {
		return "", ErrPrivateBucketDisabled
	}
	url, err := s.privateBucket.SignURL(objectKey, oss.HTTPGet, int64(ttl.Seconds()))
	if err != nil {
		return "", fmt.Errorf("sign oss private get url: %w", err)
	}
	return url, nil
}

// buildURL 拼接公共桶文件访问 URL。有自定义域名用自定义域名,否则用默认 OSS 域名。
func (s *OSS) buildURL(objectKey string) string {
	if s.customDomain != "" {
		return s.customDomain + "/" + objectKey
	}
	// 默认格式: https://{bucket}.{endpoint}/{key}
	return fmt.Sprintf("https://%s.%s/%s", s.bucket.BucketName, s.bucket.Client.Config.Endpoint, objectKey)
}

// resolveFolder 与 Local 逻辑一致(日期目录或自定义目录校验)。
func (s *OSS) resolveFolder(folder string) (string, error) {
	if strings.TrimSpace(folder) == "" {
		return s.now().Format("2006/01/02"), nil
	}
	normalized := strings.ReplaceAll(strings.TrimSpace(folder), `\`, "/")
	if strings.HasPrefix(normalized, "/") {
		return "", ErrInvalidFolder
	}
	normalized = strings.Trim(normalized, "/")
	if normalized == "" {
		return "", ErrInvalidFolder
	}
	for _, segment := range strings.Split(normalized, "/") {
		if !folderSegmentPattern.MatchString(segment) {
			return "", ErrInvalidFolder
		}
	}
	return normalized, nil
}
