package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/module/oa/service"
	"qzt-go-server/internal/module/system/errcode"
	syservice "qzt-go-server/internal/module/system/service"
	response "qzt-go-server/pkg/xresponse"
)

type FormTemplateHandler struct {
	svc *service.FormTemplateService
}

func NewFormTemplateHandler() *FormTemplateHandler {
	return &FormTemplateHandler{svc: service.NewFormTemplateService()}
}

// List 表单模板列表(管理端)
// @Summary      表单模板列表
// @Tags         OA-表单管理
// @Produce      json
// @Security     BearerAuth
// @Param        page       query  int     false  "页码"
// @Param        page_size  query  int     false  "每页条数"
// @Param        name       query  string  false  "名称"
// @Param        category   query  string  false  "分类"
// @Param        status     query  int     false  "状态"
// @Success      200  {object}  xresponse.Response
// @Router       /oa/forms [get]
func (h *FormTemplateHandler) List(c *gin.Context) {
	p := syservice.GetPagination(c)
	name := c.Query("name")
	category := c.Query("category")
	status, _ := strconv.Atoi(c.DefaultQuery("status", "-1"))
	list, total, err := h.svc.List(c.Request.Context(), p.Page, p.PageSize, name, category, int8(status))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}

// ListEnabled 启用的表单模板(用户端)
// @Summary      启用的表单模板
// @Tags         OA-表单管理
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object}  xresponse.Response
// @Router       /oa/forms/enabled [get]
func (h *FormTemplateHandler) ListEnabled(c *gin.Context) {
	list, err := h.svc.ListEnabled(c.Request.Context())
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list})
}

// GetByID 表单模板详情
// @Summary      表单模板详情
// @Tags         OA-表单管理
// @Produce      json
// @Security     BearerAuth
// @Param        id  path  int  true  "模板ID"
// @Success      200  {object}  xresponse.Response
// @Router       /oa/forms/{id} [get]
func (h *FormTemplateHandler) GetByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	tpl, err := h.svc.GetByID(c.Request.Context(), uint(id))
	if err != nil {
		response.Fail(c, errcode.ErrNotFound, err.Error())
		return
	}
	response.OK(c, tpl)
}

// Create 新建表单模板
// @Summary      新建表单模板
// @Tags         OA-表单管理
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body  service.CreateFormTemplateRequest  true  "表单模板"
// @Success      200  {object}  xresponse.Response
// @Router       /oa/forms [post]
func (h *FormTemplateHandler) Create(c *gin.Context) {
	var req service.CreateFormTemplateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	tpl, err := h.svc.Create(c.Request.Context(), &req)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, tpl)
}

// Update 编辑表单模板
// @Summary      编辑表单模板
// @Tags         OA-表单管理
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id    path  int  true  "模板ID"
// @Param        body  body  service.UpdateFormTemplateRequest  true  "表单模板"
// @Success      200  {object}  xresponse.Response
// @Router       /oa/forms/{id} [put]
func (h *FormTemplateHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	var req service.UpdateFormTemplateRequest
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

// ToggleStatus 启用/停用
// @Summary      启用/停用表单模板
// @Tags         OA-表单管理
// @Produce      json
// @Security     BearerAuth
// @Param        id  path  int  true  "模板ID"
// @Success      200  {object}  xresponse.Response
// @Router       /oa/forms/{id}/toggle [put]
func (h *FormTemplateHandler) ToggleStatus(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	if err := h.svc.ToggleStatus(c.Request.Context(), uint(id)); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// Delete 删除表单模板
// @Summary      删除表单模板
// @Tags         OA-表单管理
// @Produce      json
// @Security     BearerAuth
// @Param        id  path  int  true  "模板ID"
// @Success      200  {object}  xresponse.Response
// @Router       /oa/forms/{id} [delete]
func (h *FormTemplateHandler) Delete(c *gin.Context) {
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
