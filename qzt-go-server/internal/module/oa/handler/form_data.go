package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/middleware"
	"qzt-go-server/internal/module/oa/service"
	"qzt-go-server/internal/module/system/errcode"
	syservice "qzt-go-server/internal/module/system/service"
	response "qzt-go-server/pkg/xresponse"
)

type FormDataHandler struct {
	svc *service.FormDataService
}

func NewFormDataHandler() *FormDataHandler {
	return &FormDataHandler{svc: service.NewFormDataService()}
}

// List 表单数据列表
// @Summary      表单数据列表
// @Tags         OA-表单提交
// @Produce      json
// @Security     BearerAuth
// @Param        page             query  int     false  "页码"
// @Param        page_size        query  int     false  "每页条数"
// @Param        template_id      query  int     false  "模板ID"
// @Param        submitter_id     query  int     false  "提交人ID"
// @Param        template_key     query  string  false  "模板标识"
// @Param        template_name    query  string  false  "模板名称(模糊)"
// @Param        approval_status  query  string  false  "审批状态"
// @Success      200  {object}  xresponse.Response
// @Router       /oa/form-data [get]
func (h *FormDataHandler) List(c *gin.Context) {
	p := syservice.GetPagination(c)
	templateID, _ := strconv.ParseUint(c.Query("template_id"), 10, 64)
	submitterID, _ := strconv.ParseUint(c.Query("submitter_id"), 10, 64)
	list, total, err := h.svc.List(c.Request.Context(), p.Page, p.PageSize,
		uint(templateID), uint(submitterID), c.Query("template_key"), c.Query("template_name"), c.Query("approval_status"))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}

// GetByID 表单数据详情
// @Summary      表单数据详情
// @Tags         OA-表单提交
// @Produce      json
// @Security     BearerAuth
// @Param        id  path  int  true  "数据ID"
// @Success      200  {object}  xresponse.Response
// @Router       /oa/form-data/{id} [get]
func (h *FormDataHandler) GetByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	data, err := h.svc.GetByID(c.Request.Context(), uint(id))
	if err != nil {
		response.Fail(c, errcode.ErrNotFound, err.Error())
		return
	}
	response.OK(c, data)
}

// Create 提交表单数据
// @Summary      提交表单数据
// @Tags         OA-表单提交
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body  service.CreateFormDataRequest  true  "表单数据"
// @Success      200  {object}  xresponse.Response
// @Router       /oa/form-data [post]
func (h *FormDataHandler) Create(c *gin.Context) {
	var req service.CreateFormDataRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	data, err := h.svc.Create(c.Request.Context(), &req, middleware.GetUserID(c))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, data)
}

// Update 编辑表单数据
// @Summary      编辑表单数据
// @Tags         OA-表单提交
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id    path  int  true  "数据ID"
// @Param        body  body  service.UpdateFormDataRequest  true  "表单数据"
// @Success      200  {object}  xresponse.Response
// @Router       /oa/form-data/{id} [put]
func (h *FormDataHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	var req service.UpdateFormDataRequest
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

// Delete 删除表单数据
// @Summary      删除表单数据
// @Tags         OA-表单提交
// @Produce      json
// @Security     BearerAuth
// @Param        id  path  int  true  "数据ID"
// @Success      200  {object}  xresponse.Response
// @Router       /oa/form-data/{id} [delete]
func (h *FormDataHandler) Delete(c *gin.Context) {
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
