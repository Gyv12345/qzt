package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/module/oa/service"
	"qzt-go-server/internal/module/system/errcode"
	syservice "qzt-go-server/internal/module/system/service"
	response "qzt-go-server/pkg/xresponse"
)

type MeetingRoomHandler struct {
	svc *service.MeetingRoomService
}

func NewMeetingRoomHandler() *MeetingRoomHandler {
	return &MeetingRoomHandler{svc: service.NewMeetingRoomService()}
}

// List 会议室列表
// @Summary      会议室列表
// @Tags         OA-会议室
// @Produce      json
// @Security     BearerAuth
// @Param        page   query  int     false  "页码"
// @Param        page_size  query  int     false  "每页条数"
// @Param        name   query  string  false  "名称"
// @Param        status query  string  false  "状态"
// @Success      200  {object}  xresponse.Response
// @Router       /oa/meeting-rooms [get]
func (h *MeetingRoomHandler) List(c *gin.Context) {
	p := syservice.GetPagination(c)
	list, total, err := h.svc.List(c.Request.Context(), p.Page, p.PageSize,
		c.Query("name"), c.Query("status"))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}

// GetByID 会议室详情
// @Summary      会议室详情
// @Tags         OA-会议室
// @Produce      json
// @Security     BearerAuth
// @Param        id  path  int  true  "会议室ID"
// @Success      200  {object}  xresponse.Response
// @Router       /oa/meeting-rooms/{id} [get]
func (h *MeetingRoomHandler) GetByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	room, err := h.svc.GetByID(c.Request.Context(), uint(id))
	if err != nil {
		response.Fail(c, errcode.ErrNotFound, err.Error())
		return
	}
	response.OK(c, room)
}

// Create 新建会议室
// @Summary      新建会议室
// @Tags         OA-会议室
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body  service.CreateMeetingRoomRequest  true  "会议室"
// @Success      200  {object}  xresponse.Response
// @Router       /oa/meeting-rooms [post]
func (h *MeetingRoomHandler) Create(c *gin.Context) {
	var req service.CreateMeetingRoomRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	room, err := h.svc.Create(c.Request.Context(), &req)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, room)
}

// Update 编辑会议室
// @Summary      编辑会议室
// @Tags         OA-会议室
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id    path  int  true  "会议室ID"
// @Param        body  body  service.UpdateMeetingRoomRequest  true  "会议室"
// @Success      200  {object}  xresponse.Response
// @Router       /oa/meeting-rooms/{id} [put]
func (h *MeetingRoomHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	var req service.UpdateMeetingRoomRequest
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

// Delete 删除会议室
// @Summary      删除会议室
// @Tags         OA-会议室
// @Produce      json
// @Security     BearerAuth
// @Param        id  path  int  true  "会议室ID"
// @Success      200  {object}  xresponse.Response
// @Router       /oa/meeting-rooms/{id} [delete]
func (h *MeetingRoomHandler) Delete(c *gin.Context) {
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
