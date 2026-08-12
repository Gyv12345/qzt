package storage

import (
	"mime/multipart"
	"time"
)

// uploader.go 文件上传抽象接口（双桶模型）。
// *Local 和 *OSS 都实现此接口,app.Uploader 持有接口类型,
// 通过配置 driver 切换存储后端。
//
// 双桶:
//   - 公共桶(Save):public-read,直链/CDN 访问,存放可公开的资源(CMS图/Logo/头像等)。
//   - 私有桶(SavePrivate):private,签名 GET 访问(SignURL),存放敏感文件(合同/凭证/证件等)。
//
// SignURL 对两种驱动返回同样可用的短期 URL:
//   - OSS:阿里云预签名 GET URL。
//   - local:后端代理下载 URL(/api/file/dl?t=jwt&k=key),由 handler 解析 token 后 c.File()。

// Uploader 文件上传抽象(双桶)。local/OSS 均实现此接口。
type Uploader interface {
	// Save 存储文件到公共桶,可选指定子目录(不指定则按 YYYY/MM/DD 日期分目录)。
	// 返回 UploadedFile(含可直链访问的 URL)。
	Save(file *multipart.FileHeader, folders ...string) (*UploadedFile, error)

	// SavePrivate 存储文件到私有桶。返回的 UploadedFile.URL 为 objectKey(非明文 URL),
	// 调用方需另外调用 SignURL 取短期下载 URL。
	SavePrivate(file *multipart.FileHeader, folders ...string) (*UploadedFile, error)

	// SavePrivateBytes 把内存字节存储到私有桶(无需 multipart 包装)。
	// name 用于推断扩展名与原始文件名;contentType 如 "application/pdf"(留空则按扩展名映射)。
	// 适用于代码生成的文件(如合同 PDF 渲染结果)直接落盘。仍校验扩展名白名单与大小上限。
	SavePrivateBytes(name string, data []byte, contentType string, folders ...string) (*UploadedFile, error)

	// SignURL 为私有桶文件生成短期有效的下载 URL。
	// OSS 返回阿里云预签名 GET;local 返回后端代理下载 URL。
	SignURL(objectKey string, ttl time.Duration) (string, error)
}

// 存储可见性。
const (
	VisibilityPublic  = "public"
	VisibilityPrivate = "private"
)
