package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/module/crm/service"
	"qzt-go-server/internal/module/system/errcode"
	response "qzt-go-server/pkg/xresponse"
)

// ProductSkuHandler 商品规格 SKU 管理。
type ProductSkuHandler struct {
	svc *service.ProductSkuService
}

func NewProductSkuHandler() *ProductSkuHandler {
	return &ProductSkuHandler{svc: service.NewProductSkuService()}
}

// parseProductSkuID 解析路径中的商品ID与SKU ID。
func parseProductSkuID(c *gin.Context) (uint, uint, bool) {
	productID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "商品ID参数错误")
		return 0, 0, false
	}
	skuID, err := strconv.ParseUint(c.Param("skuId"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "SKU ID参数错误")
		return 0, 0, false
	}
	return uint(productID), uint(skuID), true
}

// List 商品SKU列表
// @Summary  商品SKU列表
// @Tags     商品管理
// @Produce  json
// @Security BearerAuth
// @Param    id  path      int  true  "商品ID"
// @Success  200  {object}  xresponse.Response
// @Router   /crm/products/{id}/skus [get]
func (h *ProductSkuHandler) List(c *gin.Context) {
	productID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "商品ID参数错误")
		return
	}
	list, err := h.svc.ListByProduct(c.Request.Context(), uint(productID))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": len(list)})
}

// Create 新增商品SKU
// @Summary  新增商品SKU
// @Tags     商品管理
// @Accept   json
// @Produce  json
// @Security BearerAuth
// @Param    id    path      int                        true  "商品ID"
// @Param    body  body      service.UpsertSkuRequest   true  "SKU信息"
// @Success  200   {object}  xresponse.Response
// @Router   /crm/products/{id}/skus [post]
func (h *ProductSkuHandler) Create(c *gin.Context) {
	productID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "商品ID参数错误")
		return
	}
	var req service.UpsertSkuRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	sku, err := h.svc.Create(c.Request.Context(), uint(productID), &req)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, sku)
}

// Update 更新商品SKU
// @Summary  更新商品SKU
// @Tags     商品管理
// @Accept   json
// @Produce  json
// @Security BearerAuth
// @Param    id     path      int                        true  "商品ID"
// @Param    skuId  path      int                        true  "SKU ID"
// @Param    body   body      service.UpsertSkuRequest   true  "SKU信息"
// @Success  200    {object}  xresponse.Response
// @Router   /crm/products/{id}/skus/{skuId} [put]
func (h *ProductSkuHandler) Update(c *gin.Context) {
	productID, skuID, ok := parseProductSkuID(c)
	if !ok {
		return
	}
	var req service.UpsertSkuRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	if err := h.svc.Update(c.Request.Context(), productID, skuID, &req); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// Delete 删除商品SKU
// @Summary  删除商品SKU
// @Tags     商品管理
// @Produce  json
// @Security BearerAuth
// @Param    id     path      int  true  "商品ID"
// @Param    skuId  path      int  true  "SKU ID"
// @Success  200    {object}  xresponse.Response
// @Router   /crm/products/{id}/skus/{skuId} [delete]
func (h *ProductSkuHandler) Delete(c *gin.Context) {
	productID, skuID, ok := parseProductSkuID(c)
	if !ok {
		return
	}
	if err := h.svc.Delete(c.Request.Context(), productID, skuID); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}
