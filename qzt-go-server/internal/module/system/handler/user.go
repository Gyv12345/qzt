package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/middleware"
	"qzt-go-server/internal/module/system/errcode"
	"qzt-go-server/internal/module/system/service"
	response "qzt-go-server/pkg/xresponse"
)

type UserHandler struct {
	svc *service.UserService
}

func NewUserHandler() *UserHandler {
	return &UserHandler{svc: service.NewUserService()}
}

// Create 创建用户
// @Summary      创建用户
// @Description  新增用户并分配角色(事务)
// @Tags         用户管理
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body      service.CreateUserRequest  true  "创建用户请求"
// @Success      200   {object}  xresponse.Response
// @Router       /system/users [post]
func (h *UserHandler) Create(c *gin.Context) {
	var req service.CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}

	if err := h.svc.Create(c.Request.Context(), &req); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}

	// 创建成功后可在此发送欢迎邮件等异步通知（第一阶段未接入任务队列，留空）。
	// 若后续接入 MQ/asynq，在此 Enqueue 即可，失败不得影响已成功的用户创建。

	response.OK(c, nil)
}

// GetByID 用户详情
// @Summary      用户详情
// @Tags         用户管理
// @Produce      json
// @Security     BearerAuth
// @Param        id   path      int  true  "用户ID"
// @Success      200  {object}  xresponse.Response{data=model.SysUser}
// @Router       /system/users/{id} [get]
func (h *UserHandler) GetByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}

	user, err := h.svc.GetByID(c.Request.Context(), uint(id))
	if err != nil {
		response.Fail(c, errcode.ErrUserNotFound, "用户不存在")
		return
	}
	response.OK(c, user)
}

// Update 更新用户
// @Summary      更新用户
// @Description  更新用户资料/密码/角色;改密或改角色会使已签发 token 失效
// @Tags         用户管理
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id    path      int                        true  "用户ID"
// @Param        body  body      service.UpdateUserRequest  true  "更新用户请求"
// @Success      200   {object}  xresponse.Response
// @Router       /system/users/{id} [put]
func (h *UserHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}

	var req service.UpdateUserRequest
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

// Delete 删除用户
// @Summary      删除用户
// @Description  软删除;不允许删除当前登录用户与超级管理员
// @Tags         用户管理
// @Produce      json
// @Security     BearerAuth
// @Param        id   path      int  true  "用户ID"
// @Success      200  {object}  xresponse.Response
// @Router       /system/users/{id} [delete]
func (h *UserHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}

	if err := h.svc.Delete(c.Request.Context(), uint(id), middleware.GetUserID(c)); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// List 用户列表
// @Summary      用户列表
// @Tags         用户管理
// @Produce      json
// @Security     BearerAuth
// @Param        page       query  int  false  "页码(默认1)"
// @Param        page_size  query  int  false  "每页条数(默认10,最大100)"
// @Success      200  {object}  xresponse.Response
// @Router       /system/users [get]
func (h *UserHandler) List(c *gin.Context) {
	p := service.GetPagination(c)
	users, total, err := h.svc.List(c.Request.Context(), p.Page, p.PageSize)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{
		"list":  users,
		"total": total,
		"page":  p.Page,
		"size":  p.PageSize,
	})
}

// ── 公开(免鉴权)团队成员接口 ──

// PublicTeam 团队成员列表(公开)
// @Summary  团队成员列表(公开)
// @Description  返回正常状态用户作为官网团队成员展示(仅 nickname/avatar/position),免鉴权
// @Tags     CMS公开
// @Produce  json
// @Param    page       query  int  false  "页码(默认1)"
// @Param    page_size  query  int  false  "每页条数(默认10,最大100)"
// @Success  200  {object}  xresponse.Response
// @Router   /system/public/team [get]
func (h *UserHandler) PublicTeam(c *gin.Context) {
	p := service.GetPagination(c)
	list, total, err := h.svc.ListTeam(c.Request.Context(), p.Page, p.PageSize)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}
