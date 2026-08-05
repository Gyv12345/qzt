package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/middleware"
	"qzt-go-server/internal/module/api/service"
	"qzt-go-server/internal/module/system/errcode"
	response "qzt-go-server/pkg/xresponse"
)

// DashboardHandler 仪表盘报表。
type DashboardHandler struct {
	svc *service.DashboardService
}

func NewDashboardHandler() *DashboardHandler {
	return &DashboardHandler{svc: service.NewDashboardService()}
}

// Overview 核心指标
// @Summary      首页核心指标
// @Description  客户/商机/合同/回款/待办/库存预警 计数
// @Tags         仪表盘
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object}  xresponse.Response
// @Router       /api/dashboard/overview [get]
func (h *DashboardHandler) Overview(c *gin.Context) {
	userID := middleware.GetUserID(c)
	data, err := h.svc.Overview(c.Request.Context(), userID)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, data)
}

// SalesTrend 销售趋势
// @Summary      回款趋势
// @Description  近N天每日回款金额与笔数
// @Tags         仪表盘
// @Produce      json
// @Security     BearerAuth
// @Param        days  query  int  false  "天数(默认30)"
// @Success      200  {object}  xresponse.Response
// @Router       /api/dashboard/sales-trend [get]
func (h *DashboardHandler) SalesTrend(c *gin.Context) {
	days, _ := strconv.Atoi(c.DefaultQuery("days", "30"))
	rows, err := h.svc.SalesTrend(c.Request.Context(), days)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, rows)
}

// CustomerDistribution 客户分布
// @Summary      客户分布
// @Description  按维度(level/source/industry/status)分组统计客户
// @Tags         仪表盘
// @Produce      json
// @Security     BearerAuth
// @Param        dimension  query  string  false  "维度(level/source/industry/status,默认level)"
// @Success      200  {object}  xresponse.Response
// @Router       /api/dashboard/customer-distribution [get]
func (h *DashboardHandler) CustomerDistribution(c *gin.Context) {
	dimension := c.DefaultQuery("dimension", "level")
	rows, err := h.svc.CustomerDistribution(c.Request.Context(), dimension)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, rows)
}

// OpportunityFunnel 商机漏斗
// @Summary      商机漏斗
// @Description  按阶段分组统计商机数量与金额
// @Tags         仪表盘
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object}  xresponse.Response
// @Router       /api/dashboard/opportunity-funnel [get]
func (h *DashboardHandler) OpportunityFunnel(c *gin.Context) {
	rows, err := h.svc.OpportunityFunnel(c.Request.Context())
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, rows)
}

// FinanceSummary 财务概览
// @Summary      财务概览
// @Description  按日期范围统计采购额/销售额/回款额
// @Tags         仪表盘
// @Produce      json
// @Security     BearerAuth
// @Param        start_date  query  string  false  "开始日期(yyyy-MM-dd)"
// @Param        end_date    query  string  false  "结束日期(yyyy-MM-dd)"
// @Success      200  {object}  xresponse.Response
// @Router       /api/dashboard/finance-summary [get]
func (h *DashboardHandler) FinanceSummary(c *gin.Context) {
	start := c.Query("start_date")
	end := c.Query("end_date")
	data, err := h.svc.FinanceSummary(c.Request.Context(), start, end)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, data)
}

// ── BI 扩展接口 ──

// ContractTrend 近N月合同签约趋势
// @Summary  合同签约趋势
// @Tags     仪表盘
// @Produce  json
// @Security BearerAuth
// @Param    months  query  int  false  "月数(默认6)"
// @Success  200  {object}  xresponse.Response
// @Router   /api/dashboard/contract-trend [get]
func (h *DashboardHandler) ContractTrend(c *gin.Context) {
	months, _ := strconv.Atoi(c.DefaultQuery("months", "6"))
	data, err := h.svc.ContractTrend(c.Request.Context(), months)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, data)
}

// SalesRanking 销售业绩排行
func (h *DashboardHandler) SalesRanking(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	data, err := h.svc.SalesRanking(c.Request.Context(), limit)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, data)
}

// LeadSourceDistribution 线索来源分布
func (h *DashboardHandler) LeadSourceDistribution(c *gin.Context) {
	data, err := h.svc.LeadSourceDistribution(c.Request.Context())
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, data)
}

// EmployeeDistribution 员工分布
func (h *DashboardHandler) EmployeeDistribution(c *gin.Context) {
	dim := c.DefaultQuery("dimension", "department")
	data, err := h.svc.EmployeeDistribution(c.Request.Context(), dim)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, data)
}

// HeadcountTrend 入职趋势
func (h *DashboardHandler) HeadcountTrend(c *gin.Context) {
	months, _ := strconv.Atoi(c.DefaultQuery("months", "6"))
	data, err := h.svc.HeadcountTrend(c.Request.Context(), months)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, data)
}

// AttendanceSummary 月度考勤汇总
func (h *DashboardHandler) AttendanceSummary(c *gin.Context) {
	month := c.Query("month")
	data, err := h.svc.AttendanceSummary(c.Request.Context(), month)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, data)
}

// FinanceTrend 收支趋势
func (h *DashboardHandler) FinanceTrend(c *gin.Context) {
	months, _ := strconv.Atoi(c.DefaultQuery("months", "6"))
	data, err := h.svc.FinanceTrend(c.Request.Context(), months)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, data)
}

// StockValueByWarehouse 各仓库库存总值
func (h *DashboardHandler) StockValueByWarehouse(c *gin.Context) {
	data, err := h.svc.StockValueByWarehouse(c.Request.Context())
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, data)
}

// SalesVsPurchase 采购vs销售对比
func (h *DashboardHandler) SalesVsPurchase(c *gin.Context) {
	months, _ := strconv.Atoi(c.DefaultQuery("months", "6"))
	data, err := h.svc.SalesVsPurchase(c.Request.Context(), months)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, data)
}
