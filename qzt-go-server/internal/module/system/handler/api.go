package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"qzt-go-server/internal/module/system/service"
	"qzt-go-server/internal/module/system/errcode"
	response "qzt-go-server/pkg/xresponse"
)

type APIHandler struct {
	svc *service.APIService
}

func NewAPIHandler() *APIHandler {
	return &APIHandler{svc: service.NewAPIService()}
}

// Create 创建接口
// @Summary      创建接口
// @Tags         API管理
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body      service.CreateAPIRequest  true  "创建接口请求"
// @Success      200   {object}  xresponse.Response
// @Router       /system/apis [post]
func (h *APIHandler) Create(c *gin.Context) {
	var req service.CreateAPIRequest
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

// GetByID 接口详情
// @Summary      接口详情
// @Tags         API管理
// @Produce      json
// @Security     BearerAuth
// @Param        id   path      int  true  "接口ID"
// @Success      200  {object}  xresponse.Response{data=model.SysAPI}
// @Router       /system/apis/{id} [get]
func (h *APIHandler) GetByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	api, err := h.svc.GetByID(c.Request.Context(), uint(id))
	if err != nil {
		response.Fail(c, errcode.ErrNotFound, "API 不存在")
		return
	}
	response.OK(c, api)
}

// Update 更新接口
// @Summary      更新接口
// @Tags         API管理
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id    path      int                       true  "接口ID"
// @Param        body  body      service.UpdateAPIRequest  true  "更新接口请求"
// @Success      200   {object}  xresponse.Response
// @Router       /system/apis/{id} [put]
func (h *APIHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	var req service.UpdateAPIRequest
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

// Delete 删除接口
// @Summary      删除接口
// @Tags         API管理
// @Produce      json
// @Security     BearerAuth
// @Param        id   path      int  true  "接口ID"
// @Success      200  {object}  xresponse.Response
// @Router       /system/apis/{id} [delete]
func (h *APIHandler) Delete(c *gin.Context) {
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

// List 接口列表
// @Summary      接口列表
// @Tags         API管理
// @Produce      json
// @Security     BearerAuth
// @Param        page       query  int  false  "页码(默认1)"
// @Param        page_size  query  int  false  "每页条数(默认10,最大100)"
// @Success      200  {object}  xresponse.Response
// @Router       /system/apis [get]
func (h *APIHandler) List(c *gin.Context) {
	p := service.GetPagination(c)
	apis, total, err := h.svc.List(c.Request.Context(), p.Page, p.PageSize)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{
		"list":  apis,
		"total": total,
		"page":  p.Page,
		"size":  p.PageSize,
	})
}

// ListAll 全部接口
// @Summary      全部接口
// @Description  返回全部接口,不分页,供下拉/授权使用
// @Tags         API管理
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object}  xresponse.Response{data=[]model.SysAPI}
// @Router       /system/apis/all [get]
func (h *APIHandler) ListAll(c *gin.Context) {
	apis, err := h.svc.ListAll(c.Request.Context())
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, apis)
}
