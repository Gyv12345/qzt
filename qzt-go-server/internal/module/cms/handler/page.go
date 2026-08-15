package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/module/cms/errcode"
	"qzt-go-server/internal/module/cms/service"
	"qzt-go-server/internal/pkg/pagination"
	response "qzt-go-server/pkg/xresponse"
)

// PageHandler 单页管理。
type PageHandler struct {
	svc *service.PageService
}

func NewPageHandler() *PageHandler {
	return &PageHandler{svc: service.NewPageService()}
}

// List 单页列表
// @Summary      单页列表
// @Tags         单页管理
// @Produce      json
// @Security     BearerAuth
// @Param        page       query  int     false  "页码(默认1)"
// @Param        page_size  query  int     false  "每页条数(默认10,最大100)"
// @Param        keyword    query  string  false  "关键字(标题/别名模糊匹配)"
// @Success      200  {object}  xresponse.Response
// @Router       /cms/pages [get]
func (h *PageHandler) List(c *gin.Context) {
	p := pagination.GetPagination(c)
	keyword := c.Query("keyword")
	list, total, err := h.svc.List(c.Request.Context(), p.Page, p.PageSize, keyword)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}

// GetByID 单页详情
// @Summary      单页详情
// @Tags         单页管理
// @Produce      json
// @Security     BearerAuth
// @Param        id   path      int  true  "单页ID"
// @Success      200  {object}  xresponse.Response
// @Router       /cms/pages/{id} [get]
func (h *PageHandler) GetByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	page, err := h.svc.GetByID(c.Request.Context(), uint(id))
	if err != nil {
		response.Fail(c, errcode.ErrPageNotFound, err.Error())
		return
	}
	response.OK(c, page)
}

// PublicGetBySlug 按 slug 查询单页(公开,无需登录)
// @Summary      单页详情(公开)
// @Description  按 slug 查询单页内容,供前台站点
// @Tags         CMS公开
// @Produce      json
// @Param        slug  path  string  true  "单页别名"
// @Success      200  {object}  xresponse.Response
// @Router       /cms/public/pages/{slug} [get]
func (h *PageHandler) PublicGetBySlug(c *gin.Context) {
	slug := c.Param("slug")
	if slug == "" {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	page, err := h.svc.GetBySlug(c.Request.Context(), slug)
	if err != nil {
		response.Fail(c, errcode.ErrPageNotFound, err.Error())
		return
	}
	response.OK(c, page)
}

// PublicList 公开列表(仅返回启用的单页,供官网导航渲染)。
func (h *PageHandler) PublicList(c *gin.Context) {
	list, err := h.svc.ListEnabled(c.Request.Context())
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, list)
}

// Create 创建单页
// @Summary      创建单页
// @Tags         单页管理
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body      service.CreatePageRequest  true  "创建单页请求"
// @Success      200   {object}  xresponse.Response
// @Router       /cms/pages [post]
func (h *PageHandler) Create(c *gin.Context) {
	var req service.CreatePageRequest
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

// Update 更新单页
// @Summary      更新单页
// @Tags         单页管理
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id    path      int                      true  "单页ID"
// @Param        body  body      service.UpdatePageRequest  true  "更新单页请求"
// @Success      200   {object}  xresponse.Response
// @Router       /cms/pages/{id} [put]
func (h *PageHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	var req service.UpdatePageRequest
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

// Delete 删除单页
// @Summary      删除单页
// @Tags         单页管理
// @Produce      json
// @Security     BearerAuth
// @Param        id   path      int  true  "单页ID"
// @Success      200  {object}  xresponse.Response
// @Router       /cms/pages/{id} [delete]
func (h *PageHandler) Delete(c *gin.Context) {
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
