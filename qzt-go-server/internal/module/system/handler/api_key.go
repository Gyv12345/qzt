package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/mcp"
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
	if !validToolsetKeys(&req.Toolsets) {
		response.Fail(c, errcode.ErrParam, "包含未知的工具集标识")
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

// Update 更新 API Key(名称/工具集)
// @Summary      更新 API Key
// @Description  更新当前用户自己的 API Key(名称与 MCP 工具集,只传要改的字段)
// @Tags         API Key
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id    path  int                        true  "Key ID"
// @Param        body  body  service.UpdateKeyRequest   true  "更新请求"
// @Success      200   {object}  xresponse.Response
// @Router       /system/api-keys/{id} [put]
func (h *ApiKeyHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	var req service.UpdateKeyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	if !validToolsetKeys(req.Toolsets) {
		response.Fail(c, errcode.ErrParam, "包含未知的工具集标识")
		return
	}
	userID := middleware.GetUserID(c)
	if err := h.svc.Update(c.Request.Context(), uint(id), userID, &req); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// Toolsets MCP 工具集目录(后台勾选 UI 数据源)
// @Summary      MCP 工具集目录
// @Description  返回可勾选的 MCP 工具集(含各集工具数),用于 API Key 的工具范围选择
// @Tags         API Key
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object}  xresponse.Response
// @Router       /system/api-keys/toolsets [get]
func (h *ApiKeyHandler) Toolsets(c *gin.Context) {
	response.OK(c, mcp.ToolsetCatalog())
}

// validToolsetKeys 校验工具集 key 数组(nil 视为不修改,放行)。
func validToolsetKeys(keys *[]string) bool {
	if keys == nil {
		return true
	}
	for _, k := range *keys {
		if !mcp.ValidToolset(k) {
			return false
		}
	}
	return true
}
