package handler

import (
	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/module/crm/service"
	"qzt-go-server/internal/module/system/errcode"
	response "qzt-go-server/pkg/xresponse"
)

// StageHandler 阶段配置管理。
type StageHandler struct {
	svc *service.StageService
}

func NewStageHandler() *StageHandler {
	return &StageHandler{svc: service.NewStageService()}
}

// GetByBizType 取某业务类型的阶段配置
// @Summary  取阶段配置
// @Tags     阶段配置
// @Produce  json
// @Security BearerAuth
// @Param    bizType  path  string  true  "业务类型(如 OPPORTUNITY)"
// @Success  200  {object}  xresponse.Response
// @Router   /crm/stage-configs/{bizType} [get]
func (h *StageHandler) GetByBizType(c *gin.Context) {
	bizType := c.Param("bizType")
	if bizType == "" {
		response.Fail(c, errcode.ErrParam, "参数错误: bizType 不能为空")
		return
	}
	config, stages, err := h.svc.GetByBizType(c.Request.Context(), bizType)
	if err != nil {
		response.Fail(c, errcode.ErrNotFound, err.Error())
		return
	}
	response.OK(c, gin.H{"config": config, "stages": stages})
}

// UpdateStages 更新阶段定义
// @Summary  更新阶段定义
// @Tags     阶段配置
// @Accept   json
// @Produce  json
// @Security BearerAuth
// @Param    bizType  path  string  true  "业务类型(如 OPPORTUNITY)"
// @Param    body     body  []service.StageDef  true  "阶段定义数组"
// @Success  200  {object}  xresponse.Response
// @Router   /crm/stage-configs/{bizType} [put]
func (h *StageHandler) UpdateStages(c *gin.Context) {
	bizType := c.Param("bizType")
	if bizType == "" {
		response.Fail(c, errcode.ErrParam, "参数错误: bizType 不能为空")
		return
	}
	var defs []service.StageDef
	if err := c.ShouldBindJSON(&defs); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	if err := h.svc.UpdateStages(c.Request.Context(), bizType, defs); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}
