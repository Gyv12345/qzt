package handler

// mail.go 邮件模块 HTTP handler。

import (
	"github.com/gin-gonic/gin"

	response "qzt-go-server/pkg/xresponse"
	"qzt-go-server/internal/module/mail/service"
	"qzt-go-server/internal/module/system/errcode"
)

type MailHandler struct {
	svc *service.MailService
}

func NewMailHandler() *MailHandler {
	return &MailHandler{svc: service.NewMailService()}
}

// Send 发送邮件
// @Summary      发送邮件
// @Tags         邮件
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        body  body      service.SendMailRequest  true  "邮件内容"
// @Success      200   {object}  xresponse.Response
// @Router       /mail/send [post]
func (h *MailHandler) Send(c *gin.Context) {
	var req service.SendMailRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	if err := h.svc.Send(c.Request.Context(), &req); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// TestConnect 测试 SMTP 连接(给自己发测试邮件)
// @Summary      测试 SMTP 连接
// @Tags         邮件
// @Security     BearerAuth
// @Produce      json
// @Success      200  {object}  xresponse.Response
// @Router       /mail/test [post]
func (h *MailHandler) TestConnect(c *gin.Context) {
	if err := h.svc.TestConnect(c.Request.Context()); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"msg": "测试邮件已发送,请到收件箱确认"})
}
