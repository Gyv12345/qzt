package storage

import "mime/multipart"

// uploader.go 文件上传抽象接口。
// *Local 和 *OSS 都实现此接口,app.Uploader 持有接口类型,
// 通过配置 driver 切换存储后端。

// Uploader 文件上传抽象。local/OSS/其他云存储均实现此接口。
type Uploader interface {
	// Save 存储文件,可选指定子目录(不指定则按 YYYY/MM/DD 日期分目录)。
	// 返回 UploadedFile(含可访问 URL)。
	Save(file *multipart.FileHeader, folders ...string) (*UploadedFile, error)
}
