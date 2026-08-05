package storage

import (
	"bytes"
	"fmt"
	"mime/multipart"
	"strings"
	"time"

	"github.com/aliyun/aliyun-oss-go-sdk/oss"
)

// oss.go 阿里云 OSS 对象存储实现。
// 通过 config.driver=oss 启用。文件校验逻辑与 local 一致(复用 validateUpload)。

// OSSConfig 阿里云 OSS 配置。
type OSSConfig struct {
	Endpoint        string // 如 oss-cn-hangzhou.aliyuncs.com
	AccessKeyID     string
	AccessKeySecret string
	BucketName      string
	CustomDomain    string // CDN/自定义域名(拼接 URL),空则用默认域名
	MaxBytes        int64
	AllowedTypes    map[string]string
}

// OSS 阿里云 OSS 存储实现。
type OSS struct {
	bucket       *oss.Bucket
	customDomain string
	maxBytes     int64
	allowedTypes map[string]string
	now          func() time.Time
}

// NewOSS 创建阿里云 OSS 存储实例。
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
		return nil, fmt.Errorf("get oss bucket %q: %w", cfg.BucketName, err)
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
		bucket:       bucket,
		customDomain: strings.TrimSuffix(cfg.CustomDomain, "/"),
		maxBytes:     cfg.MaxBytes,
		allowedTypes: allowedTypes,
		now:          time.Now,
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

	// 读取完整文件内容(header + 剩余部分)
	src, err := file.Open()
	if err != nil {
		return nil, fmt.Errorf("open upload file: %w", err)
	}
	defer src.Close()

	var buf bytes.Buffer
	buf.Write(val.header[:val.headerSize])
	if _, err := buf.ReadFrom(src); err != nil {
		return nil, fmt.Errorf("read upload file body: %w", err)
	}

	// 上传到 OSS
	objectKey := relativePath
	if err := s.bucket.PutObject(objectKey, &buf, oss.ContentType(val.contentType)); err != nil {
		return nil, fmt.Errorf("upload to oss failed: %w", err)
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
	}, nil
}

// buildURL 拼接文件访问 URL。有自定义域名用自定义域名,否则用默认 OSS 域名。
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
