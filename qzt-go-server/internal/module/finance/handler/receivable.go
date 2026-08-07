package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/module/finance/service"
	"qzt-go-server/internal/module/system/errcode"
	syservice "qzt-go-server/internal/module/system/service"
	response "qzt-go-server/pkg/xresponse"
)

// receivable.go 应收应付 handler。

type ReceivableHandler struct {
	svc *service.ReceivableService
}

func NewReceivableHandler() *ReceivableHandler {
	return &ReceivableHandler{svc: service.NewReceivableService()}
}

// List 往来款列表
// @Summary      应收应付列表
// @Tags         财务-往来
// @Produce      json
// @Security     BearerAuth
// @Param        page         query  int     false  "页码"
// @Param        page_size    query  int     false  "每页条数"
// @Param        direction    query  string  false  "RECEIVABLE/PAYABLE"
// @Param        party_type   query  string  false  "CUSTOMER/SUPPLIER/EMPLOYEE"
// @Param        party_id     query  int     false  "往来方ID"
// @Param        status       query  int     false  "结算状态(0未结1部分2已结清)"
// @Param        biz_type     query  string  false  "业务类型"
// @Param        keyword      query  string  false  "关键词(往来方/单号)"
// @Success      200  {object}  xresponse.Response
// @Router       /finance/receivables [get]
func (h *ReceivableHandler) List(c *gin.Context) {
	p := syservice.GetPagination(c)
	partyID, _ := strconv.ParseUint(c.Query("party_id"), 10, 64)
	status := int8(-1)
	if v := c.Query("status"); v != "" {
		n, _ := strconv.Atoi(v)
		status = int8(n)
	}
	list, total, err := h.svc.List(c.Request.Context(), p.Page, p.PageSize,
		c.Query("direction"), c.Query("party_type"), uint(partyID), status, c.Query("biz_type"), c.Query("keyword"))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}

// GetByID 详情
// @Summary      往来款详情
// @Tags         财务-往来
// @Produce      json
// @Security     BearerAuth
// @Param        id  path  int  true  "ID"
// @Success      200  {object}  xresponse.Response
// @Router       /finance/receivables/{id} [get]
func (h *ReceivableHandler) GetByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	rec, err := h.svc.GetByID(c.Request.Context(), uint(id))
	if err != nil {
		response.Fail(c, errcode.ErrNotFound, err.Error())
		return
	}
	response.OK(c, rec)
}

// Create 新建往来款
// @Summary      新建应收/应付
// @Tags         财务-往来
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body  service.CreateReceivableRequest  true  "往来款"
// @Success      200  {object}  xresponse.Response
// @Router       /finance/receivables [post]
func (h *ReceivableHandler) Create(c *gin.Context) {
	var req service.CreateReceivableRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	rec, err := h.svc.Create(c.Request.Context(), &req)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, rec)
}

// Settle 结算
// @Summary      结算往来款(支持部分结算)
// @Tags         财务-往来
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id    path  int  true  "ID"
// @Param        body  body  service.SettleRequest  true  "结算"
// @Success      200  {object}  xresponse.Response
// @Router       /finance/receivables/{id}/settle [post]
func (h *ReceivableHandler) Settle(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	var req service.SettleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	rec, err := h.svc.Settle(c.Request.Context(), uint(id), &req)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, rec)
}
