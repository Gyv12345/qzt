package handler

import (
	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/middleware"
	"qzt-go-server/internal/module/api/service"
	"qzt-go-server/internal/module/system/errcode"
	response "qzt-go-server/pkg/xresponse"
)

// AIChatHandler AI 对话页(P26,admin 内置 AI 助手前台包装)。
type AIChatHandler struct{}

func NewAIChatHandler() *AIChatHandler {
	return &AIChatHandler{}
}

// Chat AI 对话补全
// @Summary      AI 助手对话补全
// @Description  多轮对话:取最近20条消息+系统提示词走统一LLM网关(feature=ai.chat记账);需 sys_config ai.chat_enabled=1(默认关)
// @Tags         AI助手
// @Produce      json
// @Security     BearerAuth
// @Param        body  body  service.AIChatRequest  true  "对话消息列表(最近20条)"
// @Success      200  {object}  xresponse.Response{data=service.AIChatResponse}
// @Router       /api/ai/chat [post]
func (h *AIChatHandler) Chat(c *gin.Context) {
	var req service.AIChatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	userID := middleware.GetUserID(c)
	reply, err := service.Chat(c.Request.Context(), userID, req.Messages)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, service.AIChatResponse{Reply: reply})
}
