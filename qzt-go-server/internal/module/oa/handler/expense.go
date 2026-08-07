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

// expense.go 报销单 HTTP handler。

type ExpenseHandler struct {
	svc *service.ExpenseService
}

func NewExpenseHandler() *ExpenseHandler {
	return &ExpenseHandler{svc: service.NewExpenseService()}
}

// List 报销单列表
// @Summary      报销单列表
// @Tags         OA-报销
// @Produce      json
// @Security     BearerAuth
// @Param        page             query  int     false  "页码"
// @Param        page_size        query  int     false  "每页条数"
// @Param        applicant_id     query  int     false  "申请人ID"
// @Param        expense_type     query  string  false  "费用类型"
// @Param        approval_status  query  string  false  "审批状态"
// @Param        payment_status   query  int     false  "打款状态"
// @Success      200  {object}  xresponse.Response
// @Router       /oa/expenses [get]
func (h *ExpenseHandler) List(c *gin.Context) {
	p := syservice.GetPagination(c)
	applicantID, _ := strconv.ParseUint(c.Query("applicant_id"), 10, 64)
	paymentStatus := int8(-1)
	if v := c.Query("payment_status"); v != "" {
		n, _ := strconv.Atoi(v)
		paymentStatus = int8(n)
	}
	list, total, err := h.svc.List(c.Request.Context(), p.Page, p.PageSize, uint(applicantID),
		c.Query("expense_type"), c.Query("approval_status"), paymentStatus)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}

// GetByID 报销单详情
// @Summary      报销单详情
// @Tags         OA-报销
// @Produce      json
// @Security     BearerAuth
// @Param        id  path  int  true  "报销单ID"
// @Success      200  {object}  xresponse.Response
// @Router       /oa/expenses/{id} [get]
func (h *ExpenseHandler) GetByID(c *gin.Context) {
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

// Create 新建报销单
// @Summary      新建报销单
// @Tags         OA-报销
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body  service.CreateExpenseRequest  true  "报销单"
// @Success      200  {object}  xresponse.Response
// @Router       /oa/expenses [post]
func (h *ExpenseHandler) Create(c *gin.Context) {
	var req service.CreateExpenseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	expense, err := h.svc.Create(c.Request.Context(), &req, middleware.GetUserID(c))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, expense)
}

// Update 编辑报销单
// @Summary      编辑报销单
// @Tags         OA-报销
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id    path  int  true  "报销单ID"
// @Param        body  body  service.UpdateExpenseRequest  true  "报销单"
// @Success      200  {object}  xresponse.Response
// @Router       /oa/expenses/{id} [put]
func (h *ExpenseHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	var req service.UpdateExpenseRequest
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

// Delete 删除报销单
// @Summary      删除报销单
// @Tags         OA-报销
// @Produce      json
// @Security     BearerAuth
// @Param        id  path  int  true  "报销单ID"
// @Success      200  {object}  xresponse.Response
// @Router       /oa/expenses/{id} [delete]
func (h *ExpenseHandler) Delete(c *gin.Context) {
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

// MarkPaid 标记已打款
// @Summary      标记报销单已打款
// @Tags         OA-报销
// @Produce      json
// @Security     BearerAuth
// @Param        id  path  int  true  "报销单ID"
// @Success      200  {object}  xresponse.Response
// @Router       /oa/expenses/{id}/mark-paid [post]
func (h *ExpenseHandler) MarkPaid(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	if err := h.svc.MarkPaid(c.Request.Context(), uint(id)); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}
