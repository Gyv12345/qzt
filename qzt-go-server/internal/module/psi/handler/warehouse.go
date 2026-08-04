package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/middleware"
	"qzt-go-server/internal/module/psi/errcode"
	"qzt-go-server/internal/module/psi/service"
	syservice "qzt-go-server/internal/module/system/service"
	response "qzt-go-server/pkg/xresponse"
)

// warehouse.go 仓库管理 handler。

// WarehouseHandler 仓库管理。
type WarehouseHandler struct {
	svc *service.WarehouseService
}

func NewWarehouseHandler() *WarehouseHandler {
	return &WarehouseHandler{svc: service.NewWarehouseService()}
}

// Create 创建仓库
// @Summary  创建仓库
// @Tags     进销存-仓库管理
// @Accept   json
// @Produce  json
// @Security BearerAuth
// @Param    body  body      service.CreateWarehouseRequest  true  "创建仓库请求"
// @Success  200   {object}  xresponse.Response
// @Router   /psi/warehouses [post]
func (h *WarehouseHandler) Create(c *gin.Context) {
	var req service.CreateWarehouseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	wh, err := h.svc.Create(c.Request.Context(), &req)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, wh)
}

// List 仓库列表
// @Summary  仓库列表
// @Tags     进销存-仓库管理
// @Produce  json
// @Security BearerAuth
// @Param    page       query  int     false  "页码"
// @Param    page_size  query  int     false  "每页条数"
// @Param    keyword    query  string  false  "名称/编码"
// @Param    status     query  int     false  "状态"
// @Success  200  {object}  xresponse.Response
// @Router   /psi/warehouses [get]
func (h *WarehouseHandler) List(c *gin.Context) {
	p := syservice.GetPagination(c)
	keyword := c.Query("keyword")
	status, _ := strconv.Atoi(c.DefaultQuery("status", "0"))
	list, total, err := h.svc.List(c.Request.Context(), p.Page, p.PageSize, keyword, int8(status))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}

// GetByID 仓库详情
// @Summary  仓库详情
// @Tags     进销存-仓库管理
// @Produce  json
// @Security BearerAuth
// @Param    id  path  int  true  "仓库ID"
// @Success  200  {object}  xresponse.Response
// @Router   /psi/warehouses/{id} [get]
func (h *WarehouseHandler) GetByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: id 无效")
		return
	}
	wh, err := h.svc.GetByID(c.Request.Context(), uint(id))
	if err != nil {
		response.Fail(c, errcode.ErrNotFound, err.Error())
		return
	}
	response.OK(c, wh)
}

// Update 更新仓库
// @Summary  更新仓库
// @Tags     进销存-仓库管理
// @Accept   json
// @Produce  json
// @Security BearerAuth
// @Param    id    path  int                          true  "仓库ID"
// @Param    body  body  service.UpdateWarehouseRequest  true  "更新仓库请求"
// @Success  200   {object}  xresponse.Response
// @Router   /psi/warehouses/{id} [put]
func (h *WarehouseHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: id 无效")
		return
	}
	var req service.UpdateWarehouseRequest
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

// Delete 删除仓库
// @Summary  删除仓库
// @Tags     进销存-仓库管理
// @Produce  json
// @Security BearerAuth
// @Param    id  path  int  true  "仓库ID"
// @Success  200  {object}  xresponse.Response
// @Router   /psi/warehouses/{id} [delete]
func (h *WarehouseHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: id 无效")
		return
	}
	if err := h.svc.Delete(c.Request.Context(), uint(id)); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// ListEnabled 启用仓库下拉
// @Summary  启用仓库下拉
// @Tags     进销存-仓库管理
// @Produce  json
// @Security BearerAuth
// @Success  200  {object}  xresponse.Response
// @Router   /psi/warehouses/enabled [get]
func (h *WarehouseHandler) ListEnabled(c *gin.Context) {
	list, err := h.svc.ListEnabled(c.Request.Context())
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, list)
}

// 供 router 使用:获取当前操作人ID。
func operatorID(c *gin.Context) *uint {
	uid := middleware.GetUserID(c)
	if uid == 0 {
		return nil
	}
	return &uid
}
