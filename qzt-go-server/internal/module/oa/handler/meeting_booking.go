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

type MeetingBookingHandler struct {
	svc *service.MeetingBookingService
}

func NewMeetingBookingHandler() *MeetingBookingHandler {
	return &MeetingBookingHandler{svc: service.NewMeetingBookingService()}
}

// List 会议预订列表
// @Summary      会议预订列表
// @Tags         OA-会议预订
// @Produce      json
// @Security     BearerAuth
// @Param        page             query  int     false  "页码"
// @Param        page_size        query  int     false  "每页条数"
// @Param        room_id          query  int     false  "会议室ID"
// @Param        organizer_id     query  int     false  "预订人ID"
// @Param        approval_status  query  string  false  "审批状态"
// @Param        start_date       query  string  false  "开始日期"
// @Param        end_date         query  string  false  "结束日期"
// @Success      200  {object}  xresponse.Response
// @Router       /oa/meeting-bookings [get]
func (h *MeetingBookingHandler) List(c *gin.Context) {
	p := syservice.GetPagination(c)
	roomID, _ := strconv.ParseUint(c.Query("room_id"), 10, 64)
	organizerID, _ := strconv.ParseUint(c.Query("organizer_id"), 10, 64)
	list, total, err := h.svc.List(c.Request.Context(), p.Page, p.PageSize,
		uint(roomID), uint(organizerID), c.Query("approval_status"),
		c.Query("start_date"), c.Query("end_date"))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}

// GetByID 会议预订详情
// @Summary      会议预订详情
// @Tags         OA-会议预订
// @Produce      json
// @Security     BearerAuth
// @Param        id  path  int  true  "预订ID"
// @Success      200  {object}  xresponse.Response
// @Router       /oa/meeting-bookings/{id} [get]
func (h *MeetingBookingHandler) GetByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	booking, err := h.svc.GetByID(c.Request.Context(), uint(id))
	if err != nil {
		response.Fail(c, errcode.ErrNotFound, err.Error())
		return
	}
	response.OK(c, booking)
}

// Create 新建会议预订
// @Summary      新建会议预订
// @Tags         OA-会议预订
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body  service.CreateMeetingBookingRequest  true  "会议预订"
// @Success      200  {object}  xresponse.Response
// @Router       /oa/meeting-bookings [post]
func (h *MeetingBookingHandler) Create(c *gin.Context) {
	var req service.CreateMeetingBookingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	booking, err := h.svc.Create(c.Request.Context(), &req, middleware.GetUserID(c))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, booking)
}

// Update 编辑会议预订
// @Summary      编辑会议预订
// @Tags         OA-会议预订
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id    path  int  true  "预订ID"
// @Param        body  body  service.UpdateMeetingBookingRequest  true  "会议预订"
// @Success      200  {object}  xresponse.Response
// @Router       /oa/meeting-bookings/{id} [put]
func (h *MeetingBookingHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	var req service.UpdateMeetingBookingRequest
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

// Delete 删除会议预订
// @Summary      删除会议预订
// @Tags         OA-会议预订
// @Produce      json
// @Security     BearerAuth
// @Param        id  path  int  true  "预订ID"
// @Success      200  {object}  xresponse.Response
// @Router       /oa/meeting-bookings/{id} [delete]
func (h *MeetingBookingHandler) Delete(c *gin.Context) {
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
