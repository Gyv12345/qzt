package storage

import (
	"errors"
	"strings"
	"testing"
)

// s3_test.go S3 兼容驱动的纯函数单测(不联网):endpoint 解析、公开 URL 拼接
// (自定义域名优先/虚拟主机式/path-style/http 兜底)、构造期参数缺失校验、
// 私有桶未配置的错误语义(与 oss.go 对齐)。

func TestSplitS3Endpoint(t *testing.T) {
	cases := []struct {
		in     string
		host   string
		secure bool
	}{
		{"https://play.min.io", "play.min.io", true},
		{"https://play.min.io/", "play.min.io", true},
		{"http://127.0.0.1:9000", "127.0.0.1:9000", false},
		{"HTTP://EXAMPLE.com", "EXAMPLE.com", false},                           // scheme 大小写不敏感,host 保留原样
		{"oss-cn-hangzhou.aliyuncs.com", "oss-cn-hangzhou.aliyuncs.com", true}, // 无 scheme 默认 https
		{"", "", true},
	}
	for _, tc := range cases {
		host, secure := splitS3Endpoint(tc.in)
		if host != tc.host || secure != tc.secure {
			t.Errorf("splitS3Endpoint(%q) = (%q, %v), want (%q, %v)", tc.in, host, secure, tc.host, tc.secure)
		}
	}
}

func TestS3BuildPublicURL(t *testing.T) {
	newS3 := func() *S3 {
		return &S3{
			endpoint:     "s3.example.com",
			secure:       true,
			publicBucket: "pub",
			domainPublic: "",
			pathStyle:    false,
		}
	}

	t.Run("自定义域名优先(去尾斜杠)", func(t *testing.T) {
		s := newS3()
		s.domainPublic = "https://cdn.example.com"
		if got := s.buildPublicURL("2026/11/13/a.png"); got != "https://cdn.example.com/2026/11/13/a.png" {
			t.Errorf("buildPublicURL() = %q", got)
		}
	})

	t.Run("虚拟主机式默认拼接", func(t *testing.T) {
		s := newS3()
		if got := s.buildPublicURL("2026/11/13/a.png"); got != "https://pub.s3.example.com/2026/11/13/a.png" {
			t.Errorf("buildPublicURL() = %q", got)
		}
	})

	t.Run("path-style 拼接", func(t *testing.T) {
		s := newS3()
		s.pathStyle = true
		if got := s.buildPublicURL("a.png"); got != "https://s3.example.com/pub/a.png" {
			t.Errorf("buildPublicURL() = %q", got)
		}
	})

	t.Run("http 端点走 http scheme(内网 MinIO)", func(t *testing.T) {
		s := newS3()
		s.endpoint = "127.0.0.1:9000"
		s.secure = false
		s.pathStyle = true
		if got := s.buildPublicURL("a.png"); got != "http://127.0.0.1:9000/pub/a.png" {
			t.Errorf("buildPublicURL() = %q", got)
		}
	})
}

func TestNewS3RequiresEssentialParams(t *testing.T) {
	cases := []S3Config{
		{},
		{Endpoint: "play.min.io"},
		{Endpoint: "play.min.io", AccessKey: "ak"},
		{Endpoint: "play.min.io", AccessKey: "ak", SecretKey: "sk"},
	}
	for i, cfg := range cases {
		if _, err := NewS3(cfg); err == nil || !strings.Contains(err.Error(), "incomplete") {
			t.Errorf("case %d: NewS3() error = %v, want incomplete-config error", i, err)
		}
	}
}

func TestS3PrivateBucketDisabledWithoutPrivateBucket(t *testing.T) {
	// 私有桶未配置(空串)时,私有上传/签名返回 ErrPrivateBucketDisabled,与 oss.go 语义一致。
	// 直接构造结构体即可验证前置短路,不触网。
	s := &S3{publicBucket: "pub"}
	if _, err := s.SavePrivate(nil); !errors.Is(err, ErrPrivateBucketDisabled) {
		t.Errorf("SavePrivate() error = %v, want ErrPrivateBucketDisabled", err)
	}
	if _, err := s.SavePrivateBytes("a.pdf", []byte("x"), ""); !errors.Is(err, ErrPrivateBucketDisabled) {
		t.Errorf("SavePrivateBytes() error = %v, want ErrPrivateBucketDisabled", err)
	}
	if _, err := s.SignURL("a.pdf", 0); !errors.Is(err, ErrPrivateBucketDisabled) {
		t.Errorf("SignURL() error = %v, want ErrPrivateBucketDisabled", err)
	}
	if err := s.Delete("a.pdf", VisibilityPrivate); !errors.Is(err, ErrPrivateBucketDisabled) {
		t.Errorf("Delete() error = %v, want ErrPrivateBucketDisabled", err)
	}
	// 公共桶删除不受私有桶配置影响(空 key 幂等短路)
	if err := s.Delete("", VisibilityPublic); err != nil {
		t.Errorf("Delete(empty key) error = %v, want nil", err)
	}
}
