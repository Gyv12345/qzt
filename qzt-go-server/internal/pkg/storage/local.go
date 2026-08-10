package storage

import (
	"bytes"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"mime"
	"mime/multipart"
	"net/http"
	"net/url"
	"os"
	"path"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"
)

var (
	ErrEmptyFile       = errors.New("upload file is required")
	ErrFileTooLarge    = errors.New("upload file exceeds size limit")
	ErrInvalidFileType = errors.New("upload file type is not allowed")
	ErrInvalidFolder   = errors.New("upload folder is invalid")
)

var folderSegmentPattern = regexp.MustCompile(`^[A-Za-z0-9_-]+$`)
var extensionPattern = regexp.MustCompile(`^\.[A-Za-z0-9]{1,10}$`)

// LocalConfig 本地存储配置（双桶：公共目录 + 私有目录）。
type LocalConfig struct {
	Directory        string            // 公共目录(nginx 静态 serve)
	PrivateDirectory string            // 私有目录(后端代理鉴权访问,nginx 不直接 serve);留空则退化到 Directory
	PublicURL        string            // 公共资源访问域名(拼接公共文件 URL)
	SignSecret       string            // 私有文件代理下载 URL 的签名密钥(一般用 JWT secret)
	DownloadPrefix   string            // 私有文件代理下载 URL 前缀;留空默认 /api/file/dl
	MaxBytes         int64
	AllowedTypes     map[string]string
}

// UploadedFile 上传结果(公共与私有桶共用)。
// 公共桶:URL 为可直链访问的明文 URL;私有桶:URL 为 objectKey(需另调 SignURL 取短期下载 URL)。
type UploadedFile struct {
	OriginalName string `json:"original_name"`
	FileName     string `json:"file_name"`
	RelativePath string `json:"path"`
	URL          string `json:"url"`
	Size         int64  `json:"size"`
	ContentType  string `json:"content_type"`
	Visibility   string `json:"visibility"` // public / private
}

type Local struct {
	directory      string            // 公共目录绝对路径
	privateDir     string            // 私有目录绝对路径(为空则退化到 directory)
	publicURL      string            // 公共资源访问域名
	signSecret     string            // 私有文件代理下载 URL 签名密钥
	downloadPrefix string            // 私有文件代理下载 URL 前缀
	maxBytes       int64
	allowedTypes   map[string]string
	now            func() time.Time
}

func NewLocal(cfg LocalConfig) (*Local, error) {
	if strings.TrimSpace(cfg.Directory) == "" {
		return nil, errors.New("storage directory is required")
	}
	if cfg.MaxBytes <= 0 {
		return nil, errors.New("storage max bytes must be greater than zero")
	}

	allowedTypes := make(map[string]string, len(cfg.AllowedTypes))
	for extension, contentType := range cfg.AllowedTypes {
		extension = strings.ToLower(strings.TrimSpace(extension))
		if !strings.HasPrefix(extension, ".") {
			extension = "." + extension
		}
		if !extensionPattern.MatchString(extension) {
			return nil, fmt.Errorf("invalid allowed file extension %q", extension)
		}

		mediaType, _, err := mime.ParseMediaType(contentType)
		if err != nil {
			return nil, fmt.Errorf("invalid allowed MIME type %q: %w", contentType, err)
		}
		allowedTypes[extension] = strings.ToLower(mediaType)
	}
	if len(allowedTypes) == 0 {
		return nil, errors.New("storage allowed types must not be empty")
	}

	directory, err := filepath.Abs(cfg.Directory)
	if err != nil {
		return nil, fmt.Errorf("resolve storage directory: %w", err)
	}
	if err := os.MkdirAll(directory, 0o755); err != nil {
		return nil, fmt.Errorf("create storage directory: %w", err)
	}

	privateDir := ""
	if strings.TrimSpace(cfg.PrivateDirectory) != "" {
		pd, err := filepath.Abs(cfg.PrivateDirectory)
		if err != nil {
			return nil, fmt.Errorf("resolve private storage directory: %w", err)
		}
		if err := os.MkdirAll(pd, 0o755); err != nil {
			return nil, fmt.Errorf("create private storage directory: %w", err)
		}
		privateDir = pd
	}

	return &Local{
		directory:      directory,
		privateDir:     privateDir,
		publicURL:      strings.TrimRight(cfg.PublicURL, "/"),
		signSecret:     cfg.SignSecret,
		downloadPrefix: strings.TrimSpace(cfg.DownloadPrefix),
		maxBytes:       cfg.MaxBytes,
		allowedTypes:   allowedTypes,
		now:            time.Now,
	}, nil
}

