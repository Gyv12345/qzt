package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/module/system/errcode"
	"qzt-go-server/internal/module/system/service"
	response "qzt-go-server/pkg/xresponse"
)

// OauthConfigHandler 第三方登录配置管理。
type OauthConfigHandler struct {
	svc *service.OauthConfigService
}

func NewOauthConfigHandler() *OauthConfigHandler {
	return &OauthConfigHandler{svc: service.NewOauthConfigService()}
}

// List 第三方登录配置列表
// @Summary      第三方登录配置列表
// @Description  全部第三方登录渠道配置(管理端)
// @Tags         第三方登录
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object}  xresponse.Response
// @Router       /system/oauth-configs [get]
func (h *OauthConfigHandler) List(c *gin.Context) {
	list, err := h.svc.List(c.Request.Context())
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, list)
}

// GetByID 配置详情
// @Summary      第三方登录配置详情
// @Tags         第三方登录
// @Produce      json
// @Security     BearerAuth
// @Param        id  path      int  true  "配置ID"
// @Success      200  {object}  xresponse.Response
// @Router       /system/oauth-configs/{id} [get]
func (h *OauthConfigHandler) GetByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	cfg, err := h.svc.GetByID(c.Request.Context(), uint(id))
	if err != nil {
		response.Fail(c, errcode.ErrNotFound, err.Error())
		return
	}
	response.OK(c, cfg)
}

// Create 创建第三方登录配置
// @Summary      创建第三方登录配置
// @Tags         第三方登录
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body      service.CreateOauthConfigRequest  true  "创建配置请求"
// @Success      200   {object}  xresponse.Response
// @Router       /system/oauth-configs [post]
func (h *OauthConfigHandler) Create(c *gin.Context) {
	var req service.CreateOauthConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	cfg, err := h.svc.Create(c.Request.Context(), &req)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, cfg)
}

// Update 更新第三方登录配置
// @Summary      更新第三方登录配置
// @Tags         第三方登录
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id    path      int                               true  "配置ID"
// @Param        body  body      service.UpdateOauthConfigRequest  true  "更新配置请求"
// @Success      200   {object}  xresponse.Response
// @Router       /system/oauth-configs/{id} [put]
func (h *OauthConfigHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	var req service.UpdateOauthConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	if err := h.svc.Update(c.Request.Context(), uint(id), &req); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// Delete 删除第三方登录配置
// @Summary      删除第三方登录配置
// @Tags         第三方登录
// @Produce      json
// @Security     BearerAuth
// @Param        id  path      int  true  "配置ID"
// @Success      200  {object}  xresponse.Response
// @Router       /system/oauth-configs/{id} [delete]
func (h *OauthConfigHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	if err := h.svc.Delete(c.Request.Context(), uint(id)); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// Enable 启用/禁用第三方登录配置
// @Summary      启用/禁用第三方登录
// @Tags         第三方登录
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id    path   int  true  "配置ID"
// @Param        body  body   object  true  "启用状态"  example({"enabled":1})
// @Success      200  {object}  xresponse.Response
// @Router       /system/oauth-configs/{id}/enable [put]
func (h *OauthConfigHandler) Enable(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	var body struct {
		Enabled int8 `json:"enabled"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	if err := h.svc.Enable(c.Request.Context(), uint(id), body.Enabled); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// ListPublic 已启用的第三方登录渠道(登录页用,免鉴权)
// @Summary      已启用的第三方登录方式
// @Description  返回已启用的第三方登录渠道列表(供登录页展示按钮)
// @Tags         第三方登录
// @Produce      json
// @Success      200  {object}  xresponse.Response
// @Router       /system/oauth-configs/enabled [get]
func (h *OauthConfigHandler) ListPublic(c *gin.Context) {
	list, err := h.svc.ListEnabledPublic(c.Request.Context())
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, list)
}
