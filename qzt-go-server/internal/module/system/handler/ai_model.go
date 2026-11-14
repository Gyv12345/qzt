package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/module/system/errcode"
	"qzt-go-server/internal/module/system/service"
	response "qzt-go-server/pkg/xresponse"
)

// AIModelHandler AI 模型档案管理(AI 助手-AI 模型页,P30)。
// 写操作(保存/删除/启用热切换)在演示模式下被 DemoSystemWriteGuard 冻结(路由层已挂):
// 模型切换绝不能被演示访客操作——含业务数据的提示词会被引到外部端点。
type AIModelHandler struct {
	svc *service.AIModelService
}

func NewAIModelHandler() *AIModelHandler {
	return &AIModelHandler{svc: service.NewAIModelService()}
}

// List 模型档案列表
// @Summary      AI 模型档案列表
// @Description  全部 AI 模型档案(生效行置顶),api_key 脱敏只回 ****+尾4位
// @Tags         AI模型
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object}  xresponse.Response{data=[]service.AIModelItem}
// @Router       /system/ai/models [get]
func (h *AIModelHandler) List(c *gin.Context) {
	list, err := h.svc.List(c.Request.Context())
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, list)
}

// Current 当前生效档案
// @Summary      当前生效的 AI 模型档案
// @Description  返回当前生效档案及来源(source=db/env);无 DB 生效档案时回 env 配置,api_key 脱敏
// @Tags         AI模型
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object}  xresponse.Response{data=service.CurrentAIModel}
// @Router       /system/ai/models/current [get]
func (h *AIModelHandler) Current(c *gin.Context) {
	item, err := h.svc.Current(c.Request.Context())
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, item)
}

// Create 新建模型档案
// @Summary      新建 AI 模型档案
// @Description  校验 base_url 出网安全(仅 http/https 且拒绝内网/环回/保留地址);api_key 必填;不自动激活
// @Tags         AI模型
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body      service.SaveAIModelRequest  true  "档案参数"
// @Success      200   {object}  xresponse.Response{data=service.AIModelItem}
// @Router       /system/ai/models [post]
func (h *AIModelHandler) Create(c *gin.Context) {
	var req service.SaveAIModelRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	item, err := h.svc.Create(c.Request.Context(), &req)
	if err != nil {
		response.Fail(c, errcode.ErrParam, err.Error())
		return
	}
	response.OK(c, item)
}

// Update 更新模型档案
// @Summary      更新 AI 模型档案
// @Description  api_key 传脱敏值(****开头)保留原值不覆盖;不改动生效状态
// @Tags         AI模型
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id    path      int                         true  "档案ID"
// @Param        body  body      service.SaveAIModelRequest  true  "档案参数"
// @Success      200   {object}  xresponse.Response
// @Router       /system/ai/models/{id} [put]
func (h *AIModelHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	var req service.SaveAIModelRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	if err := h.svc.Update(c.Request.Context(), uint(id), &req); err != nil {
		response.Fail(c, errcode.ErrParam, err.Error())
		return
	}
	response.OK(c, nil)
}

// Delete 删除模型档案
// @Summary      删除 AI 模型档案
// @Description  当前生效(is_default=1)的档案拒绝删除
// @Tags         AI模型
// @Produce      json
// @Security     BearerAuth
// @Param        id  path      int  true  "档案ID"
// @Success      200  {object}  xresponse.Response
// @Router       /system/ai/models/{id} [delete]
func (h *AIModelHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	if err := h.svc.Delete(c.Request.Context(), uint(id)); err != nil {
		response.Fail(c, errcode.ErrParam, err.Error())
		return
	}
	response.OK(c, nil)
}

// Activate 启用模型档案(热切换)
// @Summary      启用 AI 模型档案(热切换)
// @Description  事务内切换 is_default 标记,base_url 出网校验通过才提交;成功后全局 LLM 客户端即时热切换,失败回滚并报错
// @Tags         AI模型
// @Produce      json
// @Security     BearerAuth
// @Param        id  path      int  true  "档案ID"
// @Success      200  {object}  xresponse.Response
// @Router       /system/ai/models/{id}/activate [post]
func (h *AIModelHandler) Activate(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	if err := h.svc.Activate(c.Request.Context(), uint(id)); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}
