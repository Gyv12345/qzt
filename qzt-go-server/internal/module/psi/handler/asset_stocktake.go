package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/middleware"
	"qzt-go-server/internal/module/psi/service"
	"qzt-go-server/internal/module/system/errcode"
	syservice "qzt-go-server/internal/module/system/service"
	response "qzt-go-server/pkg/xresponse"
)

// asset_stocktake.go 资产盘点 handler。

type AssetStocktakeHandler struct {
	svc *service.AssetStocktakeService
}

func NewAssetStocktakeHandler() *AssetStocktakeHandler {
	return &AssetStocktakeHandler{svc: service.NewAssetStocktakeService()}
}

// Create 创建资产盘点单
// @Summary      创建资产盘点单
// @Description  按范围(all/category/dept)冻结在盘资产明细快照,范围内无可盘资产时报错
// @Tags         资产盘点
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body  service.CreateAssetStocktakeRequest  true  "盘点单"
// @Success      200  {object}  xresponse.Response
// @Router       /psi/assets/stocktakes [post]
func (h *AssetStocktakeHandler) Create(c *gin.Context) {
	var req service.CreateAssetStocktakeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	order, err := h.svc.Create(c.Request.Context(), &req, middleware.GetUserID(c))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, order)
}

// List 资产盘点单列表
// @Summary      资产盘点单列表
// @Tags         资产盘点
// @Produce      json
// @Security     BearerAuth
// @Param        page       query  int     false  "页码"
// @Param        page_size  query  int     false  "每页条数"
// @Param        status     query  int     false  "状态(1进行中 2已完成)"
// @Success      200  {object}  xresponse.Response
// @Router       /psi/assets/stocktakes [get]
func (h *AssetStocktakeHandler) List(c *gin.Context) {
	p := syservice.GetPagination(c)
	status, _ := strconv.Atoi(c.DefaultQuery("status", "0"))
	list, total, err := h.svc.List(c.Request.Context(), p.Page, p.PageSize, int8(status))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}

// GetByID 资产盘点单详情(头+全部明细)
// @Summary      资产盘点单详情
// @Tags         资产盘点
// @Produce      json
// @Security     BearerAuth
// @Param        id  path  int  true  "盘点单ID"
// @Success      200  {object}  xresponse.Response
// @Router       /psi/assets/stocktakes/{id} [get]
func (h *AssetStocktakeHandler) GetByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	detail, err := h.svc.GetByID(c.Request.Context(), uint(id))
	if err != nil {
		response.Fail(c, errcode.ErrNotFound, err.Error())
		return
	}
	response.OK(c, detail)
}

// SubmitItem 填报盘点明细结果
// @Summary      填报盘点明细结果
// @Description  仅进行中的盘点单可填报;首次填报该明细时盘点单已盘数+1,重复改结果不重复加
// @Tags         资产盘点
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id      path  int  true  "盘点单ID"
// @Param        itemId  path  int  true  "明细ID"
// @Param        body    body  service.SubmitAssetStocktakeItemRequest  true  "盘点结果"
// @Success      200  {object}  xresponse.Response
// @Router       /psi/assets/stocktakes/{id}/items/{itemId} [put]
func (h *AssetStocktakeHandler) SubmitItem(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	itemID, err := strconv.ParseUint(c.Param("itemId"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	var req service.SubmitAssetStocktakeItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	if err := h.svc.SubmitItem(c.Request.Context(), uint(id), uint(itemID), &req, middleware.GetUserID(c)); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// Finish 完成资产盘点
// @Summary      完成资产盘点
// @Description  全部明细已盘才允许;完成后缺失资产置丢失、损坏资产置维修,返回差异统计
// @Tags         资产盘点
// @Produce      json
// @Security     BearerAuth
// @Param        id  path  int  true  "盘点单ID"
// @Success      200  {object}  xresponse.Response
// @Router       /psi/assets/stocktakes/{id}/finish [post]
func (h *AssetStocktakeHandler) Finish(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	stats, err := h.svc.Finish(c.Request.Context(), uint(id))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, stats)
}
