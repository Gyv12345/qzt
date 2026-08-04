package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"qzt-go-server/internal/module/system/service"
	"qzt-go-server/internal/module/system/errcode"
	response "qzt-go-server/pkg/xresponse"
)

type ConfigHandler struct {
	svc *service.ConfigService
}

func NewConfigHandler() *ConfigHandler {
	return &ConfigHandler{svc: service.NewConfigService()}
}

// List 配置列表
// @Summary      配置列表
// @Description  按 group 分组返回配置项;不传 group 返回全部
// @Tags         系统配置
// @Produce      json
// @Security     BearerAuth
// @Param        group  query  string  false  "配置分组"
// @Success      200    {object}  xresponse.Response{data=[]model.SysConfig}
// @Router       /system/configs [get]
func (h *ConfigHandler) List(c *gin.Context) {
	list, err := h.svc.List(c.Request.Context(), c.Query("group"))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, list)
}

// Create 创建配置
// @Summary      创建配置
// @Tags         系统配置
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body      service.CreateConfigRequest  true  "创建配置请求"
// @Success      200   {object}  xresponse.Response
// @Router       /system/configs [post]
func (h *ConfigHandler) Create(c *gin.Context) {
	var req service.CreateConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	if err := h.svc.Create(c.Request.Context(), &req); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

type batchUpdateConfigReq struct {
	Items []service.ConfigItem `json:"items" binding:"required"`
}

// BatchUpdate 批量更新配置
// @Summary      批量更新配置
// @Description  一次性更新多个配置项
// @Tags         系统配置
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body      batchUpdateConfigReq  true  "批量更新配置请求"
// @Success      200   {object}  xresponse.Response
// @Router       /system/configs [put]
func (h *ConfigHandler) BatchUpdate(c *gin.Context) {
	var req batchUpdateConfigReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	if err := h.svc.BatchUpdate(c.Request.Context(), req.Items); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// Update 更新配置
// @Summary      更新配置
// @Tags         系统配置
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id    path      int                         true  "配置ID"
// @Param        body  body      service.UpdateConfigRequest  true  "更新配置请求"
// @Success      200   {object}  xresponse.Response
// @Router       /system/configs/{id} [put]
func (h *ConfigHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	var req service.UpdateConfigRequest
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

// Delete 删除配置
// @Summary      删除配置
// @Tags         系统配置
// @Produce      json
// @Security     BearerAuth
// @Param        id   path      int  true  "配置ID"
// @Success      200  {object}  xresponse.Response
// @Router       /system/configs/{id} [delete]
func (h *ConfigHandler) Delete(c *gin.Context) {
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

// Refresh 刷新配置缓存
// @Summary      刷新配置缓存
// @Description  重新同步配置缓存;?key=xxx 刷新单个 key,不传 key 刷新全部
// @Tags         系统配置
// @Produce      json
// @Security     BearerAuth
// @Param        key  query  string  false  "配置 key(不传则刷新全部)"
// @Success      200  {object}  xresponse.Response
// @Router       /system/configs/refresh [post]
// Refresh re-syncs the cache. ?key=xxx refreshes one key; no key refreshes all.
func (h *ConfigHandler) Refresh(c *gin.Context) {
	if err := h.svc.Refresh(c.Request.Context(), c.Query("key")); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}
