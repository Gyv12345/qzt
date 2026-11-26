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
// @Description  多轮对话:取最近20条消息+系统提示词走统一LLM网关(feature=ai.chat记账);需 sys_config ai.chat_enabled=1(默认关)。ai.tools_enabled=1(默认开)时进入工具循环:模型可调用白名单只读工具查企业实时业务数据,tool_trace 随响应返回调用轨迹
// @Tags         AI助手
// @Produce      json
// @Security     BearerAuth
// @Param        body  body  service.AIChatRequest  true  "对话消息列表(最近20条);model 可选模型标识"
// @Success      200  {object}  xresponse.Response{data=service.AIChatResponse}
// @Router       /api/ai/chat [post]
func (h *AIChatHandler) Chat(c *gin.Context) {
	var req service.AIChatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	userID := middleware.GetUserID(c)
	data, err := service.Chat(c.Request.Context(), userID, req)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, data)
}

// Models 可用 AI 模型档案列表
// @Summary      AI 可用模型列表
// @Description  返回 AI 对话/工具开关状态与启用中的模型档案(ai_model Enabled=1,不含 base_url/api_key);供全局 AI 悬浮球选模型
// @Tags         AI助手
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object}  xresponse.Response{data=service.AIModelsResponse}
// @Router       /api/ai/models [get]
func (h *AIChatHandler) Models(c *gin.Context) {
	data, err := service.AIModels(c.Request.Context())
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, data)
}
