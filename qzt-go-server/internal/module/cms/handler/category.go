package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/module/cms/errcode"
	"qzt-go-server/internal/module/cms/service"
	response "qzt-go-server/pkg/xresponse"
)

// CategoryHandler 分类管理。
type CategoryHandler struct {
	svc *service.CategoryService
}

func NewCategoryHandler() *CategoryHandler {
	return &CategoryHandler{svc: service.NewCategoryService()}
}

// List 分类列表
// @Summary      分类列表
// @Tags         文章分类
// @Produce      json
// @Security     BearerAuth
// @Param        page       query  int     false  "页码(默认1)"
// @Param        page_size  query  int     false  "每页条数(默认10,最大100)"
// @Param        keyword    query  string  false  "关键字(名称/别名模糊匹配)"
// @Success      200  {object}  xresponse.Response
// @Router       /cms/categories [get]
func (h *CategoryHandler) List(c *gin.Context) {
	p := service.GetPagination(c)
	keyword := c.Query("keyword")
	list, total, err := h.svc.List(c.Request.Context(), p.Page, p.PageSize, keyword)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}

// ListAll 分类树(全部，供下拉)
// @Summary      分类树
// @Description  返回全部分类并构建为树,供下拉/前台
// @Tags         文章分类
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object}  xresponse.Response
// @Router       /cms/categories/all [get]
func (h *CategoryHandler) ListAll(c *gin.Context) {
	tree, err := h.svc.ListAll(c.Request.Context())
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, tree)
}

// PublicTree 分类树(公开,无需登录)
// @Summary      分类树(公开)
// @Description  返回启用分类树,供前台站点
// @Tags         CMS公开
// @Produce      json
// @Success      200  {object}  xresponse.Response
// @Router       /cms/public/categories [get]
func (h *CategoryHandler) PublicTree(c *gin.Context) {
	tree, err := h.svc.ListAll(c.Request.Context())
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, tree)
}

// GetByID 分类详情
// @Summary      分类详情
// @Tags         文章分类
// @Produce      json
// @Security     BearerAuth
// @Param        id   path      int  true  "分类ID"
// @Success      200  {object}  xresponse.Response
// @Router       /cms/categories/{id} [get]
func (h *CategoryHandler) GetByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	cat, err := h.svc.GetByID(c.Request.Context(), uint(id))
	if err != nil {
		response.Fail(c, errcode.ErrCategoryNotFound, err.Error())
		return
	}
	response.OK(c, cat)
}

// Create 创建分类
// @Summary      创建分类
// @Tags         文章分类
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body      service.CreateCategoryRequest  true  "创建分类请求"
// @Success      200   {object}  xresponse.Response
// @Router       /cms/categories [post]
func (h *CategoryHandler) Create(c *gin.Context) {
	var req service.CreateCategoryRequest
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

// Update 更新分类
// @Summary      更新分类
// @Tags         文章分类
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id    path      int                          true  "分类ID"
// @Param        body  body      service.UpdateCategoryRequest  true  "更新分类请求"
// @Success      200   {object}  xresponse.Response
// @Router       /cms/categories/{id} [put]
func (h *CategoryHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	var req service.UpdateCategoryRequest
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

// Delete 删除分类
// @Summary      删除分类
// @Tags         文章分类
// @Produce      json
// @Security     BearerAuth
// @Param        id   path      int  true  "分类ID"
// @Success      200  {object}  xresponse.Response
// @Router       /cms/categories/{id} [delete]
func (h *CategoryHandler) Delete(c *gin.Context) {
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
