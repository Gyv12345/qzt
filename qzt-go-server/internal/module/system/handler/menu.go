package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"qzt-go-server/internal/middleware"
	"qzt-go-server/internal/module/system/service"
	"qzt-go-server/internal/module/system/errcode"
	response "qzt-go-server/pkg/xresponse"
)

type MenuHandler struct {
	svc *service.MenuService
}

func NewMenuHandler() *MenuHandler {
	return &MenuHandler{svc: service.NewMenuService()}
}

// Create 创建菜单
// @Summary      创建菜单
// @Tags         菜单管理
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body      service.CreateMenuRequest  true  "创建菜单请求"
// @Success      200   {object}  xresponse.Response
// @Router       /system/menus [post]
func (h *MenuHandler) Create(c *gin.Context) {
	var req service.CreateMenuRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	if req.Status == 0 {
		req.Status = 1
	}
	if req.Visible == 0 {
		req.Visible = 1
	}

	if err := h.svc.Create(c.Request.Context(), &req); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// GetByID 菜单详情
// @Summary      菜单详情
// @Tags         菜单管理
// @Produce      json
// @Security     BearerAuth
// @Param        id   path      int  true  "菜单ID"
// @Success      200  {object}  xresponse.Response{data=model.SysMenu}
// @Router       /system/menus/{id} [get]
func (h *MenuHandler) GetByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}

	menu, err := h.svc.GetByID(c.Request.Context(), uint(id))
	if err != nil {
		response.Fail(c, errcode.ErrMenuNotFound, "菜单不存在")
		return
	}
	response.OK(c, menu)
}

// Update 更新菜单
// @Summary      更新菜单
// @Tags         菜单管理
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id    path      int                        true  "菜单ID"
// @Param        body  body      service.UpdateMenuRequest  true  "更新菜单请求"
// @Success      200   {object}  xresponse.Response
// @Router       /system/menus/{id} [put]
func (h *MenuHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}

	var req service.UpdateMenuRequest
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

// Delete 删除菜单
// @Summary      删除菜单
// @Tags         菜单管理
// @Produce      json
// @Security     BearerAuth
// @Param        id   path      int  true  "菜单ID"
// @Success      200  {object}  xresponse.Response
// @Router       /system/menus/{id} [delete]
func (h *MenuHandler) Delete(c *gin.Context) {
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

// GetTree 菜单树
// @Summary      菜单树
// @Description  返回全部菜单的树形结构(管理端)
// @Tags         菜单管理
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object}  xresponse.Response{data=[]model.SysMenu}
// @Router       /system/menus/tree [get]
func (h *MenuHandler) GetTree(c *gin.Context) {
	tree, err := h.svc.GetTree(c.Request.Context())
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, tree)
}

// GetUserMenuTree 当前用户菜单树
// @Summary      当前用户菜单树
// @Description  返回当前登录用户可见的菜单树(含按钮权限)
// @Tags         菜单管理
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object}  xresponse.Response{data=[]model.SysMenu}
// @Router       /system/menus/user [get]
func (h *MenuHandler) GetUserMenuTree(c *gin.Context) {
	userID := middleware.GetUserID(c)
	tree, err := h.svc.GetUserMenuTree(c.Request.Context(), userID)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, tree)
}
