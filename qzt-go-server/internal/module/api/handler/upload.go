package handler

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"mime"
	"mime/multipart"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/aliyun/aliyun-oss-go-sdk/oss"
	"github.com/gin-gonic/gin"
	"slices"

	"qzt-go-server/config"
	"qzt-go-server/internal/app"
	"qzt-go-server/internal/middleware"
	"qzt-go-server/internal/model"
	"qzt-go-server/internal/module/api/service"
	"qzt-go-server/internal/module/system/errcode"
	"qzt-go-server/internal/pkg/storage"
	response "qzt-go-server/pkg/xresponse"
	"qzt-go-server/pkg/xlogger"
)

const (
	bytesPerMegabyte        int64 = 1024 * 1024
	multipartOverheadBytes int64 = 1024 * 1024
	defaultSignTTL               = time.Hour // 私有文件签名下载 URL 有效期
)

// fileUploader 文件存储抽象，便于测试注入替身。
type fileUploader interface {
	Save(file *multipart.FileHeader, folders ...string) (*storage.UploadedFile, error)
	SavePrivate(file *multipart.FileHeader, folders ...string) (*storage.UploadedFile, error)
	SavePrivateBytes(name string, data []byte, contentType string, folders ...string) (*storage.UploadedFile, error)
	SignURL(objectKey string, ttl time.Duration) (string, error)
}

// UploadHandler 文件上传与签名下载 handler(双桶)。
type UploadHandler struct {
	uploader fileUploader
}

// UploadResult 上传结果，包含文件信息与资源访问域名。
type UploadResult struct {
	*storage.UploadedFile
	ResourceDomain string `json:"resource_domain"`
}

func NewUploadHandler() *UploadHandler {
	return &UploadHandler{uploader: app.Uploader}
}

// Upload 文件上传(双桶)。
// query 参数 visibility: public(默认,公共桶直链)/ private(私有桶,返回 objectKey)。
// @Summary      文件上传
// @Description  上传文件,支持公共桶(visibility=public)与私有桶(visibility=private)
// @Tags         公共接口
// @Accept       multipart/form-data
// @Produce      json
// @Param        file         formData  file    true   "上传的文件"
// @Param        folder       formData  string  false  "存储文件夹"
// @Param        visibility   query     string  false  "可见性: public(默认)/private"  Enums(public, private)
// @Success      200  {object}  xresponse.Response{data=UploadResult}
// @Router       /api/upload [post]
func (h *UploadHandler) Upload(c *gin.Context) {
	// 限制请求体大小，超出直接由 MaxBytesReader 返回错误
	if maxMB := config.Get().Storage.MaxUploadMB; maxMB > 0 {
		maxBodyBytes := int64(maxMB)*bytesPerMegabyte + multipartOverheadBytes
		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxBodyBytes)
	}

	file, err := c.FormFile("file")
	if err != nil {
		var maxBytesError *http.MaxBytesError
		if errors.As(err, &maxBytesError) {
			response.Fail(c, errcode.ErrParam, "文件大小超过限制")
			return
		}
		response.Fail(c, errcode.ErrParam, "请选择上传文件")
		return
	}

	if h.uploader == nil {
		response.Fail(c, errcode.ErrServer, "文件存储服务未初始化")
		return
	}

	// 每次上传取最新的 Uploader(配置在启动时固定,但保留取最新实例的习惯)
	uploader := app.GetUploader()
	if uploader == nil {
		uploader = h.uploader
	}

	visibility := strings.ToLower(strings.TrimSpace(c.DefaultQuery("visibility", storage.VisibilityPublic)))
	folder := c.PostForm("folder")

	var result *storage.UploadedFile
	switch visibility {
	case storage.VisibilityPrivate:
		result, err = uploader.SavePrivate(file, folder)
	default:
		visibility = storage.VisibilityPublic
		result, err = uploader.Save(file, folder)
	}

	switch {
	case err == nil:
		resourceDomain := strings.TrimRight(strings.TrimSpace(config.Get().Storage.ResourceDomain), "/")
		response.OK(c, &UploadResult{
			UploadedFile:   result,
			ResourceDomain: resourceDomain,
		})
	case errors.Is(err, storage.ErrEmptyFile):
		response.Fail(c, errcode.ErrParam, "上传文件不能为空")
	case errors.Is(err, storage.ErrFileTooLarge):
		response.Fail(c, errcode.ErrParam, "文件大小超过限制")
	case errors.Is(err, storage.ErrInvalidFileType):
		response.Fail(c, errcode.ErrParam, "不支持的文件类型")
	case errors.Is(err, storage.ErrInvalidFolder):
		response.Fail(c, errcode.ErrParam, "文件夹名称不合法")
	case errors.Is(err, storage.ErrPrivateBucketDisabled):
		response.Fail(c, errcode.ErrServer, "私有存储未配置,请在配置文件中设置 private_bucket_name / private_path")
	default:
		if app.Log != nil {
			app.Log.Errorw("upload file failed", "err", err, "visibility", visibility)
		}
		response.Fail(c, errcode.ErrServer, "文件上传失败")
	}
}

