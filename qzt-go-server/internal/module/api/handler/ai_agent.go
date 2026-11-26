package handler

import (
	"errors"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/middleware"
	"qzt-go-server/internal/module/api/service"
	"qzt-go-server/internal/module/system/errcode"
	response "qzt-go-server/pkg/xresponse"
)

// AIAgentHandler AI 场景智能体(P30-#3):经营洞察/审批助手/日报生成 + 跟进草稿。
// 页面入口分散在各业务页面(工作台/审批待办/工作日志/客户跟进),不再有独立的场景页。
// 鉴权口径同 AI 对话页(仅 JWT 不进 RBAC 组),成本由 sys_config ai.chat_enabled 开关控制。
type AIAgentHandler struct{}

func NewAIAgentHandler() *AIAgentHandler {
	return &AIAgentHandler{}
}

// Run 运行场景智能体
// @Summary      AI 场景智能体运行
// @Description  scenario=insight(经营洞察;全公司口径,需具备销售趋势的查看权限,否则 10004)/approval-summary(审批助手)/daily-report(日报生成):无 body,采集真实业务数据构建提示词走统一LLM网关(feature=ai.agent记账);scenario=followup-draft(跟进草稿):body 传 customer_id 或 lead_id + template,为销售起草一条跟进消息草稿,需对该客户/线索有查看权限,需 sys_config ai.chat_enabled=1(默认关)
// @Tags         AI场景智能体
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        scenario  path  string                       true  "场景:insight/approval-summary/daily-report/followup-draft"
// @Param        body      body  service.FollowupDraftRequest  false "跟进草稿入参(仅 scenario=followup-draft 时读取)"
// @Success      200  {object}  xresponse.Response
// @Router       /api/ai/agents/{scenario}/run [post]
func (h *AIAgentHandler) Run(c *gin.Context) {
	scenario := c.Param("scenario")
	// 跟进草稿带入参(客户/线索 + 模板),与其余三个「无 body、自己取数」的场景分流处理
	if scenario == service.ScenarioFollowupDraft {
		h.runFollowupDraft(c)
		return
	}
	out, err := service.RunAgent(c.Request.Context(), middleware.GetUserID(c), middleware.GetRoleCodes(c), scenario)
	if err != nil {
		// 经营洞察是全公司口径,无销售趋势查看权限时回 10004(与 BI 接口被拒同码)
		if errors.Is(err, service.ErrAIInsightForbidden) {
			response.Fail(c, errcode.ErrForbidden, err.Error())
			return
		}
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, out)
}

// runFollowupDraft 跟进草稿:权限不足回 10004(与 CRM 接口被数据范围守卫拒绝时同码),其余业务错误回 10000。
func (h *AIAgentHandler) runFollowupDraft(c *gin.Context) {
	var req service.FollowupDraftRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误:"+err.Error())
		return
	}
	out, err := service.RunFollowupDraft(c.Request.Context(), middleware.GetUserID(c), middleware.GetRoleCodes(c), &req)
	if err != nil {
		if errors.Is(err, service.ErrAIFollowupForbidden) {
			response.Fail(c, errcode.ErrForbidden, err.Error())
			return
		}
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, out)
}

// FollowupTemplates 跟进草稿模板目录
// @Summary      跟进草稿模板目录
// @Description  scenario 固定传 followup-draft;返回模板 key/名称/说明/默认语气/建议跟进类型
// @Tags         AI场景智能体
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object}  xresponse.Response
// @Router       /api/ai/agents/{scenario}/templates [get]
func (h *AIAgentHandler) FollowupTemplates(c *gin.Context) {
	if c.Param("scenario") != service.ScenarioFollowupDraft {
		response.Fail(c, errcode.ErrParam, "未知场景")
		return
	}
	response.OK(c, service.FollowupTemplates())
}
