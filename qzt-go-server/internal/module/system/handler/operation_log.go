package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"qzt-go-server/internal/module/system/service"
	"qzt-go-server/internal/module/system/errcode"
	response "qzt-go-server/pkg/xresponse"
)

type OperationLogHandler struct {
	svc *service.OperationLogService
}

func NewOperationLogHandler() *OperationLogHandler {
	return &OperationLogHandler{svc: service.NewOperationLogService()}
}

// List 操作日志列表
// @Summary      操作日志列表
// @Description  支持按用户名/模块/IP/成功与否/关键字/时间范围筛选
// @Tags         操作日志
// @Produce      json
// @Security     BearerAuth
// @Param        page        query  int     false  "页码(默认1)"
// @Param        page_size   query  int     false  "每页条数(默认10,最大100)"
// @Param        username    query  string  false  "用户名"
// @Param        module      query  string  false  "模块"
// @Param        client_ip   query  string  false  "客户端IP"
// @Param        success     query  string  false  "是否成功(true/false)"
// @Param        keyword     query  string  false  "关键字"
// @Param        start_time  query  string  false  "开始时间"
// @Param        end_time    query  string  false  "结束时间"
// @Success      200  {object}  xresponse.Response
// @Router       /system/operation-logs [get]
func (h *OperationLogHandler) List(c *gin.Context) {
	p := service.GetPagination(c)

	var success *bool
	if s := c.Query("success"); s != "" {
		b := s == "true" || s == "1"
		success = &b
	}

	list, total, err := h.svc.List(c.Request.Context(), p.Page, p.PageSize, &service.ListOperationLogRequest{
		Username:  c.Query("username"),
		Module:    c.Query("module"),
		ClientIP:  c.Query("client_ip"),
		Success:   success,
		Keyword:   c.Query("keyword"),
		StartTime: c.Query("start_time"),
		EndTime:   c.Query("end_time"),
	})
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{
		"list":  list,
		"total": total,
		"page":  p.Page,
		"size":  p.PageSize,
	})
}

// GetByID 操作日志详情
// @Summary      操作日志详情
// @Tags         操作日志
// @Produce      json
// @Security     BearerAuth
// @Param        id   path      int  true  "日志ID"
// @Success      200  {object}  xresponse.Response{data=model.SysOperationLog}
// @Router       /system/operation-logs/{id} [get]
func (h *OperationLogHandler) GetByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	log, err := h.svc.GetByID(c.Request.Context(), uint(id))
	if err != nil {
		response.Fail(c, errcode.ErrNotFound, "日志不存在")
		return
	}
	response.OK(c, log)
}

// Delete 删除操作日志
// @Summary      删除操作日志
// @Tags         操作日志
// @Produce      json
// @Security     BearerAuth
// @Param        id   path      int  true  "日志ID"
// @Success      200  {object}  xresponse.Response
// @Router       /system/operation-logs/{id} [delete]
func (h *OperationLogHandler) Delete(c *gin.Context) {
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

// Clear 清空操作日志
// @Summary      清空操作日志
// @Description  清空全部操作日志(管理员维护操作)
// @Tags         操作日志
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object}  xresponse.Response
// @Router       /system/operation-logs [delete]
// Clear removes all operation logs (admin maintenance action).
func (h *OperationLogHandler) Clear(c *gin.Context) {
	if err := h.svc.Clear(c.Request.Context()); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}
