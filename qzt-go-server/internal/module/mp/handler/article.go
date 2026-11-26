package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/module/mp/service"
	"qzt-go-server/internal/module/system/errcode"
	syservice "qzt-go-server/internal/module/system/service"
	response "qzt-go-server/pkg/xresponse"
)

// article.go 公众号文章创作(sys_api 904-910):CRUD + AI 生成/重写 + 推送微信草稿箱。

// ArticleHandler 公众号文章 Handler。
type ArticleHandler struct {
	svc *service.ArticleService
}

func NewArticleHandler() *ArticleHandler {
	return &ArticleHandler{svc: service.NewArticleService()}
}

// List GET /mp/articles — 分页列表(page/page_size/account_id/status/keyword)。
func (h *ArticleHandler) List(c *gin.Context) {
	p := syservice.GetPagination(c)
	accountID, _ := strconv.ParseUint(c.Query("account_id"), 10, 64)
	list, total, err := h.svc.List(c.Request.Context(), p.Page, p.PageSize, uint(accountID), c.Query("status"), c.Query("keyword"))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}

// GetByID GET /mp/articles/:id — 文章详情(全字段)。
func (h *ArticleHandler) GetByID(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	item, err := h.svc.GetByID(c.Request.Context(), uint(id))
	if err != nil {
		response.Fail(c, errcode.ErrNotFound, err.Error())
		return
	}
	response.OK(c, item)
}

// Create POST /mp/articles — 新建文章草稿(status 恒 draft)。
func (h *ArticleHandler) Create(c *gin.Context) {
	var req service.SaveArticleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	item, err := h.svc.Create(c.Request.Context(), &req)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, item)
}

// Update PUT /mp/articles/:id — 更新文章(改稿重置回 draft)。
func (h *ArticleHandler) Update(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	var req service.SaveArticleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	item, err := h.svc.Update(c.Request.Context(), uint(id), &req)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, item)
}

// Delete DELETE /mp/articles/:id — 删除文章(软删)。
func (h *ArticleHandler) Delete(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	if err := h.svc.Delete(c.Request.Context(), uint(id)); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// Generate POST /mp/articles/:id/generate — AI 生成/重写文章。
func (h *ArticleHandler) Generate(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	var req service.GenerateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	item, err := h.svc.Generate(c.Request.Context(), uint(id), &req)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, item)
}

// PushDraft POST /mp/articles/:id/push-draft — 推送微信草稿箱。
func (h *ArticleHandler) PushDraft(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	mediaID, err := h.svc.PushDraft(c.Request.Context(), uint(id))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	// 发布不在 API 侧做:草稿进箱后由运营在 mp 后台预览群发
	response.OK(c, gin.H{
		"media_id": mediaID,
		"message":  "已推送至微信草稿箱,请在 mp.weixin.qq.com 预览后手动发布",
	})
}
