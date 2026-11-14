package handler

import (
	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/middleware"
	"qzt-go-server/internal/module/api/service"
	"qzt-go-server/internal/module/system/errcode"
	response "qzt-go-server/pkg/xresponse"
)

// AIAgentHandler AI 场景智能体(P30-#3):经营洞察/审批助手/日报生成。
// 鉴权口径同 AI 对话页(仅 JWT 不进 RBAC 组),成本由 sys_config ai.chat_enabled 开关控制。
type AIAgentHandler struct{}

func NewAIAgentHandler() *AIAgentHandler {
	return &AIAgentHandler{}
}

// Run 运行场景智能体
// @Summary      AI 场景智能体运行
// @Description  scenario=insight(经营洞察)/approval-summary(审批助手)/daily-report(日报生成);采集真实业务数据构建提示词走统一LLM网关(feature=ai.agent记账);需 sys_config ai.chat_enabled=1(默认关)
// @Tags         AI场景智能体
// @Produce      json
// @Security     BearerAuth
// @Param        scenario  path  string  true  "场景:insight/approval-summary/daily-report"
// @Success      200  {object}  xresponse.Response{data=service.AgentRunResponse}
// @Router       /api/ai/agents/{scenario}/run [post]
func (h *AIAgentHandler) Run(c *gin.Context) {
	scenario := c.Param("scenario")
	userID := middleware.GetUserID(c)
	out, err := service.RunAgent(c.Request.Context(), userID, scenario)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, out)
}
