package service

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

// TestOCRDailyKey 每用户每日计数键形态。
func TestOCRDailyKey(t *testing.T) {
	assert.Equal(t, "ocr:daily:42:2026-11-14", OCRDailyKey(42, "2026-11-14"))
}

// TestValidateOCRUpload 大小与 MIME 白名单校验。
func TestValidateOCRUpload(t *testing.T) {
	// 合法各形态。
	for _, mt := range []string{"image/jpeg", "image/png", "image/webp"} {
		mime, err := ValidateOCRUpload(1024, mt)
		assert.NoError(t, err, mt)
		assert.Equal(t, mt, mime)
	}
	// 超过 10MB。
	_, err := ValidateOCRUpload(int64(OCRMaxFileSize)+1, "image/jpeg")
	assert.Error(t, err)
	// 空文件。
	_, err = ValidateOCRUpload(0, "image/jpeg")
	assert.Error(t, err)
	// 非白名单类型。
	for _, mt := range []string{"application/pdf", "image/gif", "image/bmp", ""} {
		_, err = ValidateOCRUpload(1024, mt)
		assert.Error(t, err, mt)
	}
}
