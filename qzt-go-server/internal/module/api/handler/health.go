package handler

import (
	"github.com/gin-gonic/gin"

	response "qzt-go-server/pkg/xresponse"
)

// HealthHandler 健康检查 handler。
type HealthHandler struct{}

func NewHealthHandler() *HealthHandler {
	return &HealthHandler{}
}

// Health 健康检查
// @Summary      健康检查
// @Description  存活探针,进程能响应即 ok
// @Tags         公共接口
// @Produce      json
// @Success      200  {object}  xresponse.Response
// @Router       /api/health [get]
// Health 存活探针：进程能响应即 ok。
func (h *HealthHandler) Health(c *gin.Context) {
	response.OK(c, gin.H{"status": "ok"})
}
