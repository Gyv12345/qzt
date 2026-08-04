package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/module/enterprise/service"
	"qzt-go-server/internal/module/system/errcode"
	syservice "qzt-go-server/internal/module/system/service"
	response "qzt-go-server/pkg/xresponse"
)

// NoticeHandler 公告管理。
type NoticeHandler struct {
	svc *service.NoticeService
}

func NewNoticeHandler() *NoticeHandler { return &NoticeHandler{svc: service.NewNoticeService()} }

// List 公告列表(管理端)
// @Summary      公告列表
// @Description  分页查询公告(支持标题/类型/状态过滤)
// @Tags         公告管理
// @Produce      json
// @Security     BearerAuth
// @Param        page       query  int  false  "页码(默认1)"
// @Param        page_size  query  int  false  "每页条数(默认10,最大100)"
// @Param        title      query  string  false  "标题关键词"
// @Param        type       query  int     false  "类型(1通知 2公告)"
// @Param        status     query  int     false  "状态(0草稿 1发布)"
// @Success      200  {object}  xresponse.Response
// @Router       /enterprise/notices [get]
func (h *NoticeHandler) List(c *gin.Context) {
	p := syservice.GetPagination(c)
	title := c.Query("title")
	noticeType, _ := strconv.Atoi(c.DefaultQuery("type", "0"))
	status, _ := strconv.Atoi(c.DefaultQuery("status", "-1"))
	list, total, err := h.svc.List(c.Request.Context(), p.Page, p.PageSize, title, int8(noticeType), int8(status))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}

// Published 已发布公告
// @Summary      已发布公告
// @Description  已发布公告列表(可选按类型过滤,首页公告流)
// @Tags         公告管理
// @Produce      json
// @Security     BearerAuth
// @Param        type   query  int  false  "类型(1通知 2公告)"
// @Param        limit  query  int  false  "返回条数(默认20)"
// @Success      200  {object}  xresponse.Response
// @Router       /enterprise/notices/published [get]
func (h *NoticeHandler) Published(c *gin.Context) {
	noticeType, _ := strconv.Atoi(c.DefaultQuery("type", "0"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	list, err := h.svc.FindPublished(c.Request.Context(), int8(noticeType), limit)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, list)
}

// Feed 首页公告流(已认证,免权限)
// @Summary      首页公告流
// @Description  返回最新已发布公告(首页轮播/公告栏用)
// @Tags         公告管理
// @Produce      json
// @Security     BearerAuth
// @Param        limit  query  int  false  "返回条数(默认5)"
// @Success      200  {object}  xresponse.Response
// @Router       /enterprise/notices/feed [get]
func (h *NoticeHandler) Feed(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "5"))
	list, err := h.svc.FindPublished(c.Request.Context(), 0, limit)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, list)
}

// GetByID 公告详情
// @Summary      公告详情
// @Tags         公告管理
// @Produce      json
// @Security     BearerAuth
// @Param        id  path      int  true  "公告ID"
// @Success      200  {object}  xresponse.Response
// @Router       /enterprise/notices/{id} [get]
func (h *NoticeHandler) GetByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	notice, err := h.svc.GetByID(c.Request.Context(), uint(id))
	if err != nil {
		response.Fail(c, errcode.ErrNotFound, err.Error())
		return
	}
	response.OK(c, notice)
}

// Create 创建公告
// @Summary      创建公告
// @Tags         公告管理
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body      service.CreateNoticeRequest  true  "创建公告请求"
// @Success      200   {object}  xresponse.Response
// @Router       /enterprise/notices [post]
func (h *NoticeHandler) Create(c *gin.Context) {
	var req service.CreateNoticeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	notice, err := h.svc.Create(c.Request.Context(), &req)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, notice)
}

// Update 更新公告
// @Summary      更新公告
// @Tags         公告管理
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id    path      int                        true  "公告ID"
// @Param        body  body      service.UpdateNoticeRequest  true  "更新公告请求"
// @Success      200   {object}  xresponse.Response
// @Router       /enterprise/notices/{id} [put]
func (h *NoticeHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	var req service.UpdateNoticeRequest
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

// Publish 发布公告
// @Summary      发布公告
// @Tags         公告管理
// @Produce      json
// @Security     BearerAuth
// @Param        id  path      int  true  "公告ID"
// @Success      200  {object}  xresponse.Response
// @Router       /enterprise/notices/{id}/publish [put]
func (h *NoticeHandler) Publish(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	if err := h.svc.Publish(c.Request.Context(), uint(id)); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// Withdraw 撤回公告
// @Summary      撤回公告
// @Tags         公告管理
// @Produce      json
// @Security     BearerAuth
// @Param        id  path      int  true  "公告ID"
// @Success      200  {object}  xresponse.Response
// @Router       /enterprise/notices/{id}/withdraw [put]
func (h *NoticeHandler) Withdraw(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	if err := h.svc.Withdraw(c.Request.Context(), uint(id)); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// Delete 删除公告
// @Summary      删除公告
// @Tags         公告管理
// @Produce      json
// @Security     BearerAuth
// @Param        id  path      int  true  "公告ID"
// @Success      200  {object}  xresponse.Response
// @Router       /enterprise/notices/{id} [delete]
func (h *NoticeHandler) Delete(c *gin.Context) {
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
