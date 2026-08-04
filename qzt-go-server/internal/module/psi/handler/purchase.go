package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/module/psi/errcode"
	"qzt-go-server/internal/module/psi/service"
	syservice "qzt-go-server/internal/module/system/service"
	response "qzt-go-server/pkg/xresponse"
)

// purchase.go 采购管理 handler:采购订单 + 采购退货。

// PurchaseHandler 采购管理。
type PurchaseHandler struct {
	svc *service.PurchaseService
}

func NewPurchaseHandler() *PurchaseHandler {
	return &PurchaseHandler{svc: service.NewPurchaseService()}
}

// Create 创建采购单
// @Summary  创建采购单
// @Tags     进销存-采购管理
// @Accept   json
// @Produce  json
// @Security BearerAuth
// @Param    body  body      service.CreatePurchaseOrderRequest  true  "创建采购单请求"
// @Success  200   {object}  xresponse.Response
// @Router   /psi/purchase-orders [post]
func (h *PurchaseHandler) Create(c *gin.Context) {
	var req service.CreatePurchaseOrderRequest
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

// List 采购单列表
// @Summary  采购单列表
// @Tags     进销存-采购管理
// @Produce  json
// @Security BearerAuth
// @Param    page             query  int     false  "页码"
// @Param    page_size        query  int     false  "每页条数"
// @Param    keyword          query  string  false  "单号"
// @Param    supplier_id      query  int     false  "供应商ID"
// @Param    status           query  int     false  "单据状态"
// @Param    approval_status  query  string  false  "审批状态"
// @Success  200  {object}  xresponse.Response
// @Router   /psi/purchase-orders [get]
func (h *PurchaseHandler) List(c *gin.Context) {
	p := syservice.GetPagination(c)
	keyword := c.Query("keyword")
	supplierID, _ := strconv.ParseUint(c.DefaultQuery("supplier_id", "0"), 10, 64)
	status, _ := strconv.Atoi(c.DefaultQuery("status", "0"))
	approvalStatus := c.Query("approval_status")
	list, total, err := h.svc.List(c.Request.Context(), p.Page, p.PageSize, keyword, uint(supplierID), int8(status), approvalStatus)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}

// GetByID 采购单详情(含明细)
// @Summary  采购单详情
// @Tags     进销存-采购管理
// @Produce  json
// @Security BearerAuth
// @Param    id  path  int  true  "采购单ID"
// @Success  200  {object}  xresponse.Response
// @Router   /psi/purchase-orders/{id} [get]
func (h *PurchaseHandler) GetByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: id 无效")
		return
	}
	o, err := h.svc.GetByID(c.Request.Context(), uint(id))
	if err != nil {
		response.Fail(c, errcode.ErrPurchaseOrderNotFound, err.Error())
		return
	}
	response.OK(c, o)
}

// Update 更新采购单
// @Summary  更新采购单
// @Tags     进销存-采购管理
// @Accept   json
// @Produce  json
// @Security BearerAuth
// @Param    id    path  int                              true  "采购单ID"
// @Param    body  body  service.CreatePurchaseOrderRequest  true  "更新采购单请求"
// @Success  200   {object}  xresponse.Response
// @Router   /psi/purchase-orders/{id} [put]
func (h *PurchaseHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: id 无效")
		return
	}
	var req service.CreatePurchaseOrderRequest
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

// Delete 删除采购单
// @Summary  删除采购单
// @Tags     进销存-采购管理
// @Produce  json
// @Security BearerAuth
// @Param    id  path  int  true  "采购单ID"
// @Success  200  {object}  xresponse.Response
// @Router   /psi/purchase-orders/{id} [delete]
func (h *PurchaseHandler) Delete(c *gin.Context) {
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

// StockIn 执行采购入库
// @Summary  执行采购入库
// @Tags     进销存-采购管理
// @Produce  json
// @Security BearerAuth
// @Param    id  path  int  true  "采购单ID"
// @Success  200  {object}  xresponse.Response
// @Router   /psi/purchase-orders/{id}/stock-in [post]
func (h *PurchaseHandler) StockIn(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: id 无效")
		return
	}
	if err := h.svc.StockIn(c.Request.Context(), uint(id), operatorID(c)); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// ── 采购退货 ──

// CreateReturn 创建采购退货单
// @Summary  创建采购退货单
// @Tags     进销存-采购管理
// @Accept   json
// @Produce  json
// @Security BearerAuth
// @Param    body  body      service.CreatePurchaseReturnRequest  true  "创建采购退货请求"
// @Success  200   {object}  xresponse.Response
// @Router   /psi/purchase-returns [post]
func (h *PurchaseHandler) CreateReturn(c *gin.Context) {
	var req service.CreatePurchaseReturnRequest
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

// ListReturns 采购退货列表
// @Summary  采购退货列表
// @Tags     进销存-采购管理
// @Produce  json
// @Security BearerAuth
// @Param    page         query  int     false  "页码"
// @Param    page_size    query  int     false  "每页条数"
// @Param    keyword      query  string  false  "退货单号"
// @Param    supplier_id  query  int     false  "供应商ID"
// @Param    status       query  int     false  "状态"
// @Success  200  {object}  xresponse.Response
// @Router   /psi/purchase-returns [get]
func (h *PurchaseHandler) ListReturns(c *gin.Context) {
	p := syservice.GetPagination(c)
	keyword := c.Query("keyword")
	supplierID, _ := strconv.ParseUint(c.DefaultQuery("supplier_id", "0"), 10, 64)
	status, _ := strconv.Atoi(c.DefaultQuery("status", "0"))
	list, total, err := h.svc.ListReturns(c.Request.Context(), p.Page, p.PageSize, keyword, uint(supplierID), int8(status))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}

// GetReturnByID 采购退货详情(含明细)
// @Summary  采购退货详情
// @Tags     进销存-采购管理
// @Produce  json
// @Security BearerAuth
// @Param    id  path  int  true  "退货单ID"
// @Success  200  {object}  xresponse.Response
// @Router   /psi/purchase-returns/{id} [get]
func (h *PurchaseHandler) GetReturnByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: id 无效")
		return
	}
	r, err := h.svc.GetReturnByID(c.Request.Context(), uint(id))
	if err != nil {
		response.Fail(c, errcode.ErrPurchaseReturnNotFound, err.Error())
		return
	}
	response.OK(c, r)
}

// StockOutReturn 执行采购退货出库
// @Summary  执行采购退货出库
// @Tags     进销存-采购管理
// @Produce  json
// @Security BearerAuth
// @Param    id  path  int  true  "退货单ID"
// @Success  200  {object}  xresponse.Response
// @Router   /psi/purchase-returns/{id}/stock-out [post]
func (h *PurchaseHandler) StockOutReturn(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: id 无效")
		return
	}
	if err := h.svc.StockOutReturn(c.Request.Context(), uint(id), operatorID(c)); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}
