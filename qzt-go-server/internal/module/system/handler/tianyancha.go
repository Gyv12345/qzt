package handler

import (
	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/module/system/errcode"
	"qzt-go-server/internal/module/system/service"
	response "qzt-go-server/pkg/xresponse"
)

// TianyanchaHandler 天眼查 MCP 工商信息配置(P31 Feature B)。
type TianyanchaHandler struct {
	svc *service.TianyanchaService
}

func NewTianyanchaHandler() *TianyanchaHandler {
	return &TianyanchaHandler{svc: service.NewTianyanchaService()}
}

// GetConfig 天眼查配置详情
// @Summary      天眼查 MCP 配置详情
// @Description  读取天眼查 MCP 配置(端点/工具名映射/API Key 脱敏只回 ****+尾4 位)
// @Tags         天眼查
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object}  xresponse.Response
// @Router       /system/tianyancha/config [get]
func (h *TianyanchaHandler) GetConfig(c *gin.Context) {
	view, err := h.svc.Get(c.Request.Context())
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, view)
}

// SaveConfig 保存天眼查配置
// @Summary      保存天眼查 MCP 配置
// @Description  保存天眼查 MCP 配置(单行 upsert)。api_key 传脱敏值(****开头)保留原值;
//               endpoint 做出网校验(仅 http/https 且非内网/环回地址);演示模式下冻结。
// @Tags         天眼查
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body  service.SaveTianyanchaConfigRequest  true  "保存请求"
// @Success      200  {object}  xresponse.Response
// @Router       /system/tianyancha/config [put]
func (h *TianyanchaHandler) SaveConfig(c *gin.Context) {
	var req service.SaveTianyanchaConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	if err := h.svc.Save(c.Request.Context(), &req); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}
