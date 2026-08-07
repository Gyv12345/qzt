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

type TripHandler struct {
	svc *service.TripService
}

func NewTripHandler() *TripHandler { return &TripHandler{svc: service.NewTripService()} }

// List 出差列表
// @Summary      出差申请列表
// @Tags         OA-出差
// @Produce      json
// @Security     BearerAuth
// @Param        page             query  int     false  "页码"
// @Param        page_size        query  int     false  "每页条数"
// @Param        applicant_id     query  int     false  "申请人ID"
// @Param        approval_status  query  string  false  "审批状态"
// @Success      200  {object}  xresponse.Response
// @Router       /oa/trips [get]
func (h *TripHandler) List(c *gin.Context) {
	p := syservice.GetPagination(c)
	applicantID, _ := strconv.ParseUint(c.Query("applicant_id"), 10, 64)
	list, total, err := h.svc.List(c.Request.Context(), p.Page, p.PageSize, uint(applicantID), c.Query("approval_status"))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}

// GetByID 出差详情
// @Summary      出差申请详情
// @Tags         OA-出差
// @Produce      json
// @Security     BearerAuth
// @Param        id  path  int  true  "出差单ID"
// @Success      200  {object}  xresponse.Response
// @Router       /oa/trips/{id} [get]
func (h *TripHandler) GetByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	trip, err := h.svc.GetByID(c.Request.Context(), uint(id))
	if err != nil {
		response.Fail(c, errcode.ErrNotFound, err.Error())
		return
	}
	response.OK(c, trip)
}

// Create 新建出差申请
// @Summary      新建出差申请
// @Tags         OA-出差
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body  service.CreateTripRequest  true  "出差申请"
// @Success      200  {object}  xresponse.Response
// @Router       /oa/trips [post]
func (h *TripHandler) Create(c *gin.Context) {
	var req service.CreateTripRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	trip, err := h.svc.Create(c.Request.Context(), &req, middleware.GetUserID(c))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, trip)
}

// Update 编辑出差申请
// @Summary      编辑出差申请
// @Tags         OA-出差
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id    path  int  true  "出差单ID"
// @Param        body  body  service.UpdateTripRequest  true  "出差申请"
// @Success      200  {object}  xresponse.Response
// @Router       /oa/trips/{id} [put]
func (h *TripHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	var req service.UpdateTripRequest
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

// Delete 删除出差申请
// @Summary      删除出差申请
// @Tags         OA-出差
// @Produce      json
// @Security     BearerAuth
// @Param        id  path  int  true  "出差单ID"
// @Success      200  {object}  xresponse.Response
// @Router       /oa/trips/{id} [delete]
func (h *TripHandler) Delete(c *gin.Context) {
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
