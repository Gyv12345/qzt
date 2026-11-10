package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/module/cms/errcode"
	"qzt-go-server/internal/module/cms/service"
	response "qzt-go-server/pkg/xresponse"
)

// MediaHandler P22 媒体库（公共桶对象浏览/删除）。
type MediaHandler struct {
	svc *service.MediaService
}

func NewMediaHandler() *MediaHandler {
	return &MediaHandler{svc: service.NewMediaService()}
}

// List 媒体库列表
// @Summary      媒体库列表
// @Description  列举公共桶对象并拼直链,keyword 过滤 key 子串
// @Tags         媒体库
// @Produce      json
// @Security     BearerAuth
// @Param        keyword   query  string  false  "key 关键字过滤"
// @Param        max_keys  query  int     false  "最多返回条数(默认200,最大500)"
// @Success      200  {object}  xresponse.Response
// @Router       /cms/media [get]
func (h *MediaHandler) List(c *gin.Context) {
	maxKeys := 200
	if v := c.Query("max_keys"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			maxKeys = n
		}
	}
	list, err := h.svc.List(c.Request.Context(), c.Query("keyword"), maxKeys)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, list)
}

// MediaDeleteRequest 删除请求。
type MediaDeleteRequest struct {
	// 要删除的对象 key 清单
	ObjectKeys []string `json:"object_keys" binding:"required,min=1"`
}

// Delete 批量删除媒体对象
// @Summary      删除媒体对象
// @Tags         媒体库
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body  MediaDeleteRequest  true  "删除请求"
// @Success      200  {object}  xresponse.Response
// @Router       /cms/media/delete [post]
func (h *MediaHandler) Delete(c *gin.Context) {
	var req MediaDeleteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	deleted, failed, err := h.svc.Delete(c.Request.Context(), req.ObjectKeys)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"deleted": deleted, "failed": failed})
}