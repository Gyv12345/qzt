package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/middleware"
	"qzt-go-server/internal/module/cms/errcode"
	"qzt-go-server/internal/module/cms/service"
	response "qzt-go-server/pkg/xresponse"
)

// VersionHandler 文章版本快照与回滚（P20）。
type VersionHandler struct {
	svc *service.VersionService
}

func NewVersionHandler() *VersionHandler {
	return &VersionHandler{svc: service.NewVersionService()}
}

// List 文章版本列表
// @Summary      文章版本列表
// @Tags         文章管理
// @Produce      json
// @Security     BearerAuth
// @Param        id   path   int  true  "文章ID"
// @Success      200  {object}  xresponse.Response
// @Router       /cms/articles/{id}/versions [get]
func (h *VersionHandler) List(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	list, total, err := h.svc.List(c.Request.Context(), uint(id), 1, 50)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}

// Rollback 回滚文章到指定版本
// @Summary      回滚文章到指定版本
// @Tags         文章管理
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id         path  int  true  "文章ID"
// @Param        version_id path  int  true  "版本ID"
// @Success      200  {object}  xresponse.Response
// @Router       /cms/articles/{id}/versions/{version_id}/rollback [post]
func (h *VersionHandler) Rollback(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	versionID, err := strconv.ParseUint(c.Param("version_id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	authorID := middleware.GetUserID(c)
	authorName := middleware.GetUsername(c)
	article, err := h.svc.Rollback(c.Request.Context(), uint(id), uint(versionID), authorID, authorName)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, article)
}
