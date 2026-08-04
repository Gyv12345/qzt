package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/module/crm/service"
	"qzt-go-server/internal/module/system/errcode"
	syservice "qzt-go-server/internal/module/system/service"
	response "qzt-go-server/pkg/xresponse"
)

// ProductHandler 商品管理。
type ProductHandler struct {
	svc *service.ProductService
}

func NewProductHandler() *ProductHandler {
	return &ProductHandler{svc: service.NewProductService()}
}

// ProductPriceHandler 商品多价格(复用同一 ProductService)。
type ProductPriceHandler struct {
	svc *service.ProductService
}

func NewProductPriceHandler() *ProductPriceHandler {
	return &ProductPriceHandler{svc: service.NewProductService()}
}

// Create 创建商品
// @Summary  创建商品
// @Tags     商品管理
// @Accept   json
// @Produce  json
// @Security BearerAuth
// @Param    body  body      service.CreateProductRequest  true  "创建商品请求"
// @Success  200   {object}  xresponse.Response
// @Router   /crm/products [post]
func (h *ProductHandler) Create(c *gin.Context) {
	var req service.CreateProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	p, err := h.svc.Create(c.Request.Context(), &req)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, p)
}

// GetByID 商品详情
// @Summary  商品详情
// @Tags     商品管理
// @Produce  json
// @Security BearerAuth
// @Param    id  path      int  true  "商品ID"
// @Success  200  {object}  xresponse.Response
// @Router   /crm/products/{id} [get]
func (h *ProductHandler) GetByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	p, err := h.svc.GetByID(c.Request.Context(), uint(id))
	if err != nil {
		response.Fail(c, errcode.ErrNotFound, err.Error())
		return
	}
	response.OK(c, p)
}

// Update 更新商品
// @Summary  更新商品
// @Tags     商品管理
// @Accept   json
// @Produce  json
// @Security BearerAuth
// @Param    id    path      int  true  "商品ID"
// @Param    body  body      service.UpdateProductRequest  true  "更新商品请求"
// @Success  200   {object}  xresponse.Response
// @Router   /crm/products/{id} [put]
func (h *ProductHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	var req service.UpdateProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	if err := h.svc.Update(c.Request.Context(), uint(id), &req); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// Delete 删除商品
// @Summary  删除商品
// @Tags     商品管理
// @Produce  json
// @Security BearerAuth
// @Param    id  path      int  true  "商品ID"
// @Success  200  {object}  xresponse.Response
// @Router   /crm/products/{id} [delete]
func (h *ProductHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	if err := h.svc.Delete(c.Request.Context(), uint(id)); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// List 商品列表
// @Summary  商品列表
// @Tags     商品管理
// @Produce  json
// @Security BearerAuth
// @Param    page       query  int     false  "页码(默认1)"
// @Param    page_size  query  int     false  "每页条数(默认10,最大100)"
// @Param    keyword    query  string  false  "商品名称模糊"
// @Param    category   query  string  false  "分类"
// @Param    status     query  int     false  "状态"
// @Success  200  {object}  xresponse.Response
// @Router   /crm/products [get]
func (h *ProductHandler) List(c *gin.Context) {
	p := syservice.GetPagination(c)
	keyword := c.Query("keyword")
	category := c.Query("category")
	status, _ := strconv.Atoi(c.Query("status"))
	list, total, err := h.svc.List(c.Request.Context(), p.Page, p.PageSize, keyword, category, int8(status))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}

// ── 公开(免鉴权)商品接口 ──

// PublicList 上架商品列表(公开)
// @Summary  上架商品列表(公开)
// @Description  返回已上架(status=1)商品分页列表,免鉴权,供官网展示
// @Tags     CMS公开
// @Produce  json
// @Param    page       query  int     false  "页码(默认1)"
// @Param    page_size  query  int     false  "每页条数(默认10,最大100)"
// @Param    keyword    query  string  false  "商品名称/编号模糊"
// @Param    category   query  string  false  "分类"
// @Success  200  {object}  xresponse.Response
// @Router   /crm/public/products [get]
func (h *ProductHandler) PublicList(c *gin.Context) {
	p := syservice.GetPagination(c)
	list, total, err := h.svc.ListPublished(c.Request.Context(), p.Page, p.PageSize, c.Query("keyword"), c.Query("category"))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}

// PublicGetByID 商品详情(公开)
// @Summary  商品详情(公开)
// @Description  返回已上架商品详情(含多价格,不含成本价),免鉴权
// @Tags     CMS公开
// @Produce  json
// @Param    id  path      int  true  "商品ID"
// @Success  200  {object}  xresponse.Response
// @Router   /crm/public/products/{id} [get]
func (h *ProductHandler) PublicGetByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	p, err := h.svc.GetPublishedByID(c.Request.Context(), uint(id))
	if err != nil {
		response.Fail(c, errcode.ErrNotFound, err.Error())
		return
	}
	response.OK(c, p)
}

// ── 商品价格 ──

// CreatePrice 新增商品价格
// @Summary  新增商品价格
// @Tags     商品管理
// @Accept   json
// @Produce  json
// @Security BearerAuth
// @Param    id         path      int  true  "商品ID"
// @Param    body       body      service.CreateProductPriceRequest  true  "创建商品价格请求"
// @Success  200        {object}  xresponse.Response
// @Router   /crm/products/{id}/prices [post]
func (h *ProductPriceHandler) CreatePrice(c *gin.Context) {
	var req service.CreateProductPriceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	productID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	req.ProductID = uint(productID)
	price, err := h.svc.CreatePrice(c.Request.Context(), &req)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, price)
}

// UpdatePrice 更新商品价格
// @Summary  更新商品价格
// @Tags     商品管理
// @Accept   json
// @Produce  json
// @Security BearerAuth
// @Param    id    path      int  true  "价格ID"
// @Param    body  body      service.UpdateProductPriceRequest  true  "更新商品价格请求"
// @Success  200   {object}  xresponse.Response
// @Router   /crm/product-prices/{id} [put]
func (h *ProductPriceHandler) UpdatePrice(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	var req service.UpdateProductPriceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	if err := h.svc.UpdatePrice(c.Request.Context(), uint(id), &req); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// DeletePrice 删除商品价格
// @Summary  删除商品价格
// @Tags     商品管理
// @Produce  json
// @Security BearerAuth
// @Param    id  path      int  true  "价格ID"
// @Success  200  {object}  xresponse.Response
// @Router   /crm/product-prices/{id} [delete]
func (h *ProductPriceHandler) DeletePrice(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	if err := h.svc.DeletePrice(c.Request.Context(), uint(id)); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// ListPricesByProduct 按商品列价格
// @Summary  按商品列价格
// @Tags     商品管理
// @Produce  json
// @Security BearerAuth
// @Param    id         path      int  true  "商品ID"
// @Success  200        {object}  xresponse.Response
// @Router   /crm/products/{id}/prices [get]
func (h *ProductPriceHandler) ListPricesByProduct(c *gin.Context) {
	productID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	list, err := h.svc.ListPricesByProduct(c.Request.Context(), uint(productID))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, list)
}
