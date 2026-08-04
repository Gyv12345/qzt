package handler

import (
	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/module/system/service"
	"qzt-go-server/internal/module/system/errcode"
	response "qzt-go-server/pkg/xresponse"
)

// StorageConfigHandler 文件存储配置管理。
type StorageConfigHandler struct {
	svc *service.StorageConfigService
}

func NewStorageConfigHandler() *StorageConfigHandler {
	return &StorageConfigHandler{svc: service.NewStorageConfigService()}
}

// Get 获取存储配置
// @Summary      获取存储配置
// @Description  返回当前文件存储配置(OSS Secret 脱敏)
// @Tags         存储配置
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object}  xresponse.Response
// @Router       /system/storage-config [get]
func (h *StorageConfigHandler) Get(c *gin.Context) {
	cfg, err := h.svc.Get(c.Request.Context())
	if err != nil {
		response.Fail(c, errcode.ErrNotFound, err.Error())
		return
	}
	response.OK(c, cfg)
}

// Update 更新存储配置
// @Summary      更新存储配置
// @Description  修改后自动重建上传驱动,无需重启。OSS Secret 为空时保留原值。
// @Tags         存储配置
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body      service.UpdateStorageConfigRequest  true  "存储配置"
// @Success      200   {object}  xresponse.Response
// @Router       /system/storage-config [put]
func (h *StorageConfigHandler) Update(c *gin.Context) {
	var req service.UpdateStorageConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	if err := h.svc.Update(c.Request.Context(), &req); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// TestConnection 测试存储连接
// @Summary      测试存储连接
// @Description  OSS 模式验证 AK/SK/Bucket;local 模式验证目录权限。不修改已保存的配置。
// @Tags         存储配置
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body      service.UpdateStorageConfigRequest  true  "待测试的配置"
// @Success      200   {object}  xresponse.Response
// @Router       /system/storage-config/test [post]
func (h *StorageConfigHandler) TestConnection(c *gin.Context) {
	var req service.UpdateStorageConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	if err := h.svc.TestConnection(c.Request.Context(), &req); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"message": "连接成功"})
}

// Reload 手动重建上传驱动
// @Summary      重建上传驱动
// @Description  从数据库重新读取配置并重建 Uploader(配置缓存失效时手动调用)
// @Tags         存储配置
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object}  xresponse.Response
// @Router       /system/storage-config/reload [put]
func (h *StorageConfigHandler) Reload(c *gin.Context) {
	if err := h.svc.Reload(c.Request.Context()); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}
