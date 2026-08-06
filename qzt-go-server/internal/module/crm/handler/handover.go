package handler

// handover.go 离职交接 handler。

import (
	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/middleware"
	"qzt-go-server/internal/module/crm/service"
	"qzt-go-server/internal/module/system/errcode"
	response "qzt-go-server/pkg/xresponse"
)

type HandoverHandler struct {
	svc *service.HandoverService
}

func NewHandoverHandler() *HandoverHandler {
	return &HandoverHandler{svc: service.NewHandoverService()}
}

// Handover 离职交接:批量转移业务资源。
func (h *HandoverHandler) Handover(c *gin.Context) {
	var req service.HandoverRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	operatorID := middleware.GetUserID(c)
	result, err := h.svc.Handover(c.Request.Context(), &req)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	_ = operatorID
	response.OK(c, result)
}
