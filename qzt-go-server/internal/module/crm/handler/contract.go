package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/middleware"
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
// @Success  200  {object}  xresponse.Response
// @Router   /crm/contracts [get]
func (h *ContractHandler) List(c *gin.Context) {
	p := syservice.GetPagination(c)
	keyword := c.Query("keyword")
	stage := c.Query("stage")
	customerID, _ := strconv.ParseUint(c.Query("customer_id"), 10, 64)
	list, total, err := h.svc.List(c.Request.Context(), p.Page, p.PageSize, keyword, uint(customerID), stage)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}
