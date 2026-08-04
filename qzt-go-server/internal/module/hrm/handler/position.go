package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/module/hrm/service"
	"qzt-go-server/internal/module/system/errcode"
	response "qzt-go-server/pkg/xresponse"
)

// PositionHandler 岗位管理。
type PositionHandler struct {
	svc *service.PositionService
}

func NewPositionHandler() *PositionHandler {
	return &PositionHandler{svc: service.NewPositionService()}
}

// List 岗位列表
// @Summary  岗位列表
// @Tags     人力资源管理
// @Produce  json
// @Security BearerAuth
// @Param    department_id  query  int     false  "部门ID"
// @Param    status         query  int     false  "状态(1正常 0禁用)"
// @Success  200  {object}  xresponse.Response
// @Router   /hrm/positions [get]
func (h *PositionHandler) List(c *gin.Context) {
	deptID, _ := strconv.ParseUint(c.Query("department_id"), 10, 64)
	status, _ := strconv.ParseInt(c.Query("status"), 10, 8)
	list, err := h.svc.List(c.Request.Context(), uint(deptID), int8(status))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list})
}

// ListEnabled 启用岗位下拉
// @Summary  启用岗位列表(下拉用,免RBAC)
// @Tags     人力资源管理
// @Produce  json
// @Security BearerAuth
// @Success  200  {object}  xresponse.Response
// @Router   /hrm/positions/enabled [get]
func (h *PositionHandler) ListEnabled(c *gin.Context) {
	list, err := h.svc.ListEnabled(c.Request.Context())
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, list)
}

// GetByID 岗位详情
// @Summary  岗位详情
// @Tags     人力资源管理
// @Produce  json
// @Security BearerAuth
// @Param    id  path  int  true  "岗位ID"
// @Success  200  {object}  xresponse.Response
// @Router   /hrm/positions/{id} [get]
func (h *PositionHandler) GetByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	pos, err := h.svc.GetByID(c.Request.Context(), uint(id))
	if err != nil {
		response.Fail(c, errcode.ErrNotFound, err.Error())
		return
	}
	response.OK(c, pos)
}

// Create 创建岗位
// @Summary  创建岗位
// @Tags     人力资源管理
// @Accept   json
// @Produce  json
// @Security BearerAuth
// @Param    body  body  service.CreatePositionRequest  true  "创建岗位请求"
// @Success  200   {object}  xresponse.Response
// @Router   /hrm/positions [post]
func (h *PositionHandler) Create(c *gin.Context) {
	var req service.CreatePositionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	pos, err := h.svc.Create(c.Request.Context(), &req)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, pos)
}

// Update 更新岗位
// @Summary  更新岗位
// @Tags     人力资源管理
// @Accept   json
// @Produce  json
// @Security BearerAuth
// @Param    id    path  int                          true  "岗位ID"
// @Param    body  body  service.UpdatePositionRequest  true  "更新岗位请求"
// @Success  200   {object}  xresponse.Response
// @Router   /hrm/positions/{id} [put]
func (h *PositionHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	var req service.UpdatePositionRequest
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

// Delete 删除岗位
// @Summary  删除岗位
// @Tags     人力资源管理
// @Produce  json
// @Security BearerAuth
// @Param    id  path  int  true  "岗位ID"
// @Success  200  {object}  xresponse.Response
// @Router   /hrm/positions/{id} [delete]
func (h *PositionHandler) Delete(c *gin.Context) {
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
