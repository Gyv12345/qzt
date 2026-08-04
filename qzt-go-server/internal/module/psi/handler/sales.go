package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/module/psi/errcode"
	"qzt-go-server/internal/module/psi/service"
	syservice "qzt-go-server/internal/module/system/service"
	response "qzt-go-server/pkg/xresponse"
)

// sales.go 销售管理 handler:销售订单 + 销售退货。

// SalesHandler 销售管理。
type SalesHandler struct {
	svc *service.SalesService
}

func NewSalesHandler() *SalesHandler {
	return &SalesHandler{svc: service.NewSalesService()}
}

// Create 创建销售单
// @Summary  创建销售单
// @Tags     进销存-销售管理
// @Accept   json
// @Produce  json
// @Security BearerAuth
// @Param    body  body      service.CreateSalesOrderRequest  true  "创建销售单请求"
// @Success  200   {object}  xresponse.Response
// @Router   /psi/sales-orders [post]
func (h *SalesHandler) Create(c *gin.Context) {
	var req service.CreateSalesOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	o, err := h.svc.Create(c.Request.Context(), &req, operatorID(c))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, o)
}

// List 销售单列表
// @Summary  销售单列表
// @Tags     进销存-销售管理
// @Produce  json
// @Security BearerAuth
// @Param    page             query  int     false  "页码"
// @Param    page_size        query  int     false  "每页条数"
// @Param    keyword          query  string  false  "单号"
// @Param    customer_id      query  int     false  "客户ID"
// @Param    status           query  int     false  "单据状态"
// @Param    approval_status  query  string  false  "审批状态"
// @Success  200  {object}  xresponse.Response
// @Router   /psi/sales-orders [get]
func (h *SalesHandler) List(c *gin.Context) {
	p := syservice.GetPagination(c)
	keyword := c.Query("keyword")
	customerID, _ := strconv.ParseUint(c.DefaultQuery("customer_id", "0"), 10, 64)
	status, _ := strconv.Atoi(c.DefaultQuery("status", "0"))
	approvalStatus := c.Query("approval_status")
	list, total, err := h.svc.List(c.Request.Context(), p.Page, p.PageSize, keyword, uint(customerID), int8(status), approvalStatus)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}

// GetByID 销售单详情(含明细)
// @Summary  销售单详情
// @Tags     进销存-销售管理
// @Produce  json
// @Security BearerAuth
// @Param    id  path  int  true  "销售单ID"
// @Success  200  {object}  xresponse.Response
// @Router   /psi/sales-orders/{id} [get]
func (h *SalesHandler) GetByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: id 无效")
		return
	}
	o, err := h.svc.GetByID(c.Request.Context(), uint(id))
	if err != nil {
		response.Fail(c, errcode.ErrSalesOrderNotFound, err.Error())
		return
	}
	response.OK(c, o)
}

// Update 更新销售单
// @Summary  更新销售单
// @Tags     进销存-销售管理
// @Accept   json
// @Produce  json
// @Security BearerAuth
// @Param    id    path  int                            true  "销售单ID"
// @Param    body  body  service.CreateSalesOrderRequest  true  "更新销售单请求"
// @Success  200   {object}  xresponse.Response
// @Router   /psi/sales-orders/{id} [put]
func (h *SalesHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: id 无效")
		return
	}
	var req service.CreateSalesOrderRequest
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

// Delete 删除销售单
// @Summary  删除销售单
// @Tags     进销存-销售管理
// @Produce  json
// @Security BearerAuth
// @Param    id  path  int  true  "销售单ID"
// @Success  200  {object}  xresponse.Response
// @Router   /psi/sales-orders/{id} [delete]
func (h *SalesHandler) Delete(c *gin.Context) {
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

// StockOut 执行销售出库
// @Summary  执行销售出库
// @Tags     进销存-销售管理
// @Produce  json
// @Security BearerAuth
// @Param    id  path  int  true  "销售单ID"
// @Success  200  {object}  xresponse.Response
// @Router   /psi/sales-orders/{id}/stock-out [post]
func (h *SalesHandler) StockOut(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: id 无效")
		return
	}
	if err := h.svc.StockOut(c.Request.Context(), uint(id), operatorID(c)); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// ── 销售退货 ──

// CreateReturn 创建销售退货单
// @Summary  创建销售退货单
// @Tags     进销存-销售管理
// @Accept   json
// @Produce  json
// @Security BearerAuth
// @Param    body  body      service.CreateSalesReturnRequest  true  "创建销售退货请求"
// @Success  200   {object}  xresponse.Response
// @Router   /psi/sales-returns [post]
func (h *SalesHandler) CreateReturn(c *gin.Context) {
	var req service.CreateSalesReturnRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	r, err := h.svc.CreateReturn(c.Request.Context(), &req, operatorID(c))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, r)
}

// ListReturns 销售退货列表
// @Summary  销售退货列表
// @Tags     进销存-销售管理
// @Produce  json
// @Security BearerAuth
// @Param    page         query  int     false  "页码"
// @Param    page_size    query  int     false  "每页条数"
// @Param    keyword      query  string  false  "退货单号"
// @Param    customer_id  query  int     false  "客户ID"
// @Param    status       query  int     false  "状态"
// @Success  200  {object}  xresponse.Response
// @Router   /psi/sales-returns [get]
func (h *SalesHandler) ListReturns(c *gin.Context) {
	p := syservice.GetPagination(c)
	keyword := c.Query("keyword")
	customerID, _ := strconv.ParseUint(c.DefaultQuery("customer_id", "0"), 10, 64)
	status, _ := strconv.Atoi(c.DefaultQuery("status", "0"))
	list, total, err := h.svc.ListReturns(c.Request.Context(), p.Page, p.PageSize, keyword, uint(customerID), int8(status))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}

// GetReturnByID 销售退货详情(含明细)
// @Summary  销售退货详情
// @Tags     进销存-销售管理
// @Produce  json
// @Security BearerAuth
// @Param    id  path  int  true  "退货单ID"
// @Success  200  {object}  xresponse.Response
// @Router   /psi/sales-returns/{id} [get]
func (h *SalesHandler) GetReturnByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: id 无效")
		return
	}
	r, err := h.svc.GetReturnByID(c.Request.Context(), uint(id))
	if err != nil {
		response.Fail(c, errcode.ErrSalesReturnNotFound, err.Error())
		return
	}
	response.OK(c, r)
}

// StockInReturn 执行销售退货入库
// @Summary  执行销售退货入库
// @Tags     进销存-销售管理
// @Produce  json
// @Security BearerAuth
// @Param    id  path  int  true  "退货单ID"
// @Success  200  {object}  xresponse.Response
// @Router   /psi/sales-returns/{id}/stock-in [post]
func (h *SalesHandler) StockInReturn(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: id 无效")
		return
	}
	if err := h.svc.StockInReturn(c.Request.Context(), uint(id), operatorID(c)); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}
