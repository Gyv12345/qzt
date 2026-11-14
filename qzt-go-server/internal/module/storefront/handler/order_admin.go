package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/module/storefront/service"
	syserrcode "qzt-go-server/internal/module/system/errcode"
	response "qzt-go-server/pkg/xresponse"
)

// OrderAdminHandler 独立站订单管理 handler(JWT + Casbin)。
type OrderAdminHandler struct {
	svc *service.OrderAdminService
}

// NewOrderAdminHandler 构造。
func NewOrderAdminHandler() *OrderAdminHandler {
	return &OrderAdminHandler{svc: service.NewOrderAdminService()}
}

// AdminList 订单列表(管理)
// @Summary  独立站订单列表(管理)
// @Description  分页查询独立站订单,主单+明细嵌套返回;status 筛选(1待支付/2已支付/3已取消/4已过期),keyword 匹配订单号/买家邮箱/姓名/Session ID
// @Tags     独立站管理
// @Produce  json
// @Param    page       query  int     false  "页码(默认 1)"
// @Param    page_size  query  int     false  "每页条数(默认 20,上限 100)"
// @Param    status     query  int     false  "状态筛选(1待支付 2已支付 3已取消 4已过期)"
// @Param    keyword    query  string  false  "订单号/买家邮箱/姓名/Session ID 关键字"
// @Security BearerAuth
// @Success  200  {object}  xresponse.Response
// @Router   /storefront/orders [get]
func (h *OrderAdminHandler) AdminList(c *gin.Context) {
	page, size := pageParams(c)
	var status *int8
	if raw := c.Query("status"); raw != "" {
		v, err := strconv.ParseInt(raw, 10, 8)
		if err != nil || v < 1 || v > 4 {
			response.Fail(c, syserrcode.ErrParam, "状态参数不正确")
			return
		}
		sv := int8(v)
		status = &sv
	}
	list, total, err := h.svc.List(c.Request.Context(), page, size, status, c.Query("keyword"))
	if err != nil {
		response.Fail(c, syserrcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}

// AdminGet 订单详情(管理)
// @Summary  独立站订单详情(管理)
// @Description  主单 + 明细嵌套返回,含支付通道回填的买家信息与 PSI 销售单号
// @Tags     独立站管理
// @Produce  json
// @Param    id  path  int  true  "订单ID"
// @Security BearerAuth
// @Success  200  {object}  xresponse.Response
// @Router   /storefront/orders/{id} [get]
func (h *OrderAdminHandler) AdminGet(c *gin.Context) {
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
