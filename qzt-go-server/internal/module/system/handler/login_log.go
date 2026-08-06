package handler

import (
	"github.com/gin-gonic/gin"

	errcode "qzt-go-server/internal/module/system/errcode"
	syservice "qzt-go-server/internal/module/system/service"
	response "qzt-go-server/pkg/xresponse"
)

type LoginLogHandler struct {
	svc *syservice.LoginLogService
}

func NewLoginLogHandler() *LoginLogHandler {
	return &LoginLogHandler{svc: syservice.NewLoginLogService()}
}

// List 登录日志列表
// @Summary      登录日志列表
// @Description  支持按用户名/成功与否/客户端IP/时间范围筛选
// @Tags         登录日志
// @Produce      json
// @Security     BearerAuth
// @Param        page        query  int     false  "页码(默认1)"
// @Param        page_size   query  int     false  "每页条数(默认10,最大100)"
// @Param        username    query  string  false  "用户名"
// @Param        success     query  string  false  "是否成功(true/false)"
// @Param        client_ip   query  string  false  "客户端IP"
// @Param        start_time  query  string  false  "开始时间"
// @Param        end_time    query  string  false  "结束时间"
// @Success      200  {object}  xresponse.Response
// @Router       /system/login-logs [get]
func (h *LoginLogHandler) List(c *gin.Context) {
	p := syservice.GetPagination(c)

	list, total, err := h.svc.List(c.Request.Context(), p.Page, p.PageSize,
		c.Query("username"),
		c.Query("success"),
		c.Query("client_ip"),
		c.Query("start_time"),
		c.Query("end_time"),
	)
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