// STSResult 前端直传 OSS 所需的预签名 URL。
type STSResult struct {
	Driver      string `json:"driver"`       // oss / local(local 时前端走后端上传)
	UploadURL   string `json:"upload_url"`   // OSS PUT 预签名 URL(前端直接 PUT 文件)
	FileURL     string `json:"file_url"`     // 上传成功后的访问 URL(公共桶=CDN明文;私有桶=objectKey)
	ContentType string `json:"content_type"` // 文件 MIME(PUT 时需带 Content-Type header)
}

// STS 返回前端直传 OSS 的预签名 URL。
// query 参数 private: true 时给私有桶签名(返回 objectKey 而非明文 URL)。
// @Summary  获取 OSS 直传预签名 URL
// @Tags     公共接口
// @Produce  json
// @Security BearerAuth
// @Param    filename  query  string  true   "文件名(用于推断扩展名)"
// @Param    folder    query  string  false  "存储文件夹(默认 uploads)"
// @Param    private   query  bool    false  "是否上传到私有桶(默认 false)"
// @Success  200  {object}  xresponse.Response
// @Router   /api/upload/sts [get]
func (h *UploadHandler) STS(c *gin.Context) {
	storageCfg := config.Get().Storage
	if storageCfg.Driver != config.StorageDriverOSS {
		response.OK(c, &STSResult{Driver: "local"})
		return
	}

	filename := c.Query("filename")
	if filename == "" {
		response.Fail(c, errcode.ErrParam, "filename 必填")
		return
	}
	folder := c.DefaultQuery("folder", "uploads")
	usePrivate := c.Query("private") == "true" || c.Query("visibility") == storage.VisibilityPrivate

	// 推断扩展名和 content-type;直传通道不经过 Uploader.Save 的校验,
	// 扩展名必须过同一份白名单——否则可向公共桶/CDN 域直传 HTML/SVG
	// 造成存储型 XSS,或上传任意可执行文件。
	ext := strings.ToLower(filepath.Ext(filename))
	if !app.IsAllowedFileExt(ext) {
		response.Fail(c, errcode.ErrParam, "不支持的文件类型: "+ext)
		return
	}
	contentType := mime.TypeByExtension(ext)
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	// 生成随机文件名
	now := time.Now()
	objectKey := strings.Trim(folder, "/") + "/" + now.Format("20060102") + "/" + randomHex(16) + ext

	// 用 OSS SDK 签 PUT URL(15 分钟有效)
	endpoint := storageCfg.OSS.Endpoint
	client, err := oss.New(endpoint, storageCfg.OSS.AccessKeyID, storageCfg.OSS.AccessKeySecret)
	if err != nil {
		// 不透传 err:含 endpoint/AK 信息,进日志即可
		xlogger.ErrorfCtx(c.Request.Context(), "STS 创建 OSS 客户端失败: %v", err)
		response.Fail(c, errcode.ErrServer, "存储服务暂不可用，请稍后重试")
		return
	}

	bucketName := storageCfg.OSS.BucketName
	if usePrivate {
		bucketName = storageCfg.OSS.PrivateBucketName
	}
	if bucketName == "" {
		response.Fail(c, errcode.ErrServer, "私有桶未配置,请在配置文件设置 oss.private_bucket_name")
		return
	}

	bucket, err := client.Bucket(bucketName)
	if err != nil {
		xlogger.ErrorfCtx(c.Request.Context(), "STS 获取 bucket 失败: %v", err)
		response.Fail(c, errcode.ErrServer, "存储服务暂不可用，请稍后重试")
		return
	}

	// 公共桶: inline 预览;私有桶: attachment 触发下载
	disposition := "inline"
	if usePrivate {
		disposition = "attachment"
	}
	uploadURL, err := bucket.SignURL(objectKey, oss.HTTPPut, 900,
		oss.ContentType(contentType),
		oss.ContentDisposition(disposition),
	)
	if err != nil {
		xlogger.ErrorfCtx(c.Request.Context(), "STS 签名失败: %v", err)
		response.Fail(c, errcode.ErrServer, "获取上传链接失败，请稍后重试")
		return
	}

	// 拼最终访问 URL:公共桶用 CDN 明文,私有桶返回 objectKey(前端落库,后续走 /api/file/sign 取下载 URL)
	var fileURL string
	if usePrivate {
		fileURL = objectKey
	} else {
		cdnDomain := storageCfg.OSS.CustomDomain
		if cdnDomain == "" {
			cdnDomain = storageCfg.ResourceDomain
		}
		cdnDomain = strings.TrimRight(cdnDomain, "/")
		fileURL = cdnDomain + "/" + objectKey
	}

	response.OK(c, &STSResult{
		Driver:      "oss",
		UploadURL:   uploadURL,
		FileURL:     fileURL,
		ContentType: contentType,
	})
}

