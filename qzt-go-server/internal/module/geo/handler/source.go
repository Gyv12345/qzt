package handler

import (
	"errors"
	"strconv"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/module/geo/service"
	"qzt-go-server/internal/module/system/errcode"
	response "qzt-go-server/pkg/xresponse"
)

// source.go GEO 信源产线接口（选题池/稿件库/投递/抖音账号）。

// ListTopics 选题列表
// @Summary  选题列表
// @Tags     GEO
// @Produce  json
// @Param    page      query int    false "页码"
// @Param    page_size query int    false "每页条数"
// @Param    status    query string false "状态 pending/approved/rejected/used"
// @Param    origin    query string false "来源 matrix/ai/manual"
// @Success  200 {object} xresponse.Response
// @Router   /geo/topics [get]
func (h *GeoHandler) ListTopics(c *gin.Context) {
	page, pageSize := pageParams(c)
	list, total, err := h.source.ListTopics(c.Request.Context(), page, pageSize, c.Query("status"), c.Query("origin"))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}

// CreateTopic 新增选题
// @Summary  新增选题
// @Tags     GEO
// @Accept   json
// @Produce  json
// @Param    body body service.TopicPayload true "选题"
// @Success  200 {object} xresponse.Response
// @Router   /geo/topics [post]
func (h *GeoHandler) CreateTopic(c *gin.Context) {
	var req service.TopicPayload
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	m, err := h.source.CreateTopic(c.Request.Context(), &req)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, m)
}

// UpdateTopic 编辑选题
// @Summary  编辑选题
// @Tags     GEO
// @Accept   json
// @Produce  json
// @Param    id   path int true "选题ID"
// @Param    body body service.TopicPayload true "选题"
// @Success  200 {object} xresponse.Response
// @Router   /geo/topics/:id [put]
func (h *GeoHandler) UpdateTopic(c *gin.Context) {
	id, ok := pathID(c)
	if !ok {
		return
	}
	var req service.TopicPayload
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	if err := h.source.UpdateTopic(c.Request.Context(), id, &req); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// DeleteTopic 删除选题
// @Summary  删除选题
// @Tags     GEO
// @Produce  json
// @Param    id path int true "选题ID"
// @Success  200 {object} xresponse.Response
// @Router   /geo/topics/:id [delete]
func (h *GeoHandler) DeleteTopic(c *gin.Context) {
	id, ok := pathID(c)
	if !ok {
		return
	}
	if err := h.source.DeleteTopic(c.Request.Context(), id); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// ReviewTopic 审批选题
// @Summary  审批选题(approve=true 通过进入产稿队列,false 驳回)
// @Tags     GEO
// @Accept   json
// @Produce  json
// @Param    id   path int true "选题ID"
// @Param    body body handler.reviewRequest true "审批"
// @Success  200 {object} xresponse.Response
// @Router   /geo/topics/:id/review [post]
func (h *GeoHandler) ReviewTopic(c *gin.Context) {
	id, ok := pathID(c)
	if !ok {
		return
	}
	var req reviewRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	if err := h.source.ReviewTopic(c.Request.Context(), id, req.Approve); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

type reviewRequest struct {
	Approve bool `json:"approve"`
}

// GenerateTopics AI 生成选题
// @Summary  AI 生成选题(读最近监测结果找新机会)
// @Tags     GEO
// @Produce  json
// @Success  200 {object} xresponse.Response
// @Router   /geo/topics/generate [post]
func (h *GeoHandler) GenerateTopics(c *gin.Context) {
	n, err := h.source.GenerateTopics(c.Request.Context(), "manual")
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"inserted": n})
}

// ListSources 稿件列表
// @Summary  稿件列表
// @Tags     GEO
// @Produce  json
// @Param    page         query int    false "页码"
// @Param    page_size    query int    false "每页条数"
// @Param    content_type query string false "类型 article/video/video_script"
// @Param    platform     query string false "平台 wechat_mp/douyin/xhs/zhihu/csdn/toutiao"
// @Param    status       query string false "状态 generated/pushed/published/failed/skipped"
// @Param    qc_status    query string false "质检状态 none/pass/warn/blocked"
// @Success  200 {object} xresponse.Response
// @Router   /geo/sources [get]
func (h *GeoHandler) ListSources(c *gin.Context) {
	page, pageSize := pageParams(c)
	list, total, err := h.source.ListSources(c.Request.Context(), page, pageSize,
		c.Query("content_type"), c.Query("platform"), c.Query("status"), c.Query("qc_status"))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}

// CreateSource 手工新增稿件
// @Summary  手工新增稿件
// @Tags     GEO
// @Accept   json
// @Produce  json
// @Param    body body service.SourcePayload true "稿件"
// @Success  200 {object} xresponse.Response
// @Router   /geo/sources [post]
func (h *GeoHandler) CreateSource(c *gin.Context) {
	var req service.SourcePayload
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	m, err := h.source.CreateSource(c.Request.Context(), &req)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, m)
}

