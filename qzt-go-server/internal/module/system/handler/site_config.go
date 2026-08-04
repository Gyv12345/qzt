package handler

import (
	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/module/system/service"
	"qzt-go-server/internal/module/system/errcode"
	response "qzt-go-server/pkg/xresponse"
)

// SiteConfigHandler 站点信息配置。
type SiteConfigHandler struct {
	svc *service.SiteConfigService
}

func NewSiteConfigHandler() *SiteConfigHandler {
	return &SiteConfigHandler{svc: service.NewSiteConfigService()}
}

// Get 获取站点信息
// @Summary      获取站点信息
// @Description  返回站点配置(logo/企业名/联系方式/备案号等)。管理端用。
// @Tags         站点设置
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object}  xresponse.Response
// @Router       /system/site-config [get]
func (h *SiteConfigHandler) Get(c *gin.Context) {
	cfg, err := h.svc.Get(c.Request.Context())
	if err != nil {
		response.Fail(c, errcode.ErrNotFound, err.Error())
		return
	}
	response.OK(c, cfg)
}

// Update 更新站点信息
// @Summary      更新站点信息
// @Description  更新 logo/企业名/联系方式/备案号等全站配置
// @Tags         站点设置
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body  service.UpdateSiteConfigRequest  true  "站点配置"
// @Success      200   {object}  xresponse.Response
// @Router       /system/site-config [put]
func (h *SiteConfigHandler) Update(c *gin.Context) {
	var req service.UpdateSiteConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	if err := h.svc.Update(c.Request.Context(), &req); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}