// SignResult 私有文件签名下载 URL。
type SignResult struct {
	URL string `json:"url"` // 短期有效的私有文件下载 URL
}

// Sign 为私有文件签发短期下载 URL(1 小时有效)。前端拿到后可直接 <img src>/window.open。
// @Summary  获取私有文件下载 URL
// @Description  为私有桶/私有目录的文件签发短期(1h)下载 URL,无需 Authorization header
// @Tags        公共接口
// @Produce     json
// @Security    BearerAuth
// @Param       key   query  string  true  "文件 objectKey(上传时返回的 file_url)"
// @Success     200  {object}  xresponse.Response{data=SignResult}
// @Router      /api/file/sign [get]
func (h *UploadHandler) Sign(c *gin.Context) {
	key := c.Query("key")
	if key == "" {
		response.Fail(c, errcode.ErrParam, "key 必填")
		return
	}

	// 归属校验:私有文件的 objectKey 必须对应已登记的附件记录,
	// 且当前用户对该附件关联的业务资源有数据权限——否则任意登录用户
	// 枚举 key 即可下载他人合同扫描件/工资条等私有文件。
	attSvc := service.NewAttachmentService()
	att, err := attSvc.FindByObjectKey(c.Request.Context(), key)
	if err != nil {
		response.Fail(c, errcode.ErrForbidden, "文件未登记附件记录,无法生成下载链接")
		return
	}
	isSuper := slices.Contains(middleware.GetRoleCodes(c), model.SuperAdminRoleCode)
	if err := service.CheckAttachmentAccess(c.Request.Context(),
		att.BizType, att.ResourceID, att.UploaderID, isSuper); err != nil {
		response.Fail(c, errcode.ErrForbidden, err.Error())
		return
	}

	uploader := app.GetUploader()
	if uploader == nil {
		uploader = h.uploader
	}
	if uploader == nil {
		response.Fail(c, errcode.ErrServer, "文件存储服务未初始化")
		return
	}

	signedURL, err := uploader.SignURL(key, defaultSignTTL)
	if err != nil {
		if errors.Is(err, storage.ErrPrivateBucketDisabled) {
			response.Fail(c, errcode.ErrServer, "私有存储未配置")
			return
		}
		if app.Log != nil {
			app.Log.Errorw("sign private url failed", "err", err, "key", key)
		}
		response.Fail(c, errcode.ErrServer, "生成下载链接失败")
		return
	}

	response.OK(c, &SignResult{URL: signedURL})
}

