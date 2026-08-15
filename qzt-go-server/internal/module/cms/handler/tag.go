package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/module/cms/errcode"
	"qzt-go-server/internal/module/cms/service"
	"qzt-go-server/internal/pkg/pagination"
	response "qzt-go-server/pkg/xresponse"
)

// TagHandler 标签管理。
type TagHandler struct {
	svc *service.TagService
}

func NewTagHandler() *TagHandler {
	return &TagHandler{svc: service.NewTagService()}
}

// List 标签列表
// @Summary      标签列表
// @Tags         文章标签
// @Produce      json
// @Security     BearerAuth
// @Param        page       query  int     false  "页码(默认1)"
// @Param        page_size  query  int     false  "每页条数(默认10,最大100)"
// @Param        keyword    query  string  false  "关键字(名称/别名模糊匹配)"
// @Success      200  {object}  xresponse.Response
// @Router       /cms/tags [get]
func (h *TagHandler) List(c *gin.Context) {
	p := pagination.GetPagination(c)
	keyword := c.Query("keyword")
	list, total, err := h.svc.List(c.Request.Context(), p.Page, p.PageSize, keyword)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}

// ListAll 全部标签(供下拉/前台)
// @Summary      全部标签
// @Description  返回全部标签,不分页
// @Tags         文章标签
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object}  xresponse.Response
// @Router       /cms/tags/all [get]
func (h *TagHandler) ListAll(c *gin.Context) {
	list, err := h.svc.ListAll(c.Request.Context())
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, list)
}

// PublicList 标签列表(公开,无需登录)
// @Summary      标签列表(公开)
// @Description  返回全部标签,供前台站点
// @Tags         CMS公开
// @Produce      json
// @Success      200  {object}  xresponse.Response
// @Router       /cms/public/tags [get]
func (h *TagHandler) PublicList(c *gin.Context) {
	list, err := h.svc.ListAll(c.Request.Context())
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, list)
}

// GetByID 标签详情
// @Summary      标签详情
// @Tags         文章标签
// @Produce      json
// @Security     BearerAuth
// @Param        id   path      int  true  "标签ID"
// @Success      200  {object}  xresponse.Response
// @Router       /cms/tags/{id} [get]
func (h *TagHandler) GetByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	tag, err := h.svc.GetByID(c.Request.Context(), uint(id))
	if err != nil {
		response.Fail(c, errcode.ErrTagNotFound, err.Error())
		return
	}
	response.OK(c, tag)
}

// Create 创建标签
// @Summary      创建标签
// @Tags         文章标签
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body      service.CreateTagRequest  true  "创建标签请求"
// @Success      200   {object}  xresponse.Response
// @Router       /cms/tags [post]
func (h *TagHandler) Create(c *gin.Context) {
	var req service.CreateTagRequest
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

// Update 更新标签
// @Summary      更新标签
// @Tags         文章标签
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id    path      int                      true  "标签ID"
// @Param        body  body      service.UpdateTagRequest  true  "更新标签请求"
// @Success      200   {object}  xresponse.Response
// @Router       /cms/tags/{id} [put]
func (h *TagHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	var req service.UpdateTagRequest
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

// Delete 删除标签
// @Summary      删除标签
// @Tags         文章标签
// @Produce      json
// @Security     BearerAuth
// @Param        id   path      int  true  "标签ID"
// @Success      200  {object}  xresponse.Response
// @Router       /cms/tags/{id} [delete]
func (h *TagHandler) Delete(c *gin.Context) {
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
