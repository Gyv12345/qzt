package service

import (
	"strings"
	"testing"
)

// storage_config_test.go 存储配置服务的纯函数单测(不联网、不依赖测试环境):
// 密钥脱敏/脱敏值识别/脱敏值清洗、上传上限归一、按驱动的参数校验。

func TestMaskSecret(t *testing.T) {
	cases := []struct {
		in   string
		want string
	}{
		{"", ""},             // 空串原样(未配置)
		{"abc", "****abc"},   // 不足 4 位全掩
		{"abcd", "****abcd"}, // 恰好 4 位
		{"JbSC1lhdNgWyUNw8lqfkBg5RiIdxSy", "****dxSy"}, // 尾 4 位
	}
	for _, tc := range cases {
		if got := MaskSecret(tc.in); got != tc.want {
			t.Errorf("MaskSecret(%q) = %q, want %q", tc.in, got, tc.want)
		}
	}
}

func TestIsMaskedSecret(t *testing.T) {
	if !isMaskedSecret("****abcd") {
		t.Error("isMaskedSecret(****abcd) = false, want true")
	}
	if !isMaskedSecret("****") {
		t.Error("isMaskedSecret(****) = false, want true")
	}
	for _, s := range []string{"", "real-secret", "a****b"} {
		if isMaskedSecret(s) {
			t.Errorf("isMaskedSecret(%q) = true, want false", s)
		}
	}
}

func TestUnmaskSecret(t *testing.T) {
	if got := unmaskSecret("****abcd"); got != "" {
		t.Errorf("unmaskSecret(****abcd) = %q, want empty", got)
	}
	if got := unmaskSecret("real-secret"); got != "real-secret" {
		t.Errorf("unmaskSecret(real-secret) = %q, want unchanged", got)
	}
}

func TestNormalizeMaxUploadMB(t *testing.T) {
	cases := []struct {
		in   int64
		want int64
	}{
		{0, 50},                 // 未传回落默认 50MB
		{-5, 50},                // 非法值回落默认
		{20, 20},                // 合法值原样
		{200, 200},              // 大文件场景原样
		{100 * 1024, 10 * 1024}, // 超上限钳制 10GB
	}
	for _, tc := range cases {
		if got := normalizeMaxUploadMB(tc.in); got != tc.want {
			t.Errorf("normalizeMaxUploadMB(%d) = %d, want %d", tc.in, got, tc.want)
		}
	}
}

func TestValidateStorageConfigRequest(t *testing.T) {
	base := func() *SaveStorageConfigRequest {
		return &SaveStorageConfigRequest{Name: "测试配置", Driver: "local"}
	}

	// local:公共路径必填
	if err := validateStorageConfigRequest(base()); err == nil || !strings.Contains(err.Error(), "local_path") {
		t.Errorf("local without path: err = %v", err)
	}
	localReq := base()
	localReq.LocalPath = "./storage/public"
	if err := validateStorageConfigRequest(localReq); err != nil {
		t.Errorf("local valid: err = %v", err)
	}

	// oss:endpoint + 公共桶必填
	ossReq := base()
	ossReq.Driver = "oss"
	ossReq.OSSEndpoint = "oss-cn-hangzhou.aliyuncs.com"
	if err := validateStorageConfigRequest(ossReq); err == nil || !strings.Contains(err.Error(), "公共桶") {
		t.Errorf("oss without bucket: err = %v", err)
	}
	ossReq.OSSBucketName = "qzt-public"
	if err := validateStorageConfigRequest(ossReq); err != nil {
		t.Errorf("oss valid: err = %v", err)
	}

	// s3:endpoint + 公共桶 + 私有桶必填
	s3Req := base()
	s3Req.Driver = "s3"
	s3Req.S3Endpoint = "https://play.min.io"
	s3Req.S3BucketPublic = "pub"
	if err := validateStorageConfigRequest(s3Req); err == nil || !strings.Contains(err.Error(), "私有桶") {
		t.Errorf("s3 without private bucket: err = %v", err)
	}
	s3Req.S3BucketPrivate = "priv"
	if err := validateStorageConfigRequest(s3Req); err != nil {
		t.Errorf("s3 valid: err = %v", err)
	}

	// 未知驱动拒绝
	badReq := base()
	badReq.Driver = "ftp"
	badReq.LocalPath = "./storage/public"
	if err := validateStorageConfigRequest(badReq); err == nil || !strings.Contains(err.Error(), "不支持") {
		t.Errorf("unknown driver: err = %v", err)
	}

	// 名称必填
	noName := base()
	noName.Driver = "local"
	noName.LocalPath = "./storage/public"
	noName.Name = " "
	if err := validateStorageConfigRequest(noName); err == nil || !strings.Contains(err.Error(), "名称") {
		t.Errorf("empty name: err = %v", err)
	}
}
