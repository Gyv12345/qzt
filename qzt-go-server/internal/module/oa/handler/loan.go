package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/middleware"
	"qzt-go-server/internal/module/oa/service"
	"qzt-go-server/internal/module/system/errcode"
	syservice "qzt-go-server/internal/module/system/service"
	response "qzt-go-server/pkg/xresponse"
)

type LoanHandler struct {
	svc *service.LoanService
}

func NewLoanHandler() *LoanHandler { return &LoanHandler{svc: service.NewLoanService()} }

// List 借款列表
// @Summary      借款/备用金列表
// @Tags         OA-借款
// @Produce      json
// @Security     BearerAuth
// @Param        page             query  int     false  "页码"
// @Param        page_size        query  int     false  "每页条数"
// @Param        loan_no          query  string  false  "借款单号(模糊)"
// @Param        title            query  string  false  "标题(模糊)"
// @Param        applicant_id     query  int     false  "借款人ID"
// @Param        loan_type        query  string  false  "借款类型"
// @Param        approval_status  query  string  false  "审批状态"
// @Param        repaid_status    query  int     false  "还款状态"
// @Success      200  {object}  xresponse.Response
// @Router       /oa/loans [get]
func (h *LoanHandler) List(c *gin.Context) {
	p := syservice.GetPagination(c)
	applicantID, _ := strconv.ParseUint(c.Query("applicant_id"), 10, 64)
	repaidStatus := int8(-1)
	if v := c.Query("repaid_status"); v != "" {
		n, _ := strconv.Atoi(v)
		repaidStatus = int8(n)
	}
	list, total, err := h.svc.List(c.Request.Context(), p.Page, p.PageSize, uint(applicantID),
		c.Query("loan_no"), c.Query("title"),
		c.Query("loan_type"), c.Query("approval_status"), repaidStatus)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}

// GetByID 借款详情
// @Summary      借款/备用金详情
// @Tags         OA-借款
// @Produce      json
// @Security     BearerAuth
// @Param        id  path  int  true  "借款单ID"
// @Success      200  {object}  xresponse.Response
// @Router       /oa/loans/{id} [get]
func (h *LoanHandler) GetByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	loan, err := h.svc.GetByID(c.Request.Context(), uint(id))
	if err != nil {
		response.Fail(c, errcode.ErrNotFound, err.Error())
		return
	}
	response.OK(c, loan)
}

// Create 新建借款
// @Summary      新建借款/备用金
// @Tags         OA-借款
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body  service.CreateLoanRequest  true  "借款单"
// @Success      200  {object}  xresponse.Response
// @Router       /oa/loans [post]
func (h *LoanHandler) Create(c *gin.Context) {
	var req service.CreateLoanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	loan, err := h.svc.Create(c.Request.Context(), &req, middleware.GetUserID(c))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, loan)
}

// Update 编辑借款
// @Summary      编辑借款/备用金
// @Tags         OA-借款
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id    path  int  true  "借款单ID"
// @Param        body  body  service.UpdateLoanRequest  true  "借款单"
// @Success      200  {object}  xresponse.Response
// @Router       /oa/loans/{id} [put]
func (h *LoanHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	var req service.UpdateLoanRequest
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

// Delete 删除借款
// @Summary      删除借款/备用金
// @Tags         OA-借款
// @Produce      json
// @Security     BearerAuth
// @Param        id  path  int  true  "借款单ID"
// @Success      200  {object}  xresponse.Response
// @Router       /oa/loans/{id} [delete]
func (h *LoanHandler) Delete(c *gin.Context) {
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

// MarkRepaid 标记已还款
// @Summary      标记借款已还清
// @Tags         OA-借款
// @Produce      json
// @Security     BearerAuth
// @Param        id  path  int  true  "借款单ID"
// @Success      200  {object}  xresponse.Response
// @Router       /oa/loans/{id}/mark-repaid [post]
func (h *LoanHandler) MarkRepaid(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	if err := h.svc.MarkRepaid(c.Request.Context(), uint(id)); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}
