package handler

import (
	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/version"
	response "qzt-go-server/pkg/xresponse"
)

// VersionHandler 系统版本信息。
type VersionHandler struct{}

func NewVersionHandler() *VersionHandler {
	return &VersionHandler{}
}

// Get 获取系统版本信息
// @Summary      获取系统版本信息
// @Description  返回后端版本号/Git 提交/构建时间/Go 版本。免鉴权,admin「关于系统」弹窗与部署后核验用。
// @Tags         系统
// @Produce      json
// @Success      200  {object}  xresponse.Response
// @Router       /system/version [get]
func (h *VersionHandler) Get(c *gin.Context) {
	response.OK(c, version.Get())
}
