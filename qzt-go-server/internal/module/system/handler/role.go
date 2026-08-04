package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"qzt-go-server/internal/module/system/service"
	"qzt-go-server/internal/module/system/errcode"
	response "qzt-go-server/pkg/xresponse"
)

type RoleHandler struct {
	svc *service.RoleService
}

func NewRoleHandler() *RoleHandler {
	return &RoleHandler{svc: service.NewRoleService()}
}

// Create 创建角色
// @Summary      创建角色
// @Description  新增角色
// @Tags         角色管理
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body      service.CreateRoleRequest  true  "创建角色请求"
// @Success      200   {object}  xresponse.Response
// @Router       /system/roles [post]
func (h *RoleHandler) Create(c *gin.Context) {
	var req service.CreateRoleRequest
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

// GetByID 角色详情
// @Summary      角色详情
// @Tags         角色管理
// @Produce      json
// @Security     BearerAuth
// @Param        id   path      int  true  "角色ID"
// @Success      200  {object}  xresponse.Response{data=model.SysRole}
// @Router       /system/roles/{id} [get]
func (h *RoleHandler) GetByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	role, err := h.svc.GetByID(c.Request.Context(), uint(id))
	if err != nil {
		response.Fail(c, errcode.ErrRoleNotFound, "角色不存在")
		return
	}
	response.OK(c, role)
}

// Update 更新角色
// @Summary      更新角色
// @Tags         角色管理
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id    path      int                        true  "角色ID"
// @Param        body  body      service.UpdateRoleRequest  true  "更新角色请求"
// @Success      200   {object}  xresponse.Response
// @Router       /system/roles/{id} [put]
func (h *RoleHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	var req service.UpdateRoleRequest
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

// Delete 删除角色
// @Summary      删除角色
// @Tags         角色管理
// @Produce      json
// @Security     BearerAuth
// @Param        id   path      int  true  "角色ID"
// @Success      200  {object}  xresponse.Response
// @Router       /system/roles/{id} [delete]
func (h *RoleHandler) Delete(c *gin.Context) {
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

// List 角色列表
// @Summary      角色列表
// @Tags         角色管理
// @Produce      json
// @Security     BearerAuth
// @Param        page       query  int  false  "页码(默认1)"
// @Param        page_size  query  int  false  "每页条数(默认10,最大100)"
// @Success      200  {object}  xresponse.Response
// @Router       /system/roles [get]
func (h *RoleHandler) List(c *gin.Context) {
	p := service.GetPagination(c)
	roles, total, err := h.svc.List(c.Request.Context(), p.Page, p.PageSize)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{
		"list":  roles,
		"total": total,
		"page":  p.Page,
		"size":  p.PageSize,
	})
}

// ListAll 全部角色(下拉)
// @Summary      全部角色
// @Description  返回全部角色,不分页,供下拉选择使用
// @Tags         角色管理
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object}  xresponse.Response{data=[]model.SysRole}
// @Router       /system/roles/all [get]
func (h *RoleHandler) ListAll(c *gin.Context) {
	roles, err := h.svc.ListAll(c.Request.Context())
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, roles)
}

// SetMenus 设置角色菜单
// @Summary      设置角色菜单
// @Description  为指定角色分配菜单(全量覆盖)
// @Tags         角色管理
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id    path      int                          true  "角色ID"
// @Param        body  body      service.SetRoleMenusRequest  true  "角色菜单请求"
// @Success      200   {object}  xresponse.Response
// @Router       /system/roles/{id}/menus [put]
func (h *RoleHandler) SetMenus(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	var req service.SetRoleMenusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	if err := h.svc.SetMenus(c.Request.Context(), uint(id), req.MenuIDs); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// SetAPIs 设置角色接口
// @Summary      设置角色接口
// @Description  为指定角色分配接口(全量覆盖)
// @Tags         角色管理
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id    path      int                         true  "角色ID"
// @Param        body  body      service.SetRoleAPIsRequest  true  "角色接口请求"
// @Success      200   {object}  xresponse.Response
// @Router       /system/roles/{id}/apis [put]
func (h *RoleHandler) SetAPIs(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	var req service.SetRoleAPIsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	if err := h.svc.SetAPIs(c.Request.Context(), uint(id), req.APIs); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// GetAPIs 获取角色接口
// @Summary      获取角色接口
// @Description  返回指定角色已分配的接口列表
// @Tags         角色管理
// @Produce      json
// @Security     BearerAuth
// @Param        id   path      int  true  "角色ID"
// @Success      200  {object}  xresponse.Response{data=[]model.SysAPI}
// @Router       /system/roles/{id}/apis [get]
func (h *RoleHandler) GetAPIs(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	apis, err := h.svc.GetAPIs(c.Request.Context(), uint(id))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, apis)
}
