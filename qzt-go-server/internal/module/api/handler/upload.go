package handler

import (
	"errors"
	"mime/multipart"
	"net/http"
	"strings"

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
