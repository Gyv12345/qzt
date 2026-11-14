package storage

import (
	"bytes"
	"context"
	"crypto/tls"
	"fmt"
	"mime/multipart"
	"net/http"
	"path/filepath"
	"strings"
	"time"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

// s3.go S3 兼容对象存储实现(minio-go),适配七牛/MinIO/RustFS/腾讯云 COS/
// 阿里云 OSS S3 端点等一切 S3 协议兼容服务。通过配置 driver=s3 启用。
// 语义与 oss.go 严格一致(双桶:公共桶直链 + 私有桶签名 GET):
//   - 公共桶 Save/SaveBytes 返回可直链访问的明文 URL(domain_public 优先拼接);
//   - 私有桶 SavePrivate/SavePrivateBytes 返回的 URL 为 objectKey(非明文),
//     调用方需另外调用 SignURL 取短期下载 URL —— 上层模块(cloud 分享等)
//     按 file.URL 是否 http 开头区分公共/私有形态,不能破坏该约定。
//
// path_style=true 时 endpoint 寻址为 https://{endpoint}/{bucket}/{key}
// (MinIO/RustFS 常用);false 为虚拟主机式 https://{bucket}.{endpoint}/{key}。

// S3Config S3 兼容存储配置(双桶:公共桶 + 私有桶,共用一组 AK/SK)。
type S3Config struct {
	Endpoint      string // 如 play.min.io 或 https://play.min.io(带 scheme 自动剥)
	Region        string // 部分厂商必填(如 AWS/AWS 兼容),MinIO/RustFS 可空
	AccessKey     string
	SecretKey     string
	BucketPublic  string // 公共桶(public-read)
	DomainPublic  string // 公共桶访问域名/CDN(拼接公开 URL),空则按 endpoint+bucket 拼
	BucketPrivate string // 私有桶(private,签名 GET 访问);留空则私有功能禁用
	DomainPrivate string // 私有桶自定义域名(一般留空,签名 URL 直接走源站)
	PathStyle     bool   // path-style 寻址(MinIO/RustFS 常开)
	MaxBytes      int64
	AllowedTypes  map[string]string
	Secure        bool // 是否 https(由 Endpoint 是否带 https:// 前缀推导,显式传入可覆盖)
	SkipVerifyTLS bool // 跳过 TLS 证书校验(自签名场景,默认 false)
}

// S3 S3 兼容存储实现(双桶)。
type S3 struct {
	client        *minio.Client
	endpoint      string // 规范化 host(去 scheme),拼接默认公开 URL 用
	secure        bool   // endpoint 是否 https
	publicBucket  string
	privateBucket string // 空串表示未配置
	domainPublic  string
	domainPrivate string
	pathStyle     bool
	maxBytes      int64
	allowedTypes  map[string]string
	now           func() time.Time
}

// splitS3Endpoint 把 Endpoint 规范为 minio-go 需要的 host[:port] 形式,
// 并按 scheme 推导 https。"https://x" → (x, true), "http://x" → (x, false),
// 无 scheme 默认按 https 处理。
func splitS3Endpoint(endpoint string) (string, bool) {
	e := strings.TrimSpace(endpoint)
	e = strings.TrimSuffix(e, "/")
	switch {
	case strings.HasPrefix(strings.ToLower(e), "https://"):
		return e[len("https://"):], true
	case strings.HasPrefix(strings.ToLower(e), "http://"):
		return e[len("http://"):], false
	default:
		return e, true
	}
}

// NewS3 创建 S3 兼容存储实例。公共桶必填;私有桶留空则私有功能降级(与 NewOSS 一致)。
// 构造期 Ping 校验:两桶 BucketExists 探测,桶不存在/凭据无效立即报错(启动期/保存测试期暴露)。
func NewS3(cfg S3Config) (*S3, error) {
	if strings.TrimSpace(cfg.Endpoint) == "" || strings.TrimSpace(cfg.AccessKey) == "" ||
		strings.TrimSpace(cfg.SecretKey) == "" || strings.TrimSpace(cfg.BucketPublic) == "" {
		return nil, fmt.Errorf("s3 config incomplete: endpoint/access_key/secret/bucket_public required")
	}

	host, secureByScheme := splitS3Endpoint(cfg.Endpoint)
	secure := cfg.Secure || secureByScheme
	opts := minio.Options{
		Creds:  credentials.NewStaticV4(cfg.AccessKey, cfg.SecretKey, ""),
		Secure: secure,
		Region: strings.TrimSpace(cfg.Region),
	}
	if cfg.SkipVerifyTLS {
		// 自签名证书场景(内网 MinIO/RustFS 常见),跳过证书校验
		opts.Transport = &http.Transport{TLSClientConfig: &tls.Config{InsecureSkipVerify: true}}
	}
	client, err := minio.New(host, &opts)
	if err != nil {
		return nil, fmt.Errorf("create s3 client: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	if ok, err := client.BucketExists(ctx, cfg.BucketPublic); err != nil {
		return nil, fmt.Errorf("probe s3 public bucket %q: %w", cfg.BucketPublic, err)
	} else if !ok {
		return nil, fmt.Errorf("s3 public bucket %q not exists", cfg.BucketPublic)
	}
	if strings.TrimSpace(cfg.BucketPrivate) != "" {
		if ok, err := client.BucketExists(ctx, cfg.BucketPrivate); err != nil {
			return nil, fmt.Errorf("probe s3 private bucket %q: %w", cfg.BucketPrivate, err)
		} else if !ok {
			return nil, fmt.Errorf("s3 private bucket %q not exists", cfg.BucketPrivate)
		}
	}

	// 与 NewOSS/NewLocal 一致:扩展名 key 归一化为带点小写(与 filepath.Ext 输出对齐)。
	allowedTypes := make(map[string]string, len(cfg.AllowedTypes))
	for ext, ct := range cfg.AllowedTypes {
		ext = strings.ToLower(strings.TrimSpace(ext))
		if !strings.HasPrefix(ext, ".") {
			ext = "." + ext
		}
		allowedTypes[ext] = strings.ToLower(ct)
	}

	return &S3{
		client:        client,
		endpoint:      host,
		secure:        secure,
		publicBucket:  strings.TrimSpace(cfg.BucketPublic),
		privateBucket: strings.TrimSpace(cfg.BucketPrivate),
		domainPublic:  strings.TrimSuffix(strings.TrimSpace(cfg.DomainPublic), "/"),
		domainPrivate: strings.TrimSuffix(strings.TrimSpace(cfg.DomainPrivate), "/"),
		pathStyle:     cfg.PathStyle,
		maxBytes:      cfg.MaxBytes,
		allowedTypes:  allowedTypes,
		now:           time.Now,
	}, nil
}

// Delete 实现 Uploader 接口:按 visibility 删除公共/私有桶中的对象。
// S3 RemoveObject 对不存在的 key 幂等成功,无需先探测。
// 私有桶未配置时返回 ErrPrivateBucketDisabled。
func (s *S3) Delete(objectKey string, visibility string) error {
	key := strings.TrimSpace(objectKey)
	if key == "" {
		return nil
	}
	bucket := s.privateBucket
	if visibility == VisibilityPublic {
		bucket = s.publicBucket
	}
	if bucket == "" {
		return ErrPrivateBucketDisabled
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	if err := s.client.RemoveObject(ctx, bucket, key, minio.RemoveObjectOptions{}); err != nil {
		return fmt.Errorf("delete s3 object %q: %w", key, err)
	}
	return nil
}

// List 媒体库列举公共桶对象(按 key 升序,S3 ListObjectsV2 按 key 字典序返回)。
func (s *S3) List(prefix string, maxKeys int) ([]MediaObject, error) {
	if maxKeys <= 0 || maxKeys > 500 {
		maxKeys = 200
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	objsCh := s.client.ListObjects(ctx, s.publicBucket, minio.ListObjectsOptions{
		Prefix:    prefix,
		Recursive: true,
		MaxKeys:   maxKeys,
	})
	list := make([]MediaObject, 0, maxKeys)
	for obj := range objsCh {
		if obj.Err != nil {
			return nil, fmt.Errorf("list s3 objects: %w", obj.Err)
		}
		// 跳过伪目录占位对象(0 字节且以 / 结尾,与 oss.go 一致)
		if strings.HasSuffix(obj.Key, "/") {
			continue
		}
		list = append(list, MediaObject{
			Key:          obj.Key,
			Size:         obj.Size,
			LastModified: obj.LastModified,
		})
		if len(list) >= maxKeys {
			break
		}
	}
	return list, nil
}

// Save 实现 Uploader 接口。校验文件 → 随机文件名 → 上传公共桶 → 返回 UploadedFile(明文 URL)。
func (s *S3) Save(file *multipart.FileHeader, folders ...string) (*UploadedFile, error) {
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
	objectKey := relativeFolder + "/" + fileName

	src, err := file.Open()
	if err != nil {
		return nil, fmt.Errorf("open upload file: %w", err)
	}
	defer src.Close()

	// 上传到公共桶(inline 允许浏览器内联预览,与 oss.go 一致)
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()
	_, err = s.client.PutObject(ctx, s.publicBucket, objectKey, src, file.Size,
		minio.PutObjectOptions{
			ContentType:        val.contentType,
			ContentDisposition: "inline",
		})
	if err != nil {
		return nil, fmt.Errorf("upload to s3 public bucket failed: %w", err)
	}

	return &UploadedFile{
		OriginalName: file.Filename,
		FileName:     fileName,
		RelativePath: objectKey,
		URL:          s.buildPublicURL(objectKey),
		Size:         file.Size,
		ContentType:  val.contentType,
		Visibility:   VisibilityPublic,
	}, nil
}

// SavePrivate 上传文件到私有桶,返回的 URL 为 objectKey(与 oss.go 语义一致)。
// 私有桶未配置时返回 ErrPrivateBucketDisabled。
func (s *S3) SavePrivate(file *multipart.FileHeader, folders ...string) (*UploadedFile, error) {
	if s.privateBucket == "" {
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
	objectKey := relativeFolder + "/" + fileName

	src, err := file.Open()
	if err != nil {
		return nil, fmt.Errorf("open upload file: %w", err)
	}
	defer src.Close()

	// 私有桶 attachment 触发下载而非内联(与 oss.go 一致)
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()
	_, err = s.client.PutObject(ctx, s.privateBucket, objectKey, src, file.Size,
		minio.PutObjectOptions{
			ContentType:        val.contentType,
			ContentDisposition: "attachment",
		})
	if err != nil {
		return nil, fmt.Errorf("upload to s3 private bucket failed: %w", err)
	}

	// 私有文件 URL 存 objectKey(非明文),调用方用 SignURL 取短期下载 URL。
	return &UploadedFile{
		OriginalName: file.Filename,
		FileName:     fileName,
		RelativePath: objectKey,
		URL:          objectKey,
		Size:         file.Size,
		ContentType:  val.contentType,
		Visibility:   VisibilityPrivate,
	}, nil
}

// SavePrivateBytes 把内存字节上传到私有桶(无需 multipart 包装),返回的 URL 为 objectKey。
// name 用于推断扩展名;contentType 留空则按扩展名白名单映射。私有桶未配置时返回 ErrPrivateBucketDisabled。
func (s *S3) SavePrivateBytes(name string, data []byte, contentType string, folders ...string) (*UploadedFile, error) {
	if s.privateBucket == "" {
		return nil, ErrPrivateBucketDisabled
	}
	return s.putBytes(s.privateBucket, name, data, contentType, "attachment", VisibilityPrivate, folders...)
}

// SaveBytes 实现 Uploader 接口:把内存字节上传到公共桶(无需 multipart 包装),
// 返回的 URL 可直链/CDN 访问。适用于代码生成的文件直接落公共桶。
func (s *S3) SaveBytes(name string, data []byte, contentType string, folders ...string) (*UploadedFile, error) {
	return s.putBytes(s.publicBucket, name, data, contentType, "inline", VisibilityPublic, folders...)
}

// putBytes SaveBytes/SavePrivateBytes 共用主体:校验 → 随机名 → PutObject → UploadedFile。
func (s *S3) putBytes(bucket, name string, data []byte, contentType, disposition, visibility string, folders ...string) (*UploadedFile, error) {
	if len(data) == 0 {
		return nil, ErrEmptyFile
	}
	if int64(len(data)) > s.maxBytes {
		return nil, ErrFileTooLarge
	}
	if len(folders) > 1 {
		return nil, ErrInvalidFolder
	}

	extension := strings.ToLower(filepath.Ext(name))
	expectedContentType, allowed := s.allowedTypes[extension]
	if !allowed {
		return nil, fmt.Errorf("%w: extension %q", ErrInvalidFileType, extension)
	}
	mediaType := strings.TrimSpace(contentType)
	if mediaType == "" {
		mediaType = expectedContentType
	}

	folder := ""
	if len(folders) == 1 {
		folder = folders[0]
	}
	relativeFolder, err := s.resolveFolder(folder)
	if err != nil {
		return nil, err
	}

	fileName, err := randomFileName(extension)
	if err != nil {
		return nil, err
	}
	objectKey := relativeFolder + "/" + fileName

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()
	_, err = s.client.PutObject(ctx, bucket, objectKey, bytes.NewReader(data), int64(len(data)),
		minio.PutObjectOptions{
			ContentType:        mediaType,
			ContentDisposition: disposition,
		})
	if err != nil {
		return nil, fmt.Errorf("upload to s3 bucket %q failed: %w", bucket, err)
	}

	uploaded := &UploadedFile{
		OriginalName: name,
		FileName:     fileName,
		RelativePath: objectKey,
		Size:         int64(len(data)),
		ContentType:  mediaType,
		Visibility:   visibility,
	}
	if visibility == VisibilityPublic {
		uploaded.URL = s.buildPublicURL(objectKey)
	} else {
		uploaded.URL = objectKey // 私有文件存 objectKey
	}
	return uploaded, nil
}

// SignURL 为私有桶文件生成 S3 PresignedGetObject 预签名 GET URL(带过期时间)。
// 私有桶未配置时返回 ErrPrivateBucketDisabled。
// 预签名 URL 直走源站域名(签名 Host 必须与实际访问域名一致,CDN 改写场景由
// 反代/CDN 侧处理,与 oss.go 签名直走源站口径一致;domainPrivate 仅供展示提示)。
func (s *S3) SignURL(objectKey string, ttl time.Duration) (string, error) {
	if s.privateBucket == "" {
		return "", ErrPrivateBucketDisabled
	}
	if ttl <= 0 {
		ttl = 15 * time.Minute
	}
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	signed, err := s.client.PresignedGetObject(ctx, s.privateBucket, objectKey, ttl, nil)
	if err != nil {
		return "", fmt.Errorf("sign s3 private get url: %w", err)
	}
	return signed.String(), nil
}

// buildPublicURL 拼接公共桶文件访问 URL。优先自定义域名,否则按 endpoint+bucket 拼:
//   - path-style: https://{endpoint}/{bucket}/{key}
//   - 虚拟主机式: https://{bucket}.{endpoint}/{key}
func (s *S3) buildPublicURL(objectKey string) string {
	if s.domainPublic != "" {
		return s.domainPublic + "/" + objectKey
	}
	scheme := "https"
	if !s.secure {
		scheme = "http"
	}
	if s.pathStyle {
		return fmt.Sprintf("%s://%s/%s/%s", scheme, s.endpoint, s.publicBucket, objectKey)
	}
	return fmt.Sprintf("%s://%s.%s/%s", scheme, s.publicBucket, s.endpoint, objectKey)
}

// resolveFolder 与 OSS/Local 逻辑一致(日期目录或自定义目录校验)。
func (s *S3) resolveFolder(folder string) (string, error) {
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