// Download 本地私有文件代理下载(仅 driver=local 时使用)。
// OSS 模式的 SignURL 返回阿里云预签名 URL,浏览器直连 OSS,不走本接口。
// 鉴权靠 token(由 SignURL 签发,无需 Authorization header),校验后 c.File() 流式返回。
// @Summary  下载私有文件(local 模式)
// @Description  解析 token 后流式返回私有目录文件。OSS 模式不会调用此接口。
// @Tags       公共接口
// @Produce    application/octet-stream
// @Param      t   query  string  true  "签名 token(由 /api/file/sign 返回 URL 中的 t 参数)"
// @Param      k   query  string  true  "文件 objectKey"
// @Router     /api/file/dl [get]
func (h *UploadHandler) Download(c *gin.Context) {
	token := c.Query("t")
	key := c.Query("k")
	if token == "" || key == "" {
		response.Fail(c, errcode.ErrParam, "t 和 k 必填")
		return
	}

	// 解析 token,校验签名 + key 匹配 + 未过期
	gotKey, _, err := storage.VerifySignToken(token, config.Get().JWT.JwtSecret)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "下载链接无效或已过期: "+err.Error())
		return
	}

	// 防路径穿越:校验 token 内的 key 与 query 的 k 一致,且 key 不含 .. 等危险路径
	if gotKey != key {
		response.Fail(c, errcode.ErrParam, "下载链接与文件不匹配")
		return
	}
	cleanKey := filepath.Clean("/" + key) // 前缀 / 防止逃逸,Clean 后形如 /a/b/c
	cleanKey = strings.TrimPrefix(cleanKey, "/")
	if strings.Contains(cleanKey, "..") {
		response.Fail(c, errcode.ErrParam, "非法文件路径")
		return
	}

	// 定位私有目录:从当前 Uploader 拿(OSS 模式不该走到这里,但防御性判断 driver)
	storageCfg := config.Get().Storage
	privateDir := storageCfg.PrivatePath
	if privateDir == "" {
		privateDir = "./storage/private"
	}

	// 解码 URL 编码的 key
	decodedKey, err := url.QueryUnescape(cleanKey)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "非法文件路径")
		return
	}

	filePath := filepath.Join(privateDir, filepath.FromSlash(decodedKey))
	// 再次确认解析后的绝对路径仍在私有目录内
	absPrivate, err := filepath.Abs(privateDir)
	if err != nil {
		response.Fail(c, errcode.ErrServer, "解析私有目录失败")
		return
	}
	absFile, err := filepath.Abs(filePath)
	if err != nil {
		response.Fail(c, errcode.ErrServer, "解析文件路径失败")
		return
	}
	if !strings.HasPrefix(absFile, absPrivate+string(filepath.Separator)) {
		response.Fail(c, errcode.ErrParam, "非法文件路径")
		return
	}

	if _, err := os.Stat(filePath); err != nil {
		response.Fail(c, errcode.ErrNotFound, "文件不存在")
		return
	}

	// attachment 触发下载(私有文件默认不内联)
	c.FileAttachment(filePath, filepath.Base(decodedKey))
}

// randomHex 生成 n 字节的随机十六进制字符串。
func randomHex(n int) string {
	b := make([]byte, n)
	rand.Read(b)
	return hex.EncodeToString(b)
}
