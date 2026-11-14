package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/module/crm/service"
	"qzt-go-server/internal/module/system/errcode"
	response "qzt-go-server/pkg/xresponse"
)

// ProductCategoryHandler 产品分类树管理。
type ProductCategoryHandler struct {
	svc *service.ProductCategoryService
}

func NewProductCategoryHandler() *ProductCategoryHandler {
	return &ProductCategoryHandler{svc: service.NewProductCategoryService()}
}

// Tree 分类树
// @Summary  产品分类树
// @Description  全量内存组树,sort 升序;include_disabled=true 时含停用节点(默认只回启用)
// @Tags     产品分类管理
// @Produce  json
// @Security BearerAuth
// @Param    include_disabled  query  bool  false  "是否包含停用分类(默认false)"
// @Success  200  {object}  xresponse.Response
// @Router   /crm/product-categories/tree [get]
func (h *ProductCategoryHandler) Tree(c *gin.Context) {
	includeDisabled := c.Query("include_disabled") == "true" || c.Query("include_disabled") == "1"
	tree, err := h.svc.Tree(c.Request.Context(), includeDisabled)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, tree)
}

// Create 新增分类
// @Summary  新增产品分类
// @Tags     产品分类管理
// @Accept   json
// @Produce  json
// @Security BearerAuth
// @Param    body  body      service.ProductCategoryCreateRequest  true  "新增分类请求"
// @Success  200   {object}  xresponse.Response
// @Router   /crm/product-categories [post]
func (h *ProductCategoryHandler) Create(c *gin.Context) {
	var req service.ProductCategoryCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	n, err := h.svc.Create(c.Request.Context(), &req)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, n)
}

// Update 更新分类
// @Summary  更新产品分类
// @Description  改名不回写商品数据(crm_product.category 存量不动);换父会拒绝落入自身子树
// @Tags     产品分类管理
// @Accept   json
// @Produce  json
// @Security BearerAuth
// @Param    id    path      int  true  "分类ID"
// @Param    body  body      service.ProductCategoryUpdateRequest  true  "更新分类请求"
// @Success  200   {object}  xresponse.Response
// @Router   /crm/product-categories/{id} [put]
func (h *ProductCategoryHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	var req service.ProductCategoryUpdateRequest
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

// Delete 删除分类
// @Summary  删除产品分类
// @Description  有子节点拒绝删;商品引用不阻断删除,引用数在返回 notice 里提示
// @Tags     产品分类管理
// @Produce  json
// @Security BearerAuth
// @Param    id  path      int  true  "分类ID"
// @Success  200  {object}  xresponse.Response
// @Router   /crm/product-categories/{id} [delete]
func (h *ProductCategoryHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	notice, err := h.svc.Delete(c.Request.Context(), uint(id))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"notice": notice})
}

// PublicTree 分类树(公开)
// @Summary  产品分类树(公开)
// @Description  免鉴权,只回启用的分类节点,官网按叶子名筛选商品用
// @Tags     CMS公开
// @Produce  json
// @Success  200  {object}  xresponse.Response
// @Router   /crm/public/product-categories [get]
func (h *ProductCategoryHandler) PublicTree(c *gin.Context) {
	tree, err := h.svc.PublicTree(c.Request.Context())
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, tree)
}
