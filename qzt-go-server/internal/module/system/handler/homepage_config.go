package handler

// homepage_config.go CMS 首页板块配置 handler。

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/module/system/errcode"
	"qzt-go-server/internal/module/system/service"
	response "qzt-go-server/pkg/xresponse"
)

type HomepageConfigHandler struct {
	svc *service.HomepageConfigService
}

func NewHomepageConfigHandler() *HomepageConfigHandler {
	return &HomepageConfigHandler{svc: service.NewHomepageConfigService()}
}

// GetConfig 获取首页板块配置
// @Summary      获取首页板块配置
// @Description  返回各板块开关 + 精选条目列表(含业务名称)
// @Tags         站点设置
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object}  xresponse.Response
// @Router       /system/homepage-config [get]
func (h *HomepageConfigHandler) GetConfig(c *gin.Context) {
	list, err := h.svc.GetConfig(c.Request.Context())
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list})
}

// ToggleModule 切换板块开关
// @Summary      切换板块开关
// @Description  开启/关闭某板块在 CMS 首页的显示
// @Tags         站点设置
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body  service.ToggleModuleRequest  true  "板块开关"
// @Success      200   {object}  xresponse.Response
// @Router       /system/homepage-config/toggle [put]
func (h *HomepageConfigHandler) ToggleModule(c *gin.Context) {
	var req service.ToggleModuleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	if err := h.svc.ToggleModule(c.Request.Context(), &req); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// SyncFeatures 同步精选条目
// @Summary      同步精选条目
// @Description  全量替换某板块的精选条目(传入完整 ID 列表)
// @Tags         站点设置
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body  service.SyncFeaturesRequest  true  "精选条目"
// @Success      200   {object}  xresponse.Response
// @Router       /system/homepage-config/sync [put]
func (h *HomepageConfigHandler) SyncFeatures(c *gin.Context) {
	var req service.SyncFeaturesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	if err := h.svc.SyncFeatures(c.Request.Context(), &req); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// RemoveFeature 删除精选条目
// @Summary      删除单条精选条目
// @Tags         站点设置
// @Produce      json
// @Security     BearerAuth
// @Param        id  path  int  true  "精选条目ID"
// @Success      200  {object}  xresponse.Response
// @Router       /system/homepage-config/features/{id} [delete]
func (h *HomepageConfigHandler) RemoveFeature(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	if err := h.svc.RemoveFeature(c.Request.Context(), uint(id)); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// PublicHomepage CMS 公开首页配置
// @Summary      首页板块配置(公开)
// @Description  返回各板块开关 + 条目详情, 免鉴权, 供 CMS 官网展示
// @Tags         CMS公开
// @Produce      json
// @Success      200  {object}  xresponse.Response
// @Router       /system/public/homepage-config [get]
func (h *HomepageConfigHandler) PublicHomepage(c *gin.Context) {
	data, err := h.svc.PublicHomepage(c.Request.Context())
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, data)
}
