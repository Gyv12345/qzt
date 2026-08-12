package handler

// esign.go 电子签(e签宝)handler:发起签署 / 查询状态 / 签署回调。
//
// 路由(见 crm/router.go):
//   - POST /crm/contracts/:id/esign/initiate  发起签署(auth 组,传签署方)
//   - GET  /crm/contracts/:id/esign           查询签署详情(auth 组)
//   - POST /crm/public/esign/callback         e签宝状态回调(public 组,验签)

import (
	"encoding/json"
	"io"
	"strconv"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/module/crm/service"
	"qzt-go-server/internal/module/system/errcode"
	"qzt-go-server/internal/pkg/esignclient"
	"qzt-go-server/internal/pkg/setting"
	response "qzt-go-server/pkg/xresponse"
)

// EsignHandler 电子签管理。
type EsignHandler struct {
	svc *service.EsignService
}

func NewEsignHandler() *EsignHandler {
	return &EsignHandler{svc: service.NewEsignService()}
}

// initiateEsignRequest 发起签署请求体(半自动:用户补签署方)。
type initiateEsignRequest struct {
	Signers []esignclient.Signer `json:"signers" binding:"required"`
}

// Initiate 发起电子签(用户补充签署方后调用;需任务处于 READY)。
// @Summary  发起电子签(补充签署方)
// @Tags     电子签
// @Accept   json
// @Produce  json
// @Security BearerAuth
// @Param    id    path      int                        true  "合同ID"
// @Param    body  body      handler.initiateEsignRequest  true  "签署方列表"
// @Success  200   {object}  xresponse.Response
// @Router   /crm/contracts/{id}/esign/initiate [post]
func (h *EsignHandler) Initiate(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	var req initiateEsignRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	if err := h.svc.Initiate(c.Request.Context(), uint(id), req.Signers); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// GetStatus 查询合同电子签详情(状态/签署方/短链/PDF 预览 URL)。
// @Summary  查询电子签详情
// @Tags     电子签
// @Produce  json
// @Security BearerAuth
// @Param    id  path      int  true  "合同ID"
// @Success  200  {object}  xresponse.Response
// @Router   /crm/contracts/{id}/esign [get]
func (h *EsignHandler) GetStatus(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	detail, err := h.svc.GetDetail(c.Request.Context(), uint(id))
	if err != nil {
		response.Fail(c, errcode.ErrNotFound, err.Error())
		return
	}
	response.OK(c, detail)
}

// Callback e签宝签署状态回调(public 组,免鉴权,VerifyCallback 验签)。
// e签宝回调 header:X-Tsign-Open-Timestamp + X-Tsign-Open-Signature;body 为 JSON(含 flowId / signFlowStatus)。
// TODO(联调):确认 e签宝回调 body 字段名(flowId/signFlowStatus 为推测)与期望的响应格式。
// @Summary  e签宝签署回调
// @Tags     电子签
// @Accept   json
// @Produce  json
// @Param    body  body  object  true  "e签宝回调数据"
// @Router   /crm/public/esign/callback [post]
func (h *EsignHandler) Callback(c *gin.Context) {
	appSecret := setting.Get(c.Request.Context(), "esign.app_secret")
	if appSecret == "" {
		// 未配置凭证:仍返回成功以避免 e签宝反复重试,但不处理
		response.OK(c, nil)
		return
	}
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "读取回调 body 失败")
		return
	}
	timestamp := c.GetHeader("X-Tsign-Open-Timestamp")
	signature := c.GetHeader("X-Tsign-Open-Signature")
	if !esignclient.VerifyCallback(timestamp, signature, body, appSecret) {
		response.Fail(c, errcode.ErrForbidden, "回调验签失败")
		return
	}
	var payload struct {
		FlowID string `json:"flowId"`
		Status int    `json:"signFlowStatus"`
	}
	if err := json.Unmarshal(body, &payload); err != nil || payload.FlowID == "" {
		response.Fail(c, errcode.ErrParam, "回调数据解析失败")
		return
	}
	if err := h.svc.HandleCallback(c.Request.Context(), payload.FlowID, payload.Status); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}
