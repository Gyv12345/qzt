package storage

import (
	"errors"
	"fmt"
	"io"
	"mime"
	"mime/multipart"
	"net/http"
	"path/filepath"
	"strings"
)

// common.go local 和 OSS 共享的文件校验逻辑。

// validateFile 对 multipart 文件头做大小 + 扩展名 + MIME 嗅探校验。
// 返回:扩展名(含.)、校验后的 MIME 类型、文件头部字节、剩余 reader 拼接用的 header 切片。
// 调用方需先 file.Open() 获取 reader,再用返回的 header 切片与后续读取拼接上传。
type fileValidation struct {
	extension   string
	contentType string
	header      []byte // 已读取的前 512 字节(用于 MIME 嗅探)
	headerSize  int    // header 有效长度
}

func validateUpload(file *multipart.FileHeader, maxBytes int64, allowedTypes map[string]string) (*fileValidation, error) {
	if file.Size > maxBytes {
		return nil, ErrFileTooLarge
	}

	extension := strings.ToLower(filepath.Ext(file.Filename))
	expectedContentType, allowed := allowedTypes[extension]
	if !allowed {
		return nil, fmt.Errorf("%w: extension %q", ErrInvalidFileType, extension)
	}

	src, err := file.Open()
	if err != nil {
		return nil, fmt.Errorf("open upload file: %w", err)
	}
	defer src.Close()

	header := make([]byte, 512)
	headerSize, err := io.ReadFull(src, header)
	if err != nil && !errors.Is(err, io.EOF) && !errors.Is(err, io.ErrUnexpectedEOF) {
		return nil, fmt.Errorf("read upload file header: %w", err)
	}
	if headerSize == 0 {
		return nil, ErrEmptyFile
	}

	detectedContentType := http.DetectContentType(header[:headerSize])
	mediaType, _, err := mime.ParseMediaType(detectedContentType)
	if err != nil || !strings.EqualFold(mediaType, expectedContentType) {
		return nil, fmt.Errorf("%w: extension %q does not match content type %q",
			ErrInvalidFileType, extension, detectedContentType)
	}

	return &fileValidation{
		extension:   extension,
		contentType: mediaType,
		header:      header,
		headerSize:  headerSize,
	}, nil
}
