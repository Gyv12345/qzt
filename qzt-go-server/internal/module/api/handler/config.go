package handler

import (
	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/module/system/errcode"
	"qzt-go-server/internal/repository"
	response "qzt-go-server/pkg/xresponse"
)

// ConfigHandler 公共配置 handler：向前端暴露免鉴权的运行时配置（is_public=true 的项）。
type ConfigHandler struct {
	repo *repository.ConfigRepo
}

func NewConfigHandler() *ConfigHandler {
	return &ConfigHandler{repo: repository.NewConfigRepo()}
}

// Public 公共配置
// @Summary      公共配置
// @Description  返回标记为 is_public 的配置项(key->value),供前端启动引导使用,免鉴权
// @Tags         公共接口
// @Produce      json
// @Success      200  {object}  xresponse.Response
// @Router       /api/configs/public [get]
// Public 返回标记为 is_public 的配置项，供前端启动引导使用（如站点名称等）。
func (h *ConfigHandler) Public(c *gin.Context) {
	list, err := h.repo.ListPublic(c.Request.Context())
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	// 转成 key->value 映射，便于前端直接取用
	m := make(map[string]string, len(list))
	for _, cfg := range list {
		m[cfg.Key] = cfg.Value
	}
	response.OK(c, m)
}
