package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/module/psi/errcode"
	"qzt-go-server/internal/module/psi/service"
	syservice "qzt-go-server/internal/module/system/service"
	response "qzt-go-server/pkg/xresponse"
)

// inventory.go 库存盘点/调拨 handler。

// ── 盘点 ──

// StocktakeHandler 库存盘点。
type StocktakeHandler struct {
	svc *service.StocktakeService
}

func NewStocktakeHandler() *StocktakeHandler { return &StocktakeHandler{svc: service.NewStocktakeService()} }

// List 盘点单列表
// @Summary  盘点单列表
// @Tags     进销存-库存管理
// @Produce  json
// @Security BearerAuth
// @Param    page          query  int  false  "页码"
// @Param    page_size     query  int  false  "每页条数"
// @Param    warehouse_id  query  int  false  "仓库ID"
// @Param    status        query  int  false  "状态(1盘点中 2已确认 3已作废)"
// @Success  200  {object}  xresponse.Response
// @Router   /psi/stocktake-orders [get]
func (h *StocktakeHandler) List(c *gin.Context) {
	p := syservice.GetPagination(c)
	warehouseID, _ := strconv.ParseUint(c.DefaultQuery("warehouse_id", "0"), 10, 64)
	status, _ := strconv.Atoi(c.DefaultQuery("status", "0"))
	list, total, err := h.svc.List(c.Request.Context(), p.Page, p.PageSize, uint(warehouseID), int8(status))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}

// Create 创建盘点单
// @Summary  创建盘点单(冻结账面快照)
// @Tags     进销存-库存管理
// @Accept   json
// @Produce  json
// @Security BearerAuth
// @Param    body  body      service.CreateStocktakeRequest  true  "创建盘点请求"
// @Success  200   {object}  xresponse.Response
// @Router   /psi/stocktake-orders [post]
func (h *StocktakeHandler) Create(c *gin.Context) {
	var req service.CreateStocktakeRequest
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

// GetByID 盘点单详情
// @Summary  盘点单详情(含明细)
// @Tags     进销存-库存管理
// @Produce  json
// @Security BearerAuth
// @Param    id  path  int  true  "盘点单ID"
// @Success  200  {object}  xresponse.Response
// @Router   /psi/stocktake-orders/{id} [get]
func (h *StocktakeHandler) GetByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: id 无效")
		return
	}
	o, err := h.svc.GetByID(c.Request.Context(), uint(id))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, o)
}

// UpdateActual 录实盘数
// @Summary  录实盘数(批量)
// @Tags     进销存-库存管理
// @Accept   json
// @Produce  json
// @Security BearerAuth
// @Param    id    path  int  true  "盘点单ID"
// @Param    body  body  service.UpdateActualRequest  true  "实盘请求"
// @Success  200   {object}  xresponse.Response
// @Router   /psi/stocktake-orders/{id} [put]
func (h *StocktakeHandler) UpdateActual(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: id 无效")
		return
	}
	var req service.UpdateActualRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	if err := h.svc.UpdateActual(c.Request.Context(), uint(id), &req); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// Confirm 确认盘点
// @Summary  确认盘点(差异派生盘盈/盘亏流水)
// @Tags     进销存-库存管理
// @Produce  json
// @Security BearerAuth
// @Param    id  path  int  true  "盘点单ID"
// @Success  200  {object}  xresponse.Response
// @Router   /psi/stocktake-orders/{id}/confirm [post]
func (h *StocktakeHandler) Confirm(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: id 无效")
		return
	}
	o, err := h.svc.Confirm(c.Request.Context(), uint(id), operatorID(c))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, o)
}

// Cancel 作废盘点单
// @Summary  作废盘点单
// @Tags     进销存-库存管理
// @Produce  json
// @Security BearerAuth
// @Param    id  path  int  true  "盘点单ID"
// @Success  200  {object}  xresponse.Response
// @Router   /psi/stocktake-orders/{id}/cancel [put]
func (h *StocktakeHandler) Cancel(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: id 无效")
		return
	}
	if err := h.svc.Cancel(c.Request.Context(), uint(id)); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// Delete 删除盘点单