// Save stores a multipart file under an optional folder. Without a folder it
// uses YYYY/MM/DD based on the application's time.Local.
func (s *Local) Save(file *multipart.FileHeader, folders ...string) (*UploadedFile, error) {
	if file == nil {
		return nil, ErrEmptyFile
	}
	if file.Size > s.maxBytes {
		return nil, ErrFileTooLarge
	}
	if len(folders) > 1 {
		return nil, ErrInvalidFolder
	}

	folder := ""
	if len(folders) == 1 {
		folder = folders[0]
	}
	relativeFolder, err := s.resolveFolder(folder)
	if err != nil {
		return nil, err
	}

	extension := strings.ToLower(filepath.Ext(file.Filename))
	expectedContentType, allowed := s.allowedTypes[extension]
	if !allowed {
		return nil, fmt.Errorf("%w: extension %q", ErrInvalidFileType, extension)
	}

	source, err := file.Open()
	if err != nil {
		return nil, fmt.Errorf("open upload file: %w", err)
	}
	defer source.Close()

	header := make([]byte, 512)
	headerSize, err := io.ReadFull(source, header)
	if err != nil && !errors.Is(err, io.EOF) && !errors.Is(err, io.ErrUnexpectedEOF) {
		return nil, fmt.Errorf("read upload file header: %w", err)
	}
	if headerSize == 0 {
		return nil, ErrEmptyFile
	}

	detectedContentType := http.DetectContentType(header[:headerSize])
	mediaType, _, err := mime.ParseMediaType(detectedContentType)
	if err != nil || !strings.EqualFold(mediaType, expectedContentType) {
		return nil, fmt.Errorf(
			"%w: extension %q does not match content type %q",
			ErrInvalidFileType,
			extension,
			detectedContentType,
		)
	}

	targetDirectory := filepath.Join(s.directory, filepath.FromSlash(relativeFolder))
	if err := os.MkdirAll(targetDirectory, 0o755); err != nil {
		return nil, fmt.Errorf("create upload folder: %w", err)
	}

	randomName, err := randomFileName(extension)
	if err != nil {
		return nil, err
	}

	tempFile, err := os.CreateTemp(targetDirectory, ".upload-*")
	if err != nil {
		return nil, fmt.Errorf("create temporary upload file: %w", err)
	}
	tempName := tempFile.Name()
	defer os.Remove(tempName)

	content := io.MultiReader(bytes.NewReader(header[:headerSize]), source)
	written, copyErr := io.Copy(tempFile, io.LimitReader(content, s.maxBytes+1))
	closeErr := tempFile.Close()
	if copyErr != nil {
		return nil, fmt.Errorf("write upload file: %w", copyErr)
	}
	if closeErr != nil {
		return nil, fmt.Errorf("close upload file: %w", closeErr)
	}
	if written > s.maxBytes {
		return nil, ErrFileTooLarge
	}

	if err := os.Chmod(tempName, 0o644); err != nil {
		return nil, fmt.Errorf("set upload file permissions: %w", err)
	}

	targetPath := filepath.Join(targetDirectory, randomName)
	if err := os.Rename(tempName, targetPath); err != nil {
		return nil, fmt.Errorf("save upload file: %w", err)
	}

	relativePath := path.Join(relativeFolder, randomName)
	return &UploadedFile{
		OriginalName: file.Filename,
		FileName:     randomName,
		RelativePath: relativePath,
		URL:          s.publicURL + "/" + relativePath,
		Size:         written,
		ContentType:  mediaType,
		Visibility:   VisibilityPublic,
	}, nil
}

