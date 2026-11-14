package handler

import (
	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/module/storefront/service"
	syserrcode "qzt-go-server/internal/module/system/errcode"
	response "qzt-go-server/pkg/xresponse"
)

// ConfigHandler 独立站站点配置 handler(汇率 + 站点语言)。
type ConfigHandler struct {
	svc *service.ConfigService
}

// NewConfigHandler 构造。
func NewConfigHandler() *ConfigHandler {
	return &ConfigHandler{svc: service.NewConfigService()}
}

// PublicConfig 站点配置(公开)
// @Summary  独立站站点配置(公开)
// @Description  站点语言/汇率/paypal_enabled,免鉴权;不含 notify_email 等管理端字段;汇率用于前端本地试算,权威折算以后端为准
// @Tags     独立站公开
// @Produce  json
// @Success  200  {object}  xresponse.Response
// @Router   /storefront/public/config [get]
func (h *ConfigHandler) PublicConfig(c *gin.Context) {
	dto, err := h.svc.Public(c.Request.Context())
	if err != nil {
		response.Fail(c, syserrcode.ErrServer, err.Error())
		return
	}
	response.OK(c, dto)
}

// AdminGet 站点配置(管理)
// @Summary  独立站站点配置(管理)
// @Description  管理端读配置(与公开同构)
// @Tags     独立站管理
// @Produce  json
// @Security BearerAuth
// @Success  200  {object}  xresponse.Response
// @Router   /storefront/config [get]
func (h *ConfigHandler) AdminGet(c *gin.Context) {
	dto, err := h.svc.Get(c.Request.Context())
	if err != nil {
		response.Fail(c, syserrcode.ErrServer, err.Error())
		return
	}
	response.OK(c, dto)
}

// AdminPut 保存站点配置(管理)
// @Summary  独立站站点配置保存(管理)
// @Description  全量覆盖保存;locales 至少 1 个;rates 前端固定 USD/EUR/GBP 三键(CNY per unit)
// @Tags     独立站管理
// @Accept   json
// @Produce  json
// @Param    body  body  service.ConfigUpdateRequest  true  "配置"
// @Security BearerAuth
// @Success  200  {object}  xresponse.Response
// @Router   /storefront/config [put]
func (h *ConfigHandler) AdminPut(c *gin.Context) {
	var req service.ConfigUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, syserrcode.ErrParam, "参数错误:"+err.Error())
		return
	}
	if err := h.svc.Put(c.Request.Context(), &req); err != nil {
		response.Fail(c, syserrcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}
