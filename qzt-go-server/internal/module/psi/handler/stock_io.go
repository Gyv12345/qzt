package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/module/psi/errcode"
	"qzt-go-server/internal/module/psi/service"
	syservice "qzt-go-server/internal/module/system/service"
	response "qzt-go-server/pkg/xresponse"
)

// stock_io.go 其他入库/出库 handler(盘点盈亏、赠品、领用、损耗)。

// StockIOHandler 其他出入库。
type StockIOHandler struct {
	svc *service.StockIOService
}

func NewStockIOHandler() *StockIOHandler {
	return &StockIOHandler{svc: service.NewStockIOService()}
}

// ── 其他入库 ──

// CreateIn 创建其他入库单(立即生效)
// @Summary  创建其他入库单
// @Tags     进销存-库存管理
// @Accept   json
// @Produce  json
// @Security BearerAuth
// @Param    body  body      service.CreateStockInRequest  true  "创建其他入库请求"
// @Success  200   {object}  xresponse.Response
// @Router   /psi/stock-in-orders [post]
func (h *StockIOHandler) CreateIn(c *gin.Context) {
	var req service.CreateStockInRequest
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

// ListIn 其他入库单列表
// @Summary  其他入库单列表
// @Tags     进销存-库存管理
// @Produce  json
// @Security BearerAuth
// @Param    page          query  int     false  "页码"
// @Param    page_size     query  int     false  "每页条数"
// @Param    warehouse_id  query  int     false  "仓库ID"
// @Param    biz_type      query  string  false  "子类型"
// @Success  200  {object}  xresponse.Response
// @Router   /psi/stock-in-orders [get]
func (h *StockIOHandler) ListIn(c *gin.Context) {
	p := syservice.GetPagination(c)
	warehouseID, _ := strconv.ParseUint(c.DefaultQuery("warehouse_id", "0"), 10, 64)
	bizType := c.Query("biz_type")
	list, total, err := h.svc.ListIn(c.Request.Context(), p.Page, p.PageSize, uint(warehouseID), bizType)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}

// GetInByID 其他入库单详情(含明细)
// @Summary  其他入库单详情
// @Tags     进销存-库存管理
// @Produce  json
// @Security BearerAuth
// @Param    id  path  int  true  "入库单ID"
// @Success  200  {object}  xresponse.Response
// @Router   /psi/stock-in-orders/{id} [get]
func (h *StockIOHandler) GetInByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: id 无效")
		return
	}
	o, err := h.svc.GetInByID(c.Request.Context(), uint(id))
	if err != nil {
		response.Fail(c, errcode.ErrStockIONotFound, err.Error())
		return
	}
	response.OK(c, o)
}

// ── 其他出库 ──

// CreateOut 创建其他出库单(立即生效)
// @Summary  创建其他出库单
// @Tags     进销存-库存管理
// @Accept   json
// @Produce  json
// @Security BearerAuth
// @Param    body  body      service.CreateStockOutRequest  true  "创建其他出库请求"
// @Success  200   {object}  xresponse.Response
// @Router   /psi/stock-out-orders [post]
func (h *StockIOHandler) CreateOut(c *gin.Context) {
	var req service.CreateStockOutRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	o, err := h.svc.CreateOut(c.Request.Context(), &req, operatorID(c))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, o)
}

// ListOut 其他出库单列表
// @Summary  其他出库单列表
// @Tags     进销存-库存管理
// @Produce  json
// @Security BearerAuth
// @Param    page          query  int     false  "页码"
// @Param    page_size     query  int     false  "每页条数"
// @Param    warehouse_id  query  int     false  "仓库ID"
// @Param    biz_type      query  string  false  "子类型"
// @Success  200  {object}  xresponse.Response
// @Router   /psi/stock-out-orders [get]
func (h *StockIOHandler) ListOut(c *gin.Context) {
	p := syservice.GetPagination(c)
	warehouseID, _ := strconv.ParseUint(c.DefaultQuery("warehouse_id", "0"), 10, 64)
	bizType := c.Query("biz_type")
	list, total, err := h.svc.ListOut(c.Request.Context(), p.Page, p.PageSize, uint(warehouseID), bizType)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}

// GetOutByID 其他出库单详情(含明细)
// @Summary  其他出库单详情
// @Tags     进销存-库存管理
// @Produce  json
// @Security BearerAuth
// @Param    id  path  int  true  "出库单ID"
// @Success  200  {object}  xresponse.Response
// @Router   /psi/stock-out-orders/{id} [get]
func (h *StockIOHandler) GetOutByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: id 无效")
		return
	}
	o, err := h.svc.GetOutByID(c.Request.Context(), uint(id))
	if err != nil {
		response.Fail(c, errcode.ErrStockIONotFound, err.Error())
		return
	}
	response.OK(c, o)
}