// @Summary  删除盘点单(仅已作废可删)
// @Tags     进销存-库存管理
// @Produce  json
// @Security BearerAuth
// @Param    id  path  int  true  "盘点单ID"
// @Success  200  {object}  xresponse.Response
// @Router   /psi/stocktake-orders/{id} [delete]
func (h *StocktakeHandler) Delete(c *gin.Context) {
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

// ── 调拨 ──

// TransferHandler 库存调拨。
type TransferHandler struct {
	svc *service.TransferService
}

func NewTransferHandler() *TransferHandler { return &TransferHandler{svc: service.NewTransferService()} }

// ListTransfer 调拨单列表
// @Summary  调拨单列表
// @Tags     进销存-库存管理
// @Produce  json
// @Security BearerAuth
// @Param    page                query  int  false  "页码"
// @Param    page_size           query  int  false  "每页条数"
// @Param    from_warehouse_id   query  int  false  "调出仓库ID"
// @Param    to_warehouse_id     query  int  false  "调入仓库ID"
// @Param    status              query  int  false  "状态(1在途 2完成 3已作废)"
// @Success  200  {object}  xresponse.Response
// @Router   /psi/stock-transfer-orders [get]
func (h *TransferHandler) ListTransfer(c *gin.Context) {
	p := syservice.GetPagination(c)
	fromID, _ := strconv.ParseUint(c.DefaultQuery("from_warehouse_id", "0"), 10, 64)
	toID, _ := strconv.ParseUint(c.DefaultQuery("to_warehouse_id", "0"), 10, 64)
	status, _ := strconv.Atoi(c.DefaultQuery("status", "0"))
	list, total, err := h.svc.List(c.Request.Context(), p.Page, p.PageSize, uint(fromID), uint(toID), int8(status))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}

// CreateTransfer 创建调拨单
// @Summary  创建调拨单(在途,执行时才动库存)
// @Tags     进销存-库存管理
// @Accept   json
// @Produce  json
// @Security BearerAuth
// @Param    body  body      service.CreateTransferRequest  true  "创建调拨请求"
// @Success  200   {object}  xresponse.Response
// @Router   /psi/stock-transfer-orders [post]
func (h *TransferHandler) CreateTransfer(c *gin.Context) {
	var req service.CreateTransferRequest
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

// GetTransferByID 调拨单详情
// @Summary  调拨单详情(含明细)
// @Tags     进销存-库存管理
// @Produce  json
// @Security BearerAuth
// @Param    id  path  int  true  "调拨单ID"
// @Success  200  {object}  xresponse.Response
// @Router   /psi/stock-transfer-orders/{id} [get]
func (h *TransferHandler) GetTransferByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: id 无效")
		return
	}
	o, err := h.svc.GetByID(c.Request.Context(), uint(id))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, o)
}

// ExecuteTransfer 执行调拨
// @Summary  执行调拨(出+入同事务,数量守恒)
// @Tags     进销存-库存管理
// @Produce  json
// @Security BearerAuth
// @Param    id  path  int  true  "调拨单ID"
// @Success  200  {object}  xresponse.Response
// @Router   /psi/stock-transfer-orders/{id}/execute [post]
func (h *TransferHandler) ExecuteTransfer(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: id 无效")
		return
	}
	o, err := h.svc.Execute(c.Request.Context(), uint(id), operatorID(c))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, o)
}

// CancelTransfer 作废调拨单
// @Summary  作废调拨单(仅在途可作废)
// @Tags     进销存-库存管理
// @Produce  json
// @Security BearerAuth
// @Param    id  path  int  true  "调拨单ID"
// @Success  200  {object}  xresponse.Response
// @Router   /psi/stock-transfer-orders/{id}/cancel [put]
func (h *TransferHandler) CancelTransfer(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: id 无效")
		return
	}
	if err := h.svc.Cancel(c.Request.Context(), uint(id)); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// DeleteTransfer 删除调拨单
// @Summary  删除调拨单(仅已作废可删)
// @Tags     进销存-库存管理
// @Produce  json
// @Security BearerAuth
// @Param    id  path  int  true  "调拨单ID"
// @Success  200  {object}  xresponse.Response
// @Router   /psi/stock-transfer-orders/{id} [delete]
func (h *TransferHandler) DeleteTransfer(c *gin.Context) {
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
