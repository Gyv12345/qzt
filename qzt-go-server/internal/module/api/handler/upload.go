package handler

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"mime"
	"mime/multipart"
	"net/http"
	"path/filepath"
	"strings"
	"time"

	"github.com/aliyun/aliyun-oss-go-sdk/oss"
	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/app"
	"qzt-go-server/internal/module/system/errcode"
	"qzt-go-server/internal/pkg/storage"
	response "qzt-go-server/pkg/xresponse"
)

const (
	bytesPerMegabyte        int64 = 1024 * 1024
	multipartOverheadBytes int64 = 1024 * 1024
)

// fileUploader 文件存储抽象，便于测试注入替身。
type fileUploader interface {
	Save(file *multipart.FileHeader, folders ...string) (*storage.UploadedFile, error)
}

// UploadHandler 文件上传 handler。
type UploadHandler struct {
	uploader          fileUploader
	getResourceDomain func() string
}

// UploadResult 上传结果，包含文件信息与资源访问域名。
type UploadResult struct {
	*storage.UploadedFile
	ResourceDomain string `json:"resource_domain"`
}

func NewUploadHandler() *UploadHandler {
	return &UploadHandler{
		uploader: app.Uploader,
		getResourceDomain: func() string {
			return app.StorageResourceDomain()
		},
	}
}

// Upload 文件上传
// @Summary      文件上传
// @Description  上传文件,返回文件信息与资源访问域名
// @Tags         公共接口
// @Accept       multipart/form-data
// @Produce      json
// @Param        file    formData  file    true   "上传的文件"
// @Param        folder  formData  string  false  "存储文件夹"
// @Success      200  {object}  xresponse.Response{data=UploadResult}
// @Router       /api/upload [post]
func (h *UploadHandler) Upload(c *gin.Context) {
	// 限制请求体大小，超出直接由 MaxBytesReader 返回错误
	if maxMB := app.StorageMaxUploadMB(); maxMB > 0 {
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

	// 每次上传取最新的 Uploader(配置可能被后台动态修改)
	uploader := app.GetUploader()
	if uploader == nil {
		uploader = h.uploader
	}
	result, err := uploader.Save(file, c.PostForm("folder"))
	switch {
	case err == nil:
		resourceDomain := ""
		if h.getResourceDomain != nil {
			resourceDomain = strings.TrimRight(strings.TrimSpace(h.getResourceDomain()), "/")
		}
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
	default:
		if app.Log != nil {
			app.Log.Errorw("upload file failed", "err", err)
		}
		response.Fail(c, errcode.ErrServer, "文件上传失败")
	}
}

// STSResult 前端直传 OSS 所需的预签名 URL。
type STSResult struct {
	Driver       string `json:"driver"`         // oss / local(local 时前端走后端上传)
	UploadURL    string `json:"upload_url"`     // OSS PUT 预签名 URL(前端直接 PUT 文件)
	FileURL      string `json:"file_url"`       // 上传成功后的 CDN/自定义域名访问 URL
	ContentType  string `json:"content_type"`   // 文件 MIME(PUT 时需带 Content-Type header)
}

// STS 返回前端直传 OSS 的预签名 URL。
// 前端拿到后直接 PUT 文件到 upload_url,成功后用 file_url 作为图片地址。
// @Summary  获取 OSS 直传预签名 URL
// @Tags     公共接口
// @Produce  json
// @Security BearerAuth
// @Param    filename  query  string  true   "文件名(用于推断扩展名)"
// @Param    folder    query  string  false  "存储文件夹(默认 uploads)"
// @Success  200  {object}  xresponse.Response
// @Router   /api/upload/sts [get]
func (h *UploadHandler) STS(c *gin.Context) {
	cfg := app.GetStorageConfig()
	if cfg == nil || cfg.Driver != "oss" {
		response.OK(c, &STSResult{Driver: "local"})
		return
	}

	filename := c.Query("filename")
	if filename == "" {
		response.Fail(c, errcode.ErrParam, "filename 必填")
		return
	}
	folder := c.DefaultQuery("folder", "uploads")

	// 推断扩展名和 content-type
	ext := strings.ToLower(filepath.Ext(filename))
	contentType := mime.TypeByExtension(ext)
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	// 生成随机文件名
	now := time.Now()
	objectKey := strings.Trim(folder, "/") + "/" + now.Format("20060102") + "/" + randomHex(16) + ext

	// 用 OSS SDK 签 PUT URL(15 分钟有效)
	endpoint := cfg.OSSEndpoint
	client, err := oss.New(endpoint, cfg.OSSAccessKeyID, cfg.OSSAccessKeySecret)
	if err != nil {
		response.Fail(c, errcode.ErrServer, "创建 OSS 客户端失败: "+err.Error())
		return
	}
	bucket, err := client.Bucket(cfg.OSSBucketName)
	if err != nil {
		response.Fail(c, errcode.ErrServer, "获取 bucket 失败: "+err.Error())
		return
	}

	uploadURL, err := bucket.SignURL(objectKey, oss.HTTPPut, 900,
		oss.ContentType(contentType),
		oss.ContentDisposition("inline"),
	)
	if err != nil {
		response.Fail(c, errcode.ErrServer, "签名失败: "+err.Error())
		return
	}

	// 拼最终访问 URL
	cdnDomain := cfg.OSSCustomDomain
	if cdnDomain == "" {
		cdnDomain = cfg.ResourceDomain
	}
	cdnDomain = strings.TrimRight(cdnDomain, "/")
	fileURL := cdnDomain + "/" + objectKey

	response.OK(c, &STSResult{
		Driver:      "oss",
		UploadURL:   uploadURL,
		FileURL:     fileURL,
		ContentType: contentType,
	})
}

// randomHex 生成 n 字节的随机十六进制字符串。
func randomHex(n int) string {
	b := make([]byte, n)
	rand.Read(b)
	return hex.EncodeToString(b)
}
