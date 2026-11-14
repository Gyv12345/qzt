package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/module/storefront/service"
	syserrcode "qzt-go-server/internal/module/system/errcode"
	response "qzt-go-server/pkg/xresponse"
)

// ProductHandler 独立站商品 handler(公开浏览 + 管理端维护)。
type ProductHandler struct {
	svc *service.ProductService
}

// NewProductHandler 构造。
func NewProductHandler() *ProductHandler {
	return &ProductHandler{svc: service.NewProductService()}
}

// queryLocale 语言参数:默认 en。
func queryLocale(c *gin.Context) string {
	if loc := c.Query("locale"); loc != "" {
		return loc
	}
	return "en"
}

// pageParams 分页参数:page 默认 1,size 默认 20 上限 100。
func pageParams(c *gin.Context) (page, size int) {
	page, _ = strconv.Atoi(c.DefaultQuery("page", "1"))
	size, _ = strconv.Atoi(c.DefaultQuery("page_size", "20"))
	if page < 1 {
		page = 1
	}
	if size < 1 {
		size = 20
	}
	if size > 100 {
		size = 100
	}
	return page, size
}

// ── 公开(免鉴权) ──

// PublicProducts 商品列表(公开)
// @Summary  独立站商品列表(公开)
// @Description  上架商品按 sort 升序;已按 locale 填充翻译(缺失回落主语言 en);价格直标价优先,否则 CRM 标价(CNY)× 汇率折算;不含成本价,免鉴权
// @Tags     独立站公开
// @Produce  json
// @Param    locale  query  string  false  "语言代码(默认 en)"
// @Success  200  {object}  xresponse.Response
// @Router   /storefront/public/products [get]
func (h *ProductHandler) PublicProducts(c *gin.Context) {
	list, err := h.svc.PublicProducts(c.Request.Context(), queryLocale(c))
	if err != nil {
		response.Fail(c, syserrcode.ErrServer, err.Error())
		return
	}
	response.OK(c, list)
}

// PublicProductDetail 商品详情(公开,凭 slug)
// @Summary  独立站商品详情(公开)
// @Description  按 URL 别名查商品,附规格列表与全仓库存汇总("有货/无货"参考),免鉴权
// @Tags     独立站公开
// @Produce  json
// @Param    slug    path  string  true   "URL 别名"
// @Param    locale  query  string  false  "语言代码(默认 en)"
// @Success  200  {object}  xresponse.Response
// @Router   /storefront/public/products/{slug} [get]
func (h *ProductHandler) PublicProductDetail(c *gin.Context) {
	dto, err := h.svc.PublicProductDetail(c.Request.Context(), c.Param("slug"), queryLocale(c))
	if err != nil {
		response.Fail(c, syserrcode.ErrNotFound, err.Error())
		return
	}
	response.OK(c, dto)
}

// ── 管理端(JWT + Casbin) ──

// AdminList 商品列表(管理)
// @Summary  独立站商品列表(管理)
// @Description  分页查询上架位(含 CRM 名称/标价/状态与翻译完整度 locales_done)
// @Tags     独立站管理
// @Produce  json
// @Param    page       query  int     false  "页码(默认 1)"
// @Param    page_size  query  int     false  "每页条数(默认 20,上限 100)"
// @Param    keyword    query  string  false  "slug 关键字"
// @Param    locale     query  string  false  "语言代码(默认 en,决定 name/description 取哪语言)"
// @Security BearerAuth
// @Success  200  {object}  xresponse.Response
// @Router   /storefront/products [get]
func (h *ProductHandler) AdminList(c *gin.Context) {
	page, size := pageParams(c)
	list, total, err := h.svc.AdminList(c.Request.Context(), c.Query("keyword"), queryLocale(c), page, size)
	if err != nil {
		response.Fail(c, syserrcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}

// AdminGet 商品详情(管理)
// @Summary  独立站商品详情(管理)
// @Description  含全语言翻译 translations(供编辑表单回填)与请求语言的 description
// @Tags     独立站管理
// @Produce  json
// @Param    id      path  int     true  "上架位ID"
// @Param    locale  query  string  false  "语言代码(默认 en)"
// @Security BearerAuth
// @Success  200  {object}  xresponse.Response
// @Router   /storefront/products/{id} [get]
func (h *ProductHandler) AdminGet(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, syserrcode.ErrParam, "参数错误")
		return
	}
	dto, err := h.svc.AdminGet(c.Request.Context(), uint(id), queryLocale(c))
	if err != nil {
		response.Fail(c, syserrcode.ErrNotFound, err.Error())
		return
	}
	response.OK(c, dto)
}

// AdminUpsert 新增/更新商品上架位
// @Summary  独立站商品新增/更新(管理)
// @Description  部分字段更新语义;创建走 POST /storefront/products 或 PUT /storefront/products/0(id=0);价格 null=清除改按汇率折算
// @Tags     独立站管理
// @Accept   json
// @Produce  json
// @Param    id    path  int                          false  "上架位ID(仅 PUT;0=新增)"
// @Param    body  body  service.AdminUpsertRequest  true  "上架位与翻译"
// @Security BearerAuth
// @Success  200  {object}  xresponse.Response
// @Router   /storefront/products/{id} [put]
// @Router   /storefront/products [post]
func (h *ProductHandler) AdminUpsert(c *gin.Context) {
	var id uint64
	if param := c.Param("id"); param != "" {
		var err error
		id, err = strconv.ParseUint(param, 10, 64)
		if err != nil {
			response.Fail(c, syserrcode.ErrParam, "参数错误")
			return
		}
	}
	var req service.AdminUpsertRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, syserrcode.ErrParam, "参数错误:"+err.Error())
		return
	}
	req.ID = uint(id)
	newID, err := h.svc.AdminUpsert(c.Request.Context(), &req)
	if err != nil {
		response.Fail(c, syserrcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"id": newID})
}