// UpdateSource 编辑稿件
// @Summary  编辑稿件
// @Tags     GEO
// @Accept   json
// @Produce  json
// @Param    id   path int true "稿件ID"
// @Param    body body service.SourcePayload true "稿件"
// @Success  200 {object} xresponse.Response
// @Router   /geo/sources/:id [put]
func (h *GeoHandler) UpdateSource(c *gin.Context) {
	id, ok := pathID(c)
	if !ok {
		return
	}
	var req service.SourcePayload
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	if err := h.source.UpdateSource(c.Request.Context(), id, &req); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// DeleteSource 删除稿件
// @Summary  删除稿件
// @Tags     GEO
// @Produce  json
// @Param    id path int true "稿件ID"
// @Success  200 {object} xresponse.Response
// @Router   /geo/sources/:id [delete]
func (h *GeoHandler) DeleteSource(c *gin.Context) {
	id, ok := pathID(c)
	if !ok {
		return
	}
	if err := h.source.DeleteSource(c.Request.Context(), id); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// PushSource 推送公众号草稿箱
// @Summary  推送稿件到公众号草稿箱(仅图文)
// @Tags     GEO
// @Produce  json
// @Param    id path int true "稿件ID"
// @Success  200 {object} xresponse.Response
// @Router   /geo/sources/:id/push [post]
func (h *GeoHandler) PushSource(c *gin.Context) {
	id, ok := pathID(c)
	if !ok {
		return
	}
	src, err := h.source.PushToDraft(c.Request.Context(), id)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, src)
}

// PublishSource API 直接发布
// @Summary  提交 freepublish 直接发布(仅认证账号)
// @Tags     GEO
// @Produce  json
// @Param    id path int true "稿件ID"
// @Success  200 {object} xresponse.Response
// @Router   /geo/sources/:id/publish [post]
func (h *GeoHandler) PublishSource(c *gin.Context) {
	id, ok := pathID(c)
	if !ok {
		return
	}
	src, err := h.source.PublishNow(c.Request.Context(), id)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, src)
}

// PushSourceDouyin 视频直发抖音
// @Summary  把已出片的视频稿直发抖音(account_id 留空取第一个可用账号)
// @Tags     GEO
// @Accept   json
// @Produce  json
// @Param    id   path int true "稿件ID"
// @Param    body body handler.douyinPushRequest false "账号(可选)"
// @Success  200 {object} xresponse.Response
// @Router   /geo/sources/:id/douyin [post]
func (h *GeoHandler) PushSourceDouyin(c *gin.Context) {
	id, ok := pathID(c)
	if !ok {
		return
	}
	var req douyinPushRequest
	_ = c.ShouldBindJSON(&req) // 允许空 body
	src, err := h.source.PushVideoToDouyin(c.Request.Context(), id, req.AccountID)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, src)
}

type douyinPushRequest struct {
	AccountID uint `json:"account_id"`
}

// RefreshPublish 查询发布状态
// @Summary  拉取 freepublish 发布状态(成功回填发布URL)
// @Tags     GEO
// @Produce  json
// @Param    id path int true "稿件ID"
// @Success  200 {object} xresponse.Response
// @Router   /geo/sources/:id/publish [get]
func (h *GeoHandler) RefreshPublish(c *gin.Context) {
	id, ok := pathID(c)
	if !ok {
		return
	}
	src, err := h.source.RefreshPublish(c.Request.Context(), id)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, src)
}

