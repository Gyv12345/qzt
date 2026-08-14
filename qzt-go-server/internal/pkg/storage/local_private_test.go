package storage

import (
	"bytes"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

// newPrivateLocal builds a *Local with both public + private dirs for SavePrivate* tests.
func newPrivateLocal(t *testing.T) (*Local, string, string) {
	t.Helper()
	root := filepath.Join(t.TempDir(), "public")
	private := filepath.Join(t.TempDir(), "private")
	local, err := NewLocal(LocalConfig{
		Directory:        root,
		PrivateDirectory: private,
		PublicURL:        "https://cdn.example.com/uploads",
		SignSecret:       "test-secret",
		MaxBytes:         1024,
		AllowedTypes:     testAllowedTypes(),
	})
	if err != nil {
		t.Fatalf("NewLocal() error = %v", err)
	}
	return local, root, private
}

// ---- SavePrivate (multipart -> private dir) ----

func TestLocalSavePrivateSuccess(t *testing.T) {
	local, _, private := newPrivateLocal(t)
	local.now = func() time.Time { return time.Date(2026, time.August, 12, 10, 0, 0, 0, time.Local) }

	content := []byte{0xff, 0xd8, 0xff, 0xdb, 0x00, 0x43, 0x00}
	header := newFileHeader(t, "Photo.JPG", "image/jpeg", content)
	result, err := local.SavePrivate(header, "contract")
	if err != nil {
		t.Fatalf("SavePrivate() error = %v", err)
	}

	// 私有桶: URL 存 objectKey(== RelativePath), 不带 publicURL 前缀。
	if result.URL != result.RelativePath {
		t.Fatalf("URL = %q, want objectKey == RelativePath %q", result.URL, result.RelativePath)
	}
	if !strings.HasPrefix(result.RelativePath, "contract/") {
		t.Fatalf("RelativePath = %q, want under contract/", result.RelativePath)
	}
	if result.Visibility != VisibilityPrivate {
		t.Fatalf("Visibility = %q, want private", result.Visibility)
	}
	if result.ContentType != "image/jpeg" {
		t.Fatalf("ContentType = %q, want image/jpeg", result.ContentType)
	}
	if result.Size != int64(len(content)) {
		t.Fatalf("Size = %d, want %d", result.Size, len(content))
	}

	// 落盘在私有目录, 内容正确, 权限 0644。
	savedPath := filepath.Join(private, filepath.FromSlash(result.RelativePath))
	got, err := os.ReadFile(savedPath)
	if err != nil {
		t.Fatalf("ReadFile(private) error = %v", err)
	}
	if !bytes.Equal(got, content) {
		t.Fatalf("saved content mismatch")
	}
	if perm := mustPerm(t, savedPath); perm != 0o644 {
		t.Fatalf("perm = %o, want 644", perm)
	}
}

func TestLocalSavePrivateDisabledWithoutPrivateDir(t *testing.T) {
	local, err := NewLocal(LocalConfig{
		Directory:    t.TempDir(),
		PublicURL:    "/uploads",
		MaxBytes:     1024,
		AllowedTypes: testAllowedTypes(),
	})
	if err != nil {
		t.Fatalf("NewLocal() error = %v", err)
	}
	header := newFileHeader(t, "x.jpg", "image/jpeg", []byte{0xff, 0xd8, 0xff, 0xdb, 0x00})
	_, err = local.SavePrivate(header)
	if !errors.Is(err, ErrPrivateBucketDisabled) {
		t.Fatalf("SavePrivate() error = %v, want ErrPrivateBucketDisabled", err)
	}
}

func TestLocalSavePrivateErrorPaths(t *testing.T) {
	local, _, _ := newPrivateLocal(t)
	jpeg := newFileHeader(t, "x.jpg", "image/jpeg", []byte{0xff, 0xd8, 0xff, 0xdb, 0x00})

	t.Run("nil file", func(t *testing.T) {
		if _, err := local.SavePrivate(nil); !errors.Is(err, ErrEmptyFile) {
			t.Fatalf("err = %v, want ErrEmptyFile", err)
		}
	})
	t.Run("oversized", func(t *testing.T) {
		big := newFileHeader(t, "x.jpg", "image/jpeg", make([]byte, 2048))
		if _, err := local.SavePrivate(big); !errors.Is(err, ErrFileTooLarge) {
			t.Fatalf("err = %v, want ErrFileTooLarge", err)
		}
	})
	t.Run("invalid folder", func(t *testing.T) {
		if _, err := local.SavePrivate(jpeg, "../escape"); !errors.Is(err, ErrInvalidFolder) {
			t.Fatalf("err = %v, want ErrInvalidFolder", err)
		}
	})
	t.Run("too many folders", func(t *testing.T) {
		if _, err := local.SavePrivate(jpeg, "a", "b"); !errors.Is(err, ErrInvalidFolder) {
			t.Fatalf("err = %v, want ErrInvalidFolder", err)
		}
	})
	t.Run("disguised type", func(t *testing.T) {
		// .jpg 名 + PNG 魔数 -> 嗅探出 image/png != image/jpeg。
		bad := newFileHeader(t, "x.jpg", "image/jpeg", []byte{0x89, 'P', 'N', 'G', 0x0d, 0x0a, 0x1a, 0x0a})
		if _, err := local.SavePrivate(bad); !errors.Is(err, ErrInvalidFileType) {
			t.Fatalf("err = %v, want ErrInvalidFileType", err)
		}
	})
}

// ---- SavePrivateBytes ([]byte -> private dir, no multipart, no sniff) ----

func TestLocalSavePrivateBytesSuccess(t *testing.T) {
	local, _, private := newPrivateLocal(t)
	data := []byte("%PDF-1.4 raw bytes not sniffed")

	result, err := local.SavePrivateBytes("contract.pdf", data, "application/pdf", "contract")
	// 注意: testAllowedTypes() 不含 pdf, 这里应被扩展名白名单拒绝。
	if err == nil {
		t.Fatalf("expected ErrInvalidFileType for .pdf, got nil; result=%+v", result)
	}
	if !errors.Is(err, ErrInvalidFileType) {
		t.Fatalf("err = %v, want ErrInvalidFileType", err)
	}

	// 改用白名单内的 .png + 显式 image/png contentType 验证成功路径。
	result, err = local.SavePrivateBytes("contract.png", data, "image/png", "contract")
	if err != nil {
		t.Fatalf("SavePrivateBytes() error = %v", err)
	}
	if result.URL != result.RelativePath || !strings.HasPrefix(result.RelativePath, "contract/") {
		t.Fatalf("URL/RelativePath = %q / %q", result.URL, result.RelativePath)
	}
	if result.Visibility != VisibilityPrivate {
		t.Fatalf("Visibility = %q, want private", result.Visibility)
	}
	if result.ContentType != "image/png" {
		t.Fatalf("ContentType = %q, want image/png (honored passed contentType)", result.ContentType)
	}
	if result.OriginalName != "contract.png" {
		t.Fatalf("OriginalName = %q", result.OriginalName)
	}
	if result.Size != int64(len(data)) {
		t.Fatalf("Size = %d, want %d", result.Size, len(data))
	}
	got, err := os.ReadFile(filepath.Join(private, filepath.FromSlash(result.RelativePath)))
	if err != nil {
		t.Fatalf("ReadFile error = %v", err)
	}
	if !bytes.Equal(got, data) {
		t.Fatalf("saved bytes mismatch")
	}
}

func TestLocalSavePrivateBytesEmptyContentTypeUsesExtensionMap(t *testing.T) {
	local, _, _ := newPrivateLocal(t)
	data := []byte("anything")
	// contentType 留空 -> 取扩展名白名单映射 (.png -> image/png)。
	result, err := local.SavePrivateBytes("avatar.png", data, "", "u")
	if err != nil {
		t.Fatalf("SavePrivateBytes() error = %v", err)
	}
	if result.ContentType != "image/png" {
		t.Fatalf("ContentType = %q, want image/png from extension map", result.ContentType)
	}
}

func TestLocalSavePrivateBytesErrorPaths(t *testing.T) {
	local, _, _ := newPrivateLocal(t)

	t.Run("disabled", func(t *testing.T) {
		pub, err := NewLocal(LocalConfig{
			Directory:    t.TempDir(),
			MaxBytes:     1024,
			AllowedTypes: testAllowedTypes(),
		})
		if err != nil {
			t.Fatal(err)
		}
		if _, err := pub.SavePrivateBytes("x.png", []byte("x"), "image/png"); !errors.Is(err, ErrPrivateBucketDisabled) {
			t.Fatalf("err = %v, want ErrPrivateBucketDisabled", err)
		}
	})
	t.Run("empty data", func(t *testing.T) {
		if _, err := local.SavePrivateBytes("x.png", nil, "image/png"); !errors.Is(err, ErrEmptyFile) {
			t.Fatalf("err = %v, want ErrEmptyFile", err)
		}
	})
	t.Run("oversized", func(t *testing.T) {
		if _, err := local.SavePrivateBytes("x.png", make([]byte, 2048), "image/png"); !errors.Is(err, ErrFileTooLarge) {
			t.Fatalf("err = %v, want ErrFileTooLarge", err)
		}
	})
	t.Run("disallowed extension", func(t *testing.T) {
		if _, err := local.SavePrivateBytes("x.exe", []byte("x"), "application/octet-stream"); !errors.Is(err, ErrInvalidFileType) {
			t.Fatalf("err = %v, want ErrInvalidFileType", err)
		}
	})
	t.Run("too many folders", func(t *testing.T) {
		if _, err := local.SavePrivateBytes("x.png", []byte("x"), "image/png", "a", "b"); !errors.Is(err, ErrInvalidFolder) {
			t.Fatalf("err = %v, want ErrInvalidFolder", err)
		}
	})
}

// ---- Save gap-fills (behavior not yet pinned by existing tests) ----

func TestLocalSaveVisibilityAndExtraErrorPaths(t *testing.T) {
	local, err := NewLocal(LocalConfig{
		Directory:    t.TempDir(),
		PublicURL:    "/uploads",
		MaxBytes:     1024,
		AllowedTypes: testAllowedTypes(),
	})
	if err != nil {
		t.Fatal(err)
	}
	jpeg := newFileHeader(t, "x.jpg", "image/jpeg", []byte{0xff, 0xd8, 0xff, 0xdb, 0x00})

	t.Run("visibility public", func(t *testing.T) {
		res, err := local.Save(jpeg, "f")
		if err != nil {
			t.Fatalf("Save() error = %v", err)
		}
		if res.Visibility != VisibilityPublic {
			t.Fatalf("Visibility = %q, want public", res.Visibility)
		}
	})
	t.Run("too many folders", func(t *testing.T) {
		if _, err := local.Save(jpeg, "a", "b"); !errors.Is(err, ErrInvalidFolder) {
			t.Fatalf("err = %v, want ErrInvalidFolder", err)
		}
	})
	t.Run("disallowed extension", func(t *testing.T) {
		exe := newFileHeader(t, "x.exe", "application/octet-stream", []byte("MZ"))
		if _, err := local.Save(exe); !errors.Is(err, ErrInvalidFileType) {
			t.Fatalf("err = %v, want ErrInvalidFileType", err)
		}
	})
}

// mustPerm is a small stat helper for permission assertions.
func mustPerm(t *testing.T, path string) os.FileMode {
	t.Helper()
	info, err := os.Stat(path)
	if err != nil {
		t.Fatalf("Stat(%q) error = %v", path, err)
	}
	return info.Mode().Perm()
}
