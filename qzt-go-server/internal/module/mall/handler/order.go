package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	syserrcode "qzt-go-server/internal/module/system/errcode"
	"qzt-go-server/internal/module/mall/service"
	response "qzt-go-server/pkg/xresponse"
)

// OrderHandler 商城订单 handler(公开下单 + 后台管理)。
type OrderHandler struct {
	svc *service.MallService
}

// NewOrderHandler 构造。
func NewOrderHandler() *OrderHandler {
	return &OrderHandler{svc: service.NewMallService()}
}

// ── 公开(免鉴权) ──

// PublicGoods 商城商品列表(公开)
// @Summary  商城商品列表(公开)
// @Description  全部上架商品(crm_product status=1,不含成本价,附全仓库存汇总),免鉴权
// @Tags     商城公开
// @Produce  json
// @Success  200  {object}  xresponse.Response
// @Router   /mall/public/goods [get]
func (h *OrderHandler) PublicGoods(c *gin.Context) {
	list, err := h.svc.PublicGoods(c.Request.Context())
	if err != nil {
		response.Fail(c, syserrcode.ErrServer, err.Error())
		return
	}
	response.OK(c, list)
}

// PublicCreateOrder 商城下单(公开)
// @Summary  商城下单(公开)
// @Description  免登录下单:校验上架商品、按 standard_price 快照计价;自动创建/复用散客客户并生成 PSI 销售单(无默认仓库时跳过,后台可补生成)。每 IP 每分钟限 5 单
// @Tags     商城公开
// @Accept   json
// @Produce  json
// @Param    body  body  service.CreateOrderRequest  true  "下单请求"
// @Success  200  {object}  xresponse.Response
// @Router   /mall/public/orders [post]
func (h *OrderHandler) PublicCreateOrder(c *gin.Context) {
	var req service.CreateOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, syserrcode.ErrParam, "参数错误:"+err.Error())
		return
	}
	if !h.svc.RateLimitOK(c.Request.Context(), c.ClientIP()) {
		response.Fail(c, syserrcode.ErrServer, "下单过于频繁,请稍后再试")
		return
	}
	result, err := h.svc.CreateOrder(c.Request.Context(), &req)
	if err != nil {
		response.Fail(c, syserrcode.ErrServer, err.Error())
		return
	}
	response.OK(c, result)
}

// PublicGetOrder 订单查询(公开,凭订单号)
// @Summary  商城订单查询(公开)
// @Description  凭订单号查询订单状态与明细,免鉴权
// @Tags     商城公开
// @Produce  json
// @Param    orderNo  path  string  true  "订单号"
// @Success  200  {object}  xresponse.Response
// @Router   /mall/public/orders/{orderNo} [get]
func (h *OrderHandler) PublicGetOrder(c *gin.Context) {
	dto, err := h.svc.GetByOrderNo(c.Request.Context(), c.Param("orderNo"))
	if err != nil {
		response.Fail(c, syserrcode.ErrNotFound, err.Error())
		return
	}
	response.OK(c, dto)
}

// ── 后台管理 ──

// List 订单列表
// @Summary  商城订单列表
// @Description  分页查询商城订单,支持状态筛选与关键字(单号/联系人/手机)
// @Tags     商城管理
// @Produce  json
// @Param    page       query  int     false  "页码"
// @Param    page_size  query  int     false  "每页条数"
// @Param    status     query  int     false  "状态(1待处理 2已确认 3已完成 4已取消,0全部)"
// @Param    keyword    query  string  false  "关键字"
// @Success  200  {object}  xresponse.Response
// @Router   /mall/orders [get]
func (h *OrderHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 10
	}
	var status *int8
	if s, err := strconv.Atoi(c.Query("status")); err == nil && s > 0 {
		v := int8(s)
		status = &v
	}
	list, total, err := h.svc.List(c.Request.Context(), page, pageSize, status, c.Query("keyword"))
	if err != nil {
		response.Fail(c, syserrcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}

// GetByID 订单详情
// @Summary  商城订单详情
// @Description  订单详情含明细、客户名与关联销售单号
// @Tags     商城管理
// @Produce  json
// @Param    id  path  int  true  "订单ID"
// @Success  200  {object}  xresponse.Response
// @Router   /mall/orders/{id} [get]
func (h *OrderHandler) GetByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, syserrcode.ErrParam, "参数错误")
		return
	}
	dto, err := h.svc.GetByID(c.Request.Context(), uint(id))
	if err != nil {
		response.Fail(c, syserrcode.ErrNotFound, err.Error())
		return
	}
	response.OK(c, dto)
}

// UpdateStatusBody 状态流转请求。
type UpdateStatusBody struct {
	// 1待处理 2已确认 3已完成 4已取消
	Status int8 `json:"status" binding:"required"`
}

// UpdateStatus 状态流转
// @Summary  商城订单状态流转
// @Description  确认/完成/取消订单;取消时同步关闭未出库的关联 PSI 销售单
// @Tags     商城管理
// @Accept   json
// @Produce  json
// @Param    id    path  int                     true  "订单ID"
// @Param    body  body  handler.UpdateStatusBody  true  "目标状态"
// @Success  200  {object}  xresponse.Response
// @Router   /mall/orders/{id}/status [put]
func (h *OrderHandler) UpdateStatus(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, syserrcode.ErrParam, "参数错误")
		return
	}
	var body UpdateStatusBody
	if err := c.ShouldBindJSON(&body); err != nil {
		response.Fail(c, syserrcode.ErrParam, "参数错误")
		return
	}
	if err := h.svc.UpdateStatus(c.Request.Context(), uint(id), body.Status); err != nil {
		response.Fail(c, syserrcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// GenerateSalesOrderBody 手动生成销售单请求。
type GenerateSalesOrderBody struct {
	WarehouseID uint `json:"warehouse_id" binding:"required"`
}

// GenerateSalesOrder 手动生成 PSI 销售单
// @Summary  商城订单手动生成销售单
// @Description  对未自动生成销售单的订单(下单时无默认仓库),选择仓库补生成 PSI 销售单
// @Tags     商城管理
// @Accept   json
// @Produce  json
// @Param    id    path  int                          true  "订单ID"
// @Param    body  body  handler.GenerateSalesOrderBody  true  "仓库ID"
// @Success  200  {object}  xresponse.Response
// @Router   /mall/orders/{id}/generate-sales-order [post]
func (h *OrderHandler) GenerateSalesOrder(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, syserrcode.ErrParam, "参数错误")
		return
	}
	var body GenerateSalesOrderBody
	if err := c.ShouldBindJSON(&body); err != nil {
		response.Fail(c, syserrcode.ErrParam, "参数错误")
		return
	}
	salesNo, err := h.svc.GenerateSalesOrder(c.Request.Context(), uint(id), body.WarehouseID)
	if err != nil {
		response.Fail(c, syserrcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"sales_order_no": salesNo})
}
