package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/middleware"
	"qzt-go-server/internal/module/system/service"
	"qzt-go-server/internal/module/system/errcode"
	response "qzt-go-server/pkg/xresponse"
)

// ApiKeyHandler API Key 管理(用户自助)。
type ApiKeyHandler struct {
	svc *service.ApiKeyService
}

func NewApiKeyHandler() *ApiKeyHandler {
	return &ApiKeyHandler{svc: service.NewApiKeyService()}
}

// Create 创建 API Key
// @Summary      创建 API Key
// @Description  为当前用户创建 API Key(明文仅返回一次,请妥善保存)
// @Tags         API Key
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body      service.CreateKeyRequest  true  "创建请求"
// @Success      200   {object}  xresponse.Response
// @Router       /system/api-keys [post]
func (h *ApiKeyHandler) Create(c *gin.Context) {
	var req service.CreateKeyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	userID := middleware.GetUserID(c)
	result, err := h.svc.Create(c.Request.Context(), userID, &req)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, result)
}

// List 我的 API Key 列表
// @Summary      我的 API Key 列表
// @Tags         API Key
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object}  xresponse.Response
// @Router       /system/api-keys [get]
func (h *ApiKeyHandler) List(c *gin.Context) {
	userID := middleware.GetUserID(c)
	list, err := h.svc.List(c.Request.Context(), userID)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, list)
}

// Delete 删除 API Key
// @Summary      删除 API Key
// @Tags         API Key
// @Produce      json
// @Security     BearerAuth
// @Param        id  path  int  true  "Key ID"
// @Success      200  {object}  xresponse.Response
// @Router       /system/api-keys/{id} [delete]
func (h *ApiKeyHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	userID := middleware.GetUserID(c)
	if err := h.svc.Delete(c.Request.Context(), uint(id), userID); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// Disable 禁用 API Key
// @Summary      禁用 API Key
// @Tags         API Key
// @Produce      json
// @Security     BearerAuth
// @Param        id  path  int  true  "Key ID"
// @Success      200  {object}  xresponse.Response
// @Router       /system/api-keys/{id}/disable [put]
func (h *ApiKeyHandler) Disable(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	userID := middleware.GetUserID(c)
	if err := h.svc.Disable(c.Request.Context(), uint(id), userID); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}
