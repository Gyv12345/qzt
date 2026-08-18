package handler

import (
	"slices"
	"strconv"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/middleware"
	"qzt-go-server/internal/model"
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

// rejectRoleGrantByNonSuperAdmin 分配 super_admin 角色(id=1,持有者代码级绕过
// 全部 RBAC)仅限超级管理员操作者本人,防止仅持用户管理权限的普通管理员
// 给自己或他人授超管角色完成自我提权。命中拦截时已写响应并返回 true。
func rejectRoleGrantByNonSuperAdmin(c *gin.Context, roleIDs []uint) bool {
	if !slices.Contains(roleIDs, 1) || slices.Contains(middleware.GetRoleCodes(c), model.SuperAdminRoleCode) {
		return false
	}
	response.Fail(c, errcode.ErrForbidden, "仅超级管理员可分配超级管理员角色")
	return true
}

// alertRootAccountWrite 针对根账户(id=1)的写操作尝试(无论被守卫拒绝还是放行)
// 推送安全告警给根账户本人。err 为对应 service 调用的结果。
func alertRootAccountWrite(c *gin.Context, action string, err error) {
	result := "成功"
	if err != nil {
		result = "被拒绝: " + err.Error()
	}
	service.AlertRootAccountWrite(c.Request.Context(), action, "超级管理员账户",
		middleware.GetUsername(c), c.ClientIP(), result)
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

	if rejectRoleGrantByNonSuperAdmin(c, req.RoleIDs) {
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
// @Description  更新用户资料/密码/角色;改密或改角色会使已签发 token 失效。超级管理员账户(id=1)的密码/状态/角色不可经由本接口变更,仅限资料字段
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

	if rejectRoleGrantByNonSuperAdmin(c, req.RoleIDs) {
		return
	}

	err = h.svc.Update(c.Request.Context(), uint(id), &req)
	if id == 1 {
		alertRootAccountWrite(c, "更新用户", err)
	}
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// ResetPassword 重置用户密码
// @Summary      重置用户密码
// @Description  管理员重置指定用户密码(无需旧密码,典型场景:用户忘记密码)。会使该用户所有已登录会话失效,并清除其登录失败锁定。超级管理员账户(id=1)不可被重置
// @Tags         用户管理
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id    path      int                          true  "用户ID"
// @Param        body  body      service.ResetPasswordRequest  true  "重置密码请求"
// @Success      200   {object}  xresponse.Response
// @Router       /system/users/{id}/reset-password [put]
func (h *UserHandler) ResetPassword(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}

	var req service.ResetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}

	err = h.svc.ResetPassword(c.Request.Context(), uint(id), &req)
	if id == 1 {
		alertRootAccountWrite(c, "重置密码", err)
	}
	if err != nil {
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

	err = h.svc.Delete(c.Request.Context(), uint(id), middleware.GetUserID(c))
	if id == 1 {
		alertRootAccountWrite(c, "删除用户", err)
	}
	if err != nil {
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

// ListOptions 用户简表(仅登录,无 RBAC)
// @Summary      用户简表选项
// @Description  登录即可用的用户简表(id/用户名/昵称),供站内信收件人、转移负责人等选人场景;支持 keyword 模糊搜索
// @Tags         用户管理
// @Produce      json
// @Security     BearerAuth
// @Param        keyword  query  string  false  "用户名/昵称关键字"
// @Param        limit    query  int     false  "返回条数(默认50,最大100)"
// @Success      200  {object}  xresponse.Response
// @Router       /system/users/options [get]
func (h *UserHandler) ListOptions(c *gin.Context) {
	limit, err := strconv.Atoi(c.DefaultQuery("limit", "50"))
	if err != nil {
		limit = 50
	}
	list, err := h.svc.ListOptions(c.Request.Context(), c.Query("keyword"), limit)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list})
}

// ── 公开(免鉴权)团队成员接口 ──

// PublicTeam 团队成员列表(公开)
// @Summary  团队成员列表(公开)
// @Description  返回「官网内容→官网首页配置→团队成员」精选的用户(板块关闭或未配置精选时为空),免鉴权
// @Tags     CMS公开
// @Produce  json
// @Success  200  {object}  xresponse.Response
// @Router   /system/public/team [get]
func (h *UserHandler) PublicTeam(c *gin.Context) {
	list, total, err := h.svc.ListTeam(c.Request.Context())
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}
