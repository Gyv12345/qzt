package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	buyerauth "qzt-go-server/internal/module/mall/buyerauth"
	"qzt-go-server/internal/module/mall/service"
	syserrcode "qzt-go-server/internal/module/system/errcode"
	response "qzt-go-server/pkg/xresponse"
)

// coupon.go 优惠券 handler:公开可领列表 / 买家领取与券包 / 管理端 CRUD。
// 三层:public 免登录;auth 需买家 token;admin 需员工 JWT+Casbin。

// CouponHandler 优惠券 handler。
type CouponHandler struct {
	svc *service.CouponService
}

// NewCouponHandler 构造。
func NewCouponHandler() *CouponHandler { return &CouponHandler{svc: service.NewCouponService()} }

// ── 公开层 ──

// PublicList 可领券列表(公开)
// @Summary  商城可领优惠券列表(公开)
// @Description  启用且在领取时间窗内、尚有余量的优惠券(含满减门槛/面额/剩余量/每人限领);免鉴权
// @Tags     商城公开
// @Produce  json
// @Success  200  {object}  xresponse.Response
// @Router   /mall/public/coupons [get]
func (h *CouponHandler) PublicList(c *gin.Context) {
	list, err := h.svc.PublicList(c.Request.Context())
	if err != nil {
		response.Fail(c, syserrcode.ErrServer, err.Error())
		return
	}
	response.OK(c, list)
}

// ── 买家层(mall 买家 token) ──

// Claim 领取优惠券
// @Summary  商城买家领取优惠券
// @Description  原子扣减余量(claimed<total_count 条件更新),校验每人限领;需买家 token
// @Tags     商城买家
// @Produce  json
// @Param    id  path  int  true  "优惠券ID"
// @Success  200  {object}  xresponse.Response
// @Router   /mall/auth/coupons/{id}/claim [post]
func (h *CouponHandler) Claim(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, syserrcode.ErrParam, "参数错误")
		return
	}
	if err := h.svc.Claim(c.Request.Context(), uint(id), buyerauth.GetBuyerID(c)); err != nil {
		response.Fail(c, syserrcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// MyCoupons 我的券包
// @Summary  商城买家券包
// @Description  当前买家的全部券实例(含状态/券码/面额/门槛/使用订单号);需买家 token
// @Tags     商城买家
// @Produce  json
// @Success  200  {object}  xresponse.Response
// @Router   /mall/auth/coupons [get]
func (h *CouponHandler) MyCoupons(c *gin.Context) {
	list, err := h.svc.MyCoupons(c.Request.Context(), buyerauth.GetBuyerID(c))
	if err != nil {
		response.Fail(c, syserrcode.ErrServer, err.Error())
		return
	}
	response.OK(c, list)
}

// ── 管理层(员工 JWT + 操作日志 + Casbin) ──

// AdminList 优惠券列表
// @Summary  优惠券分页列表
// @Description  后台优惠券分页(含已领取数/发放总量),支持状态与名称关键字筛选
// @Tags     商城管理
// @Produce  json
// @Param    page       query  int     false  "页码"
// @Param    page_size  query  int     false  "每页条数"
// @Param    status     query  int     false  "状态(1启用 2停用,0全部)"
// @Param    keyword    query  string  false  "券名关键字"
// @Success  200  {object}  xresponse.Response
// @Router   /mall/admin/coupons [get]
func (h *CouponHandler) AdminList(c *gin.Context) {
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
	list, total, err := h.svc.AdminList(c.Request.Context(), page, pageSize, status, c.Query("keyword"))
	if err != nil {
		response.Fail(c, syserrcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}

// AdminCreate 创建优惠券
// @Summary  创建优惠券
// @Description  创建券模板(满减门槛/面额/总量/每人限领/生效窗口);启用状态可直接被买家领取
// @Tags     商城管理
// @Accept   json
// @Produce  json
// @Param    body  body  service.CouponCreateRequest  true  "创建请求"
// @Success  200  {object}  xresponse.Response
// @Router   /mall/admin/coupons [post]
func (h *CouponHandler) AdminCreate(c *gin.Context) {
	var req service.CouponCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, syserrcode.ErrParam, "参数错误:"+err.Error())
		return
	}
	coupon, err := h.svc.AdminCreate(c.Request.Context(), &req)
	if err != nil {
		response.Fail(c, syserrcode.ErrServer, err.Error())
		return
	}
	response.OK(c, coupon)
}

// AdminUpdate 更新优惠券
// @Summary  更新优惠券(半增量)
// @Description  只更新传入字段;status=2 停用后买家不可领不可用;窗口传 "" 清除(=不限)
// @Tags     商城管理
// @Accept   json
// @Produce  json
// @Param    id    path  int                        true  "优惠券ID"
// @Param    body  body  service.CouponUpdateRequest  true  "更新请求(半增量)"
// @Success  200  {object}  xresponse.Response
// @Router   /mall/admin/coupons/{id} [put]
func (h *CouponHandler) AdminUpdate(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, syserrcode.ErrParam, "参数错误")
		return
	}
	var req service.CouponUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, syserrcode.ErrParam, "参数错误:"+err.Error())
		return
	}
	coupon, err := h.svc.AdminUpdate(c.Request.Context(), uint(id), &req)
	if err != nil {
		response.Fail(c, syserrcode.ErrServer, err.Error())
		return
	}
	response.OK(c, coupon)
}

// AdminDelete 删除优惠券
// @Summary  删除优惠券
// @Description  软删券模板(已发出的券实例保留历史,但买家不可再领)
// @Tags     商城管理
// @Produce  json
// @Param    id  path  int  true  "优惠券ID"
// @Success  200  {object}  xresponse.Response
// @Router   /mall/admin/coupons/{id} [delete]
func (h *CouponHandler) AdminDelete(c *gin.Context) {
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