func (s *Local) resolveFolder(folder string) (string, error) {
	if strings.TrimSpace(folder) == "" {
		return s.now().Format("2006/01/02"), nil
	}

	normalized := strings.ReplaceAll(strings.TrimSpace(folder), `\`, "/")
	if strings.HasPrefix(normalized, "/") {
		return "", ErrInvalidFolder
	}
	normalized = strings.Trim(normalized, "/")
	if normalized == "" || path.Clean(normalized) != normalized {
		return "", ErrInvalidFolder
	}

	for _, segment := range strings.Split(normalized, "/") {
		if !folderSegmentPattern.MatchString(segment) {
			return "", ErrInvalidFolder
		}
	}
	return normalized, nil
}

func randomFileName(extension string) (string, error) {
	var value [16]byte
	if _, err := rand.Read(value[:]); err != nil {
		return "", fmt.Errorf("generate upload file name: %w", err)
	}
	return hex.EncodeToString(value[:]) + extension, nil
}

// ErrPrivateBucketDisabled 私有桶/私有目录未配置。
var ErrPrivateBucketDisabled = errors.New("private storage is not configured")

// SavePrivate 存储文件到私有目录。返回的 URL 为 objectKey(非明文),
// 调用方需另调 SignURL 取短期下载 URL。
// 若私有目录未配置(privateDir 为空),退化到公共目录并记一条日志式行为(返回 ErrPrivateBucketDisabled)。
func (s *Local) SavePrivate(file *multipart.FileHeader, folders ...string) (*UploadedFile, error) {
	if s.privateDir == "" {
		return nil, ErrPrivateBucketDisabled
	}
	if file == nil {
		return nil, ErrEmptyFile
	}
	if file.Size > s.maxBytes {
		return nil, ErrFileTooLarge
	}
	if len(folders) > 1 {
		return nil, ErrInvalidFolder
	}

	folder := ""
	if len(folders) == 1 {
		folder = folders[0]
	}
	relativeFolder, err := s.resolveFolder(folder)
	if err != nil {
		return nil, err
	}

	extension := strings.ToLower(filepath.Ext(file.Filename))
	expectedContentType, allowed := s.allowedTypes[extension]
	if !allowed {
		return nil, fmt.Errorf("%w: extension %q", ErrInvalidFileType, extension)
	}

	source, err := file.Open()
	if err != nil {
		return nil, fmt.Errorf("open upload file: %w", err)
	}
	defer source.Close()

	header := make([]byte, 512)
	headerSize, err := io.ReadFull(source, header)
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

	targetDirectory := filepath.Join(s.privateDir, filepath.FromSlash(relativeFolder))
	if err := os.MkdirAll(targetDirectory, 0o755); err != nil {
		return nil, fmt.Errorf("create private upload folder: %w", err)
	}

	randomName, err := randomFileName(extension)
	if err != nil {
		return nil, err
	}

	tempFile, err := os.CreateTemp(targetDirectory, ".upload-*")
	if err != nil {
		return nil, fmt.Errorf("create temporary private upload file: %w", err)
	}
	tempName := tempFile.Name()
	defer os.Remove(tempName)

	content := io.MultiReader(bytes.NewReader(header[:headerSize]), source)
	written, copyErr := io.Copy(tempFile, io.LimitReader(content, s.maxBytes+1))
	closeErr := tempFile.Close()
	if copyErr != nil {
		return nil, fmt.Errorf("write private upload file: %w", copyErr)
	}
	if closeErr != nil {
		return nil, fmt.Errorf("close private upload file: %w", closeErr)
	}
	if written > s.maxBytes {
		return nil, ErrFileTooLarge
	}

	if err := os.Chmod(tempName, 0o644); err != nil {
		return nil, fmt.Errorf("set private upload file permissions: %w", err)
	}

	targetPath := filepath.Join(targetDirectory, randomName)
	if err := os.Rename(tempName, targetPath); err != nil {
		return nil, fmt.Errorf("save private upload file: %w", err)
	}

	relativePath := path.Join(relativeFolder, randomName)
	// 私有文件 URL 存 objectKey(不含域名),调用方用 SignURL 取短期下载 URL。
	return &UploadedFile{
		OriginalName: file.Filename,
		FileName:     randomName,
		RelativePath: relativePath,
		URL:          relativePath,
		Size:         written,
		ContentType:  mediaType,
		Visibility:   VisibilityPrivate,
	}, nil
}

// SignURL 为本地私有文件生成后端代理下载 URL: <prefix>?t=<token>&k=<key>。
// prefix 默认 /api/file/dl(直连后端);前端反代时配 storage.download_prefix 为 /prod-api/api/file/dl。
// token = base64url(payload) + "." + base64url(hmac-sha256(payload, secret)),
// payload = "<expUnixSec>|<key>"。token 无需 Authorization header,可直接放 <img src>。
func (s *Local) SignURL(objectKey string, ttl time.Duration) (string, error) {
	if s.signSecret == "" {
		return "", errors.New("local SignURL requires sign secret (config jwt.jwt_secret)")
	}
	exp := s.now().Add(ttl).Unix()
	payload := fmt.Sprintf("%d|%s", exp, objectKey)
	token, err := signToken(payload, s.signSecret)
	if err != nil {
		return "", err
	}
	prefix := s.downloadPrefix
	if prefix == "" {
		prefix = "/api/file/dl"
	}
	return prefix + "?t=" + token + "&k=" + url.QueryEscape(objectKey), nil
}

// VerifySignToken 校验代理下载 token,返回 objectKey;过期或签名不符返回 error。
// 供 /api/file/dl handler 调用。
func VerifySignToken(token, secret string) (objectKey string, exp int64, err error) {
	parts := strings.SplitN(token, ".", 2)
	if len(parts) != 2 {
		return "", 0, errors.New("invalid token format")
	}
	payload, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return "", 0, fmt.Errorf("decode token payload: %w", err)
	}
	sig, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return "", 0, fmt.Errorf("decode token signature: %w", err)
	}

	expectedSig := hmacSignature(string(payload), secret)
	if !hmac.Equal(sig, expectedSig) {
		return "", 0, errors.New("invalid token signature")
	}

	// payload = "<expUnixSec>|<objectKey>"
	s := string(payload)
	idx := strings.IndexByte(s, '|')
	if idx < 0 {
		return "", 0, errors.New("invalid token payload")
	}
	exp, err = strconv.ParseInt(s[:idx], 10, 64)
	if err != nil {
		return "", 0, fmt.Errorf("parse token exp: %w", err)
	}
	if time.Now().Unix() > exp {
		return "", 0, errors.New("token expired")
	}
	return s[idx+1:], exp, nil
}

// signToken 用 HMAC-SHA256 对 payload 签名,返回 payload.sig(base64url,无填充)。
func signToken(payload, secret string) (string, error) {
	sig := hmacSignature(payload, secret)
	return base64.RawURLEncoding.EncodeToString([]byte(payload)) + "." +
		base64.RawURLEncoding.EncodeToString(sig), nil
}

func hmacSignature(payload, secret string) []byte {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(payload))
	return mac.Sum(nil)
}
