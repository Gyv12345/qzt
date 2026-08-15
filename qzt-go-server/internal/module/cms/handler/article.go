package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/middleware"
	"qzt-go-server/internal/module/cms/errcode"
	"qzt-go-server/internal/module/cms/service"
	"qzt-go-server/internal/pkg/pagination"
	response "qzt-go-server/pkg/xresponse"
)

// ArticleHandler 文章管理。
type ArticleHandler struct {
	svc *service.ArticleService
}

func NewArticleHandler() *ArticleHandler {
	return &ArticleHandler{svc: service.NewArticleService()}
}

// List 文章列表(管理端)
// @Summary      文章列表
// @Tags         文章管理
// @Produce      json
// @Security     BearerAuth
// @Param        page        query  int     false  "页码(默认1)"
// @Param        page_size   query  int     false  "每页条数(默认10,最大100)"
// @Param        keyword     query  string  false  "关键字(标题/别名模糊匹配)"
// @Param        category_id query  int     false  "分类ID"
// @Param        status      query  int     false  "状态(0草稿 1已发布)"
// @Param        tag_id      query  int     false  "标签ID"
// @Success      200  {object}  xresponse.Response
// @Router       /cms/articles [get]
func (h *ArticleHandler) List(c *gin.Context) {
	p := pagination.GetPagination(c)
	q := &service.ListArticleQuery{
		Keyword: c.Query("keyword"),
	}
	if cid := c.Query("category_id"); cid != "" {
		if v, err := strconv.ParseUint(cid, 10, 64); err == nil {
			q.CategoryID = uint(v)
		}
	}
	if status := c.Query("status"); status != "" {
		if v, err := strconv.ParseInt(status, 10, 8); err == nil {
			s := int8(v)
			q.Status = &s
		}
	}
	if tid := c.Query("tag_id"); tid != "" {
		if v, err := strconv.ParseUint(tid, 10, 64); err == nil {
			q.TagID = uint(v)
		}
	}
	list, total, err := h.svc.List(c.Request.Context(), p.Page, p.PageSize, q)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}

// ListPublished 已发布文章列表(公开,无需登录)
// @Summary      文章列表(公开)
// @Description  返回已发布文章分页列表,供前台站点
// @Tags         CMS公开
// @Produce      json
// @Param        page        query  int     false  "页码(默认1)"
// @Param        page_size   query  int     false  "每页条数(默认10,最大100)"
// @Param        keyword     query  string  false  "关键字(标题/别名模糊匹配)"
// @Param        category_id query  int     false  "分类ID"
// @Success      200  {object}  xresponse.Response
// @Router       /cms/public/articles [get]
func (h *ArticleHandler) ListPublished(c *gin.Context) {
	p := pagination.GetPagination(c)
	list, total, err := h.svc.ListPublished(c.Request.Context(), p.Page, p.PageSize, c.Query("keyword"), c.Query("category_id"))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}

// GetByID 文章详情
// @Summary      文章详情
// @Tags         文章管理
// @Produce      json
// @Security     BearerAuth
// @Param        id   path      int  true  "文章ID"
// @Success      200  {object}  xresponse.Response
// @Router       /cms/articles/{id} [get]
func (h *ArticleHandler) GetByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	article, err := h.svc.GetByID(c.Request.Context(), uint(id))
	if err != nil {
		response.Fail(c, errcode.ErrArticleNotFound, err.Error())
		return
	}
	response.OK(c, article)
}

// PublicGetByID 文章详情(公开,按ID)
// @Summary      文章详情(公开)
// @Description  按ID返回已发布文章详情,供前台站点
// @Tags         CMS公开
// @Produce      json
// @Param        id   path      int  true  "文章ID"
// @Success      200  {object}  xresponse.Response
// @Router       /cms/public/articles/{id} [get]
func (h *ArticleHandler) PublicGetByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	article, err := h.svc.GetByID(c.Request.Context(), uint(id))
	if err != nil {
		response.Fail(c, errcode.ErrArticleNotFound, err.Error())
		return
	}
	response.OK(c, article)
}

// PublicGetBySlug 文章详情(公开,按slug)
// @Summary      文章详情(公开,按别名)
// @Description  按slug返回已发布文章详情并递增浏览量,供前台站点
// @Tags         CMS公开
// @Produce      json
// @Param        slug  path  string  true  "文章别名"
// @Success      200  {object}  xresponse.Response
// @Router       /cms/public/articles/slug/{slug} [get]
func (h *ArticleHandler) PublicGetBySlug(c *gin.Context) {
	slug := c.Param("slug")
	if slug == "" {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	article, err := h.svc.GetBySlug(c.Request.Context(), slug)
	if err != nil {
		response.Fail(c, errcode.ErrArticleNotFound, err.Error())
		return
	}
	response.OK(c, article)
}

// Create 创建文章
// @Summary      创建文章
// @Tags         文章管理
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body      service.CreateArticleRequest  true  "创建文章请求"
// @Success      200   {object}  xresponse.Response
// @Router       /cms/articles [post]
func (h *ArticleHandler) Create(c *gin.Context) {
	var req service.CreateArticleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	authorID := middleware.GetUserID(c)
	authorName := middleware.GetUsername(c)
	article, err := h.svc.Create(c.Request.Context(), &req, authorID, authorName)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"id": article.ID})
}

// Update 更新文章
// @Summary      更新文章
// @Tags         文章管理
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id    path      int                          true  "文章ID"
// @Param        body  body      service.UpdateArticleRequest  true  "更新文章请求"
// @Success      200   {object}  xresponse.Response
// @Router       /cms/articles/{id} [put]
func (h *ArticleHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	var req service.UpdateArticleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	authorID := middleware.GetUserID(c)
	authorName := middleware.GetUsername(c)
	if err := h.svc.Update(c.Request.Context(), uint(id), &req, authorID, authorName); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// Delete 删除文章
// @Summary      删除文章
// @Tags         文章管理
// @Produce      json
// @Security     BearerAuth
// @Param        id   path      int  true  "文章ID"
// @Success      200  {object}  xresponse.Response
// @Router       /cms/articles/{id} [delete]
func (h *ArticleHandler) Delete(c *gin.Context) {
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
