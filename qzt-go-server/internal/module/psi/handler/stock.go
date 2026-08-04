package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/module/psi/errcode"
	"qzt-go-server/internal/module/psi/service"
	syservice "qzt-go-server/internal/module/system/service"
	response "qzt-go-server/pkg/xresponse"
)

// stock.go 库存查询 handler:结余列表、收发明细。

// StockHandler 库存查询。
type StockHandler struct {
	svc *service.StockService
}

func NewStockHandler() *StockHandler {
	return &StockHandler{svc: service.NewStockService()}
}

// List 库存结余列表
// @Summary  库存结余列表
// @Tags     进销存-库存管理
// @Produce  json
// @Security BearerAuth
// @Param    page        query  int     false  "页码"
// @Param    page_size   query  int     false  "每页条数"
// @Param    warehouse_id query  int     false  "仓库ID"
// @Param    keyword     query  string  false  "商品名称/编号"
// @Param    low_stock   query  bool    false  "仅查低库存预警"
// @Success  200  {object}  xresponse.Response
// @Router   /psi/stock [get]
func (h *StockHandler) List(c *gin.Context) {
	p := syservice.GetPagination(c)
	warehouseID, _ := strconv.ParseUint(c.DefaultQuery("warehouse_id", "0"), 10, 64)
	keyword := c.Query("keyword")
	lowStock, _ := strconv.ParseBool(c.DefaultQuery("low_stock", "false"))
	list, total, err := h.svc.StockList(c.Request.Context(), p.Page, p.PageSize, uint(warehouseID), keyword, lowStock)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}

// Movements 收发明细
// @Summary  收发明细
// @Tags     进销存-库存管理
// @Produce  json
// @Security BearerAuth
// @Param    page          query  int     false  "页码"
// @Param    page_size     query  int     false  "每页条数"
// @Param    warehouse_id  query  int     false  "仓库ID"
// @Param    product_id    query  int     false  "商品ID"
// @Param    biz_type      query  string  false  "业务类型"
// @Success  200  {object}  xresponse.Response
// @Router   /psi/stock/movements [get]
func (h *StockHandler) Movements(c *gin.Context) {
	p := syservice.GetPagination(c)
	warehouseID, _ := strconv.ParseUint(c.DefaultQuery("warehouse_id", "0"), 10, 64)
	productID, _ := strconv.ParseUint(c.DefaultQuery("product_id", "0"), 10, 64)
	bizType := c.Query("biz_type")
	list, total, err := h.svc.MovementDetail(c.Request.Context(), p.Page, p.PageSize, uint(warehouseID), uint(productID), bizType)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}
