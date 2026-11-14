package handler

import (
	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/module/storefront/service"
	syserrcode "qzt-go-server/internal/module/system/errcode"
	response "qzt-go-server/pkg/xresponse"
)

// InquiryHandler 独立站询盘 handler(公开提交)。
type InquiryHandler struct {
	svc *service.InquiryService
}

// NewInquiryHandler 构造。
func NewInquiryHandler() *InquiryHandler {
	return &InquiryHandler{svc: service.NewInquiryService()}
}

// PublicCreateInquiry 询盘提交(公开)
// @Summary  独立站询盘提交(公开)
// @Description  免登录提交询盘:每 IP 每分钟限 3 次;校验邮箱/内容后自动创建 CRM 公海线索(来源=独立站询盘)并异步通知管理员,返回线索编号
// @Tags     独立站公开
// @Accept   json
// @Produce  json
// @Param    body  body  service.InquiryRequest  true  "询盘内容"
// @Success  200  {object}  xresponse.Response
// @Router   /storefront/public/inquiries [post]
func (h *InquiryHandler) PublicCreateInquiry(c *gin.Context) {
	var req service.InquiryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, syserrcode.ErrParam, "请填写姓名、邮箱和询盘内容")
		return
	}
	leadNo, err := h.svc.CreateInquiry(c.Request.Context(), c.ClientIP(), &req)
	if err != nil {
		response.Fail(c, syserrcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"lead_no": leadNo})
}
