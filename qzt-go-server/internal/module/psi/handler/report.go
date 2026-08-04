package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/module/psi/errcode"
	"qzt-go-server/internal/module/psi/service"
	response "qzt-go-server/pkg/xresponse"
)

// report.go 进销存报表 handler(只读,authenticated 层)。

// ReportHandler 报表。
type ReportHandler struct {
	svc *service.ReportService
}

func NewReportHandler() *ReportHandler {
	return &ReportHandler{svc: service.NewReportService()}
}

// SalesRanking 商品销量排行
// @Summary  商品销量排行
// @Tags     进销存-报表
// @Produce  json
// @Security BearerAuth
// @Param    warehouse_id  query  int     false  "仓库ID"
// @Param    start_date    query  string  false  "开始日期"
// @Param    end_date      query  string  false  "结束日期"
// @Param    limit         query  int     false  "返回条数(默认20)"
// @Success  200  {object}  xresponse.Response
// @Router   /psi/reports/sales-ranking [get]
func (h *ReportHandler) SalesRanking(c *gin.Context) {
	warehouseID, _ := strconv.ParseUint(c.DefaultQuery("warehouse_id", "0"), 10, 64)
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	list, err := h.svc.SalesRanking(c.Request.Context(), uint(warehouseID), startDate, endDate, limit)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, list)
}

// PurchaseSummary 采购汇总
// @Summary  采购汇总
// @Tags     进销存-报表
// @Produce  json
// @Security BearerAuth
// @Param    start_date  query  string  false  "开始日期"
// @Param    end_date    query  string  false  "结束日期"
// @Success  200  {object}  xresponse.Response
// @Router   /psi/reports/purchase-summary [get]
func (h *ReportHandler) PurchaseSummary(c *gin.Context) {
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")
	list, err := h.svc.PurchaseSummary(c.Request.Context(), startDate, endDate)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, list)
}
