package handler

import (
	"slices"
	"strconv"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/middleware"
	"qzt-go-server/internal/model"
	"qzt-go-server/internal/module/crm/service"
	"qzt-go-server/internal/module/system/errcode"
	syservice "qzt-go-server/internal/module/system/service"
	response "qzt-go-server/pkg/xresponse"
)

// ContractHandler 合同管理。
type ContractHandler struct {
	svc *service.ContractService
}

func NewContractHandler() *ContractHandler {
	return &ContractHandler{svc: service.NewContractService()}
}

// isSuperAdmin 当前请求用户是否超管(合同变更的严格负责人口径用)。
func (h *ContractHandler) isSuperAdmin(c *gin.Context) bool {
	return slices.Contains(middleware.GetRoleCodes(c), model.SuperAdminRoleCode)
}

// Create 创建合同
// @Summary  创建合同
// @Tags     合同管理
// @Accept   json
// @Produce  json
// @Security BearerAuth
// @Param    body  body      service.CreateContractRequest  true  "创建合同请求"
// @Success  200   {object}  xresponse.Response
// @Router   /crm/contracts [post]
func (h *ContractHandler) Create(c *gin.Context) {
	var req service.CreateContractRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	contract, err := h.svc.Create(c.Request.Context(), &req, middleware.GetUserID(c))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, contract)
}

// GetByID 合同详情
// @Summary  合同详情
// @Tags     合同管理
// @Produce  json
// @Security BearerAuth
// @Param    id  path      int  true  "合同ID"
// @Success  200  {object}  xresponse.Response
// @Router   /crm/contracts/{id} [get]
func (h *ContractHandler) GetByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	contract, err := h.svc.GetByID(c.Request.Context(), uint(id))
	if err != nil {
		response.Fail(c, errcode.ErrNotFound, err.Error())
		return
	}
	response.OK(c, contract)
}

// Update 更新合同
// @Summary  更新合同
// @Tags     合同管理
// @Accept   json
// @Produce  json
// @Security BearerAuth
// @Param    id    path      int  true  "合同ID"
// @Param    body  body      service.UpdateContractRequest  true  "更新合同请求"
// @Success  200   {object}  xresponse.Response
// @Router   /crm/contracts/{id} [put]
func (h *ContractHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	var req service.UpdateContractRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	if err := h.svc.Update(c.Request.Context(), uint(id), &req, middleware.GetUserID(c)); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// Delete 删除合同
// @Summary  删除合同
// @Tags     合同管理
// @Produce  json
// @Security BearerAuth
// @Param    id  path      int  true  "合同ID"
// @Success  200  {object}  xresponse.Response
// @Router   /crm/contracts/{id} [delete]
func (h *ContractHandler) Delete(c *gin.Context) {
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

// List 合同列表
// @Summary  合同列表
// @Tags     合同管理
// @Produce  json
// @Security BearerAuth
// @Param    page        query  int     false  "页码(默认1)"
// @Param    page_size   query  int     false  "每页条数(默认10,最大100)"
// @Param    keyword     query  string  false  "合同名称模糊"
// @Param    customer_id query  int     false  "客户ID过滤"
// @Param    stage       query  string  false  "合同阶段过滤"
// @Param    category    query  string  false  "合同分类过滤"
// @Param    archived    query  string  false  "归档过滤:all/yes/no(默认no,列表默认不含已归档)"
// @Success  200  {object}  xresponse.Response
// @Router   /crm/contracts [get]
func (h *ContractHandler) List(c *gin.Context) {
	p := syservice.GetPagination(c)
	keyword := c.Query("keyword")
	stage := c.Query("stage")
	category := c.Query("category")
	archived := c.Query("archived")
	customerID, _ := strconv.ParseUint(c.Query("customer_id"), 10, 64)
	list, total, err := h.svc.List(c.Request.Context(), p.Page, p.PageSize, keyword,
		uint(customerID), stage, category, archived)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}

// Stats 合同统计
// @Summary  合同统计(总金额/分阶段/本月签订/临期列表)
// @Tags     合同管理
// @Produce  json
// @Security BearerAuth
// @Success  200  {object}  xresponse.Response
// @Router   /crm/contracts/stats [get]
func (h *ContractHandler) Stats(c *gin.Context) {
	stats, err := h.svc.Stats(c.Request.Context())
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, stats)
}

// ListChanges 合同变更记录列表
// @Summary  合同变更记录列表(倒序,带操作人姓名)
// @Tags     合同管理
// @Produce  json
// @Security BearerAuth
// @Param    id  path  int  true  "合同ID"
// @Success  200  {object}  xresponse.Response
// @Router   /crm/contracts/{id}/changes [get]
func (h *ContractHandler) ListChanges(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	list, err := h.svc.ListChanges(c.Request.Context(), uint(id))
	if err != nil {
		response.Fail(c, errcode.ErrNotFound, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": len(list)})
}

// Change 提交合同变更
// @Summary  提交合同变更(金额/结束日期,仅负责人或超管,仅已签订/执行中)
// @Tags     合同管理
// @Accept   json
// @Produce  json
// @Security BearerAuth
// @Param    id    path  int  true  "合同ID"
// @Param    body  body  service.ContractChangeRequest  true  "变更请求"
// @Success  200  {object}  xresponse.Response
// @Router   /crm/contracts/{id}/changes [post]
func (h *ContractHandler) Change(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	var req service.ContractChangeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	if err := h.svc.Change(c.Request.Context(), uint(id), &req,
		middleware.GetUserID(c), h.isSuperAdmin(c)); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// Archive 合同归档
// @Summary  合同归档(仅已完成/已终止)
// @Tags     合同管理
// @Produce  json
// @Security BearerAuth
// @Param    id  path  int  true  "合同ID"
// @Success  200  {object}  xresponse.Response
// @Router   /crm/contracts/{id}/archive [post]
func (h *ContractHandler) Archive(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	if err := h.svc.Archive(c.Request.Context(), uint(id), middleware.GetUserID(c)); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// Unarchive 合同取消归档
// @Summary  合同取消归档
// @Tags     合同管理
// @Produce  json
// @Security BearerAuth
// @Param    id  path  int  true  "合同ID"
// @Success  200  {object}  xresponse.Response
// @Router   /crm/contracts/{id}/unarchive [post]
func (h *ContractHandler) Unarchive(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	if err := h.svc.Unarchive(c.Request.Context(), uint(id)); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}
