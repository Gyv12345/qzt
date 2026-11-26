package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/module/mall/service"
	syserrcode "qzt-go-server/internal/module/system/errcode"
	response "qzt-go-server/pkg/xresponse"
)

// promotion.go 限时特价 handler(管理端 CRUD)。
// 生效逻辑在 service:公开商品 DTO 展示活动价、下单计价覆盖为活动价,
// 两处共用同一「当前生效最低价」查询,展示价=成交价。

// PromotionHandler 限时特价 handler。
type PromotionHandler struct {
	svc *service.PromotionService
}

// NewPromotionHandler 构造。
func NewPromotionHandler() *PromotionHandler {
	return &PromotionHandler{svc: service.NewPromotionService()}
}

// AdminList 活动列表
// @Summary  限时特价分页列表
// @Description  后台活动分页,支持状态/商品ID/名称关键字筛选
// @Tags     商城管理
// @Produce  json
// @Param    page        query  int     false  "页码"
// @Param    page_size   query  int     false  "每页条数"
// @Param    status      query  int     false  "状态(1启用 2停用,0全部)"
// @Param    product_id  query  int     false  "商品ID"
// @Param    keyword     query  string  false  "活动名关键字"
// @Success  200  {object}  xresponse.Response
// @Router   /mall/admin/promotions [get]
func (h *PromotionHandler) AdminList(c *gin.Context) {
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
	productID, _ := strconv.ParseUint(c.Query("product_id"), 10, 64)
	list, total, err := h.svc.AdminList(c.Request.Context(), page, pageSize, status, c.Query("keyword"), uint(productID))
	if err != nil {
		response.Fail(c, syserrcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}

// AdminCreate 创建活动
// @Summary  创建限时特价
// @Description  指定商品与活动价及时间窗;生效期间商品在商城展示并按活动价成交(同商品多条活动取最低)
// @Tags     商城管理
// @Accept   json
// @Produce  json
// @Param    body  body  service.PromotionCreateRequest  true  "创建请求"
// @Success  200  {object}  xresponse.Response
// @Router   /mall/admin/promotions [post]
func (h *PromotionHandler) AdminCreate(c *gin.Context) {
	var req service.PromotionCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, syserrcode.ErrParam, "参数错误:"+err.Error())
		return
	}
	promo, err := h.svc.AdminCreate(c.Request.Context(), &req)
	if err != nil {
		response.Fail(c, syserrcode.ErrServer, err.Error())
		return
	}
	response.OK(c, promo)
}

// AdminUpdate 更新活动
// @Summary  更新限时特价(半增量)
// @Description  只更新传入字段;status=2 停用后活动价立即失效
// @Tags     商城管理
// @Accept   json
// @Produce  json
// @Param    id    path  int                          true  "活动ID"
// @Param    body  body  service.PromotionUpdateRequest  true  "更新请求(半增量)"
// @Success  200  {object}  xresponse.Response
// @Router   /mall/admin/promotions/{id} [put]
func (h *PromotionHandler) AdminUpdate(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, syserrcode.ErrParam, "参数错误")
		return
	}
	var req service.PromotionUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, syserrcode.ErrParam, "参数错误:"+err.Error())
		return
	}
	promo, err := h.svc.AdminUpdate(c.Request.Context(), uint(id), &req)
	if err != nil {
		response.Fail(c, syserrcode.ErrServer, err.Error())
		return
	}
	response.OK(c, promo)
}

// AdminDelete 删除活动
// @Summary  删除限时特价
// @Description  软删活动;历史订单价格快照不受影响
// @Tags     商城管理
// @Produce  json
// @Param    id  path  int  true  "活动ID"
// @Success  200  {object}  xresponse.Response
// @Router   /mall/admin/promotions/{id} [delete]
func (h *PromotionHandler) AdminDelete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, syserrcode.ErrParam, "参数错误")
		return
	}
	if err := h.svc.AdminDelete(c.Request.Context(), uint(id)); err != nil {
		response.Fail(c, syserrcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}