// GenerateVariant 生成分发稿
// @Summary  基于母稿生成另一平台差异化分发稿
// @Tags     GEO
// @Accept   json
// @Produce  json
// @Param    id   path int true "母稿ID"
// @Param    body body handler.variantRequest true "平台"
// @Success  200 {object} xresponse.Response
// @Router   /geo/sources/:id/variants [post]
func (h *GeoHandler) GenerateVariant(c *gin.Context) {
	id, ok := pathID(c)
	if !ok {
		return
	}
	var req variantRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	variant, err := h.source.GenerateVariant(c.Request.Context(), id, req.Platform)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, variant)
}

type variantRequest struct {
	Platform string `json:"platform"`
}

// GenerateSource 手动产稿
// @Summary  手动产稿(领取选题并即时产一篇图文)
// @Tags     GEO
// @Accept   json
// @Produce  json
// @Param    body body handler.generateRequest false "留空则自动领取选题"
// @Success  200 {object} xresponse.Response
// @Router   /geo/sources/generate [post]
func (h *GeoHandler) GenerateSource(c *gin.Context) {
	var req generateRequest
	_ = c.ShouldBindJSON(&req) // 允许空 body
	svc := h.source
	topic, err := svc.PickTopic(c.Request.Context(), req.TopicID)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	article, err := svc.ProduceArticleForTopic(c.Request.Context(), topic, "manual")
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, article)
}

type generateRequest struct {
	TopicID uint `json:"topic_id"`
}

// RunPipeline 手动跑产线
// @Summary  立即执行一轮产线(选题→图文+视频→投递,耗时数分钟)
// @Tags     GEO
// @Produce  json
// @Success  200 {object} xresponse.Response
// @Router   /geo/sources/run [post]
func (h *GeoHandler) RunPipeline(c *gin.Context) {
	res, err := h.source.RunPipeline(c.Request.Context(), "manual")
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, res)
}

// DouyinAuthorizeURL 抖音授权链接
// @Summary  获取抖音授权链接(浏览器打开扫码授权)
// @Tags     GEO
// @Produce  json
// @Success  200 {object} xresponse.Response
// @Router   /geo/platforms/douyin/authorize [get]
func (h *GeoHandler) DouyinAuthorizeURL(c *gin.Context) {
	u, err := h.source.DouyinAuthorizeURL(c.Request.Context())
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"url": u})
}

// BindDouyin 抖音绑定
// @Summary  用授权回调 code 绑定抖音账号
// @Tags     GEO
// @Accept   json
// @Produce  json
// @Param    body body handler.bindDouyinRequest true "code"
// @Success  200 {object} xresponse.Response
// @Router   /geo/platforms/douyin/bind [post]
func (h *GeoHandler) BindDouyin(c *gin.Context) {
	var req bindDouyinRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	acc, err := h.source.BindDouyin(c.Request.Context(), req.Code)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, acc)
}

type bindDouyinRequest struct {
	Code string `json:"code"`
}

// ListDouyinAccounts 抖音账号列表
// @Summary  已绑定的抖音账号
// @Tags     GEO
// @Produce  json
// @Success  200 {object} xresponse.Response
// @Router   /geo/platforms/douyin/accounts [get]
func (h *GeoHandler) ListDouyinAccounts(c *gin.Context) {
	list, err := h.source.ListDouyinAccounts(c.Request.Context())
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": len(list)})
}

// DeleteDouyinAccount 抖音解绑
// @Summary  解绑抖音账号
// @Tags     GEO
// @Produce  json
// @Param    id path int true "账号ID"
// @Success  200 {object} xresponse.Response
// @Router   /geo/platforms/douyin/accounts/:id [delete]
func (h *GeoHandler) DeleteDouyinAccount(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil || id == 0 {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	if err := h.source.DeleteDouyinAccount(c.Request.Context(), uint(id)); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// QCSource 手动质检稿件（P18 质检门禁）
// @Summary  手动质检稿件
// @Tags     GEO
// @Produce  json
// @Param    id path int true "稿件ID"
// @Success  200 {object} xresponse.Response
// @Router   /geo/sources/:id/qc [post]
func (h *GeoHandler) QCSource(c *gin.Context) {
	id, ok := pathID(c)
	if !ok {
		return
	}
	src, err := h.source.RunQC(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, service.ErrQCSkipped) {
			response.OK(c, gin.H{"skipped": true, "message": "LLM 不可用或结果不可解析，稿件按未质检放行"})
			return
		}
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"qc_status": src.QcStatus, "qc_result": src.QcResult})
}
