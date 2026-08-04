package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/module/system/errcode"
	"qzt-go-server/internal/module/system/service"
	response "qzt-go-server/pkg/xresponse"
)

type DictHandler struct {
	svc *service.DictService
}

func NewDictHandler() *DictHandler {
	return &DictHandler{svc: service.NewDictService()}
}

// List 字典列表
// @Summary      字典列表
// @Tags         字典管理
// @Produce      json
// @Security     BearerAuth
// @Param        page       query  int     false  "页码(默认1)"
// @Param        page_size  query  int     false  "每页条数(默认10,最大100)"
// @Param        keyword    query  string  false  "关键字(名称模糊匹配)"
// @Success      200  {object}  xresponse.Response
// @Router       /system/dicts [get]
func (h *DictHandler) List(c *gin.Context) {
	p := service.GetPagination(c)
	keyword := c.Query("keyword")
	list, total, err := h.svc.List(c.Request.Context(), p.Page, p.PageSize, keyword)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}

// ListAll 全部字典
// @Summary      全部字典
// @Description  返回全部字典,不分页,供下拉使用
// @Tags         字典管理
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object}  xresponse.Response{data=[]model.SysDict}
// @Router       /system/dicts/all [get]
func (h *DictHandler) ListAll(c *gin.Context) {
	list, err := h.svc.ListAll(c.Request.Context())
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, list)
}

// GetByID 字典详情
// @Summary      字典详情
// @Tags         字典管理
// @Produce      json
// @Security     BearerAuth
// @Param        id   path      int  true  "字典ID"
// @Success      200  {object}  xresponse.Response{data=model.SysDict}
// @Router       /system/dicts/{id} [get]
func (h *DictHandler) GetByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	dict, err := h.svc.GetByID(c.Request.Context(), uint(id))
	if err != nil {
		response.Fail(c, errcode.ErrNotFound, err.Error())
		return
	}
	response.OK(c, dict)
}

// Create 创建字典
// @Summary      创建字典
// @Tags         字典管理
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body      service.CreateDictRequest  true  "创建字典请求"
// @Success      200   {object}  xresponse.Response
// @Router       /system/dicts [post]
func (h *DictHandler) Create(c *gin.Context) {
	var req service.CreateDictRequest
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

// Update 更新字典
// @Summary      更新字典
// @Tags         字典管理
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id    path      int                        true  "字典ID"
// @Param        body  body      service.UpdateDictRequest  true  "更新字典请求"
// @Success      200   {object}  xresponse.Response
// @Router       /system/dicts/{id} [put]
func (h *DictHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	var req service.UpdateDictRequest
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

// Delete 删除字典
// @Summary      删除字典
// @Tags         字典管理
// @Produce      json
// @Security     BearerAuth
// @Param        id   path      int  true  "字典ID"
// @Success      200  {object}  xresponse.Response
// @Router       /system/dicts/{id} [delete]
func (h *DictHandler) Delete(c *gin.Context) {
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
