package handler

import (
	"encoding/csv"
	"fmt"
	"strconv"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/module/geo/service"
	"qzt-go-server/internal/module/system/errcode"
	response "qzt-go-server/pkg/xresponse"
)

// GeoHandler GEO 监测与信源产线接口（提示词库/平台/轮次/趋势/导出 + 选题/稿件/投递）。
type GeoHandler struct {
	svc    *service.MonitorService
	source *service.SourceService
}

func NewGeoHandler() *GeoHandler {
	return &GeoHandler{svc: service.NewMonitorService(), source: service.NewSourceService()}
}

// ListPrompts 提示词列表
// @Summary  提示词列表
// @Tags     GEO
// @Produce  json
// @Param    page     query  int  false "页码"
// @Param    page_size query int  false "每页条数"
// @Param    group_type query string false "分组 brand/category/scenario"
// @Param    keyword  query  string false "问题关键词"
// @Success  200 {object} xresponse.Response
// @Router   /geo/prompts [get]
func (h *GeoHandler) ListPrompts(c *gin.Context) {
	page, pageSize := pageParams(c)
	list, total, err := h.svc.ListPrompts(c.Request.Context(), page, pageSize,
		c.Query("group_type"), c.Query("keyword"))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}

// CreatePrompt 新增提示词
// @Summary  新增提示词
// @Tags     GEO
// @Accept   json
// @Produce  json
// @Param    body body service.PromptPayload true "提示词"
// @Success  200 {object} xresponse.Response
// @Router   /geo/prompts [post]
func (h *GeoHandler) CreatePrompt(c *gin.Context) {
	var req service.PromptPayload
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	m, err := h.svc.CreatePrompt(c.Request.Context(), &req)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, m)
}

// UpdatePrompt 编辑提示词
// @Summary  编辑提示词
// @Tags     GEO
// @Accept   json
// @Produce  json
// @Param    id   path int true "提示词ID"
// @Param    body body service.PromptPayload true "提示词"
// @Success  200 {object} xresponse.Response
// @Router   /geo/prompts/:id [put]
func (h *GeoHandler) UpdatePrompt(c *gin.Context) {
	id, ok := pathID(c)
	if !ok {
		return
	}
	var req service.PromptPayload
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	if err := h.svc.UpdatePrompt(c.Request.Context(), id, &req); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// DeletePrompt 删除提示词
// @Summary  删除提示词
// @Tags     GEO
// @Produce  json
// @Param    id path int true "提示词ID"
// @Success  200 {object} xresponse.Response
// @Router   /geo/prompts/:id [delete]
func (h *GeoHandler) DeletePrompt(c *gin.Context) {
	id, ok := pathID(c)
	if !ok {
		return
	}
	if err := h.svc.DeletePrompt(c.Request.Context(), id); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// ListPlatforms 平台列表
// @Summary  平台列表(API Key 只回掩码)
// @Tags     GEO
// @Produce  json
// @Success  200 {object} xresponse.Response
// @Router   /geo/platforms [get]
func (h *GeoHandler) ListPlatforms(c *gin.Context) {
	list, err := h.svc.ListPlatforms(c.Request.Context())
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": len(list)})
}

// CreatePlatform 新增平台
// @Summary  新增监测平台
// @Tags     GEO
// @Accept   json
// @Produce  json
// @Param    body body service.PlatformPayload true "平台"
// @Success  200 {object} xresponse.Response
// @Router   /geo/platforms [post]
func (h *GeoHandler) CreatePlatform(c *gin.Context) {
	var req service.PlatformPayload
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	v, err := h.svc.CreatePlatform(c.Request.Context(), &req)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, v)
}

// UpdatePlatform 编辑平台
// @Summary  编辑平台(api_key 留空保留原值)
// @Tags     GEO
// @Accept   json
// @Produce  json
// @Param    id   path int true "平台ID"
// @Param    body body service.PlatformPayload true "平台"
// @Success  200 {object} xresponse.Response
// @Router   /geo/platforms/:id [put]
func (h *GeoHandler) UpdatePlatform(c *gin.Context) {
	id, ok := pathID(c)
	if !ok {
		return
	}
	var req service.PlatformPayload
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	if err := h.svc.UpdatePlatform(c.Request.Context(), id, &req); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// DeletePlatform 删除平台
// @Summary  删除平台
// @Tags     GEO
// @Produce  json
// @Param    id path int true "平台ID"
// @Success  200 {object} xresponse.Response
// @Router   /geo/platforms/:id [delete]
func (h *GeoHandler) DeletePlatform(c *gin.Context) {
	id, ok := pathID(c)
	if !ok {
		return
	}
	if err := h.svc.DeletePlatform(c.Request.Context(), id); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// StartRun 手动触发一轮监测
// @Summary  手动触发监测(异步执行)
// @Tags     GEO
// @Produce  json
// @Success  200 {object} xresponse.Response
// @Router   /geo/runs [post]
func (h *GeoHandler) StartRun(c *gin.Context) {
	result, err := h.svc.StartRun(c.Request.Context(), "manual")
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, result)
}

// ListRuns 轮次列表
// @Summary  监测轮次列表
// @Tags     GEO
// @Produce  json
// @Param    page      query int false "页码"
// @Param    page_size query int false "每页条数"
// @Success  200 {object} xresponse.Response
// @Router   /geo/runs [get]
func (h *GeoHandler) ListRuns(c *gin.Context) {
	page, pageSize := pageParams(c)
	list, total, err := h.svc.ListRuns(c.Request.Context(), page, pageSize)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}

// GetRun 轮次详情
// @Summary  轮次详情
// @Tags     GEO
// @Produce  json
// @Param    id path int true "轮次ID"
// @Success  200 {object} xresponse.Response
// @Router   /geo/runs/:id [get]
func (h *GeoHandler) GetRun(c *gin.Context) {
	id, ok := pathID(c)
	if !ok {
		return
	}
	run, err := h.svc.GetRun(c.Request.Context(), id)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, run)
}

// ListResults 轮次结果明细
// @Summary  轮次结果明细(含回答全文)
// @Tags     GEO
// @Produce  json
// @Param    id path int true "轮次ID"
// @Success  200 {object} xresponse.Response
// @Router   /geo/runs/:id/results [get]
func (h *GeoHandler) ListResults(c *gin.Context) {
	id, ok := pathID(c)
	if !ok {
		return
	}
	list, err := h.svc.ListResults(c.Request.Context(), id)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	promptNames, platformNames, err := h.svc.NameMaps(c.Request.Context())
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	rows := make([]gin.H, 0, len(list))
	for _, r := range list {
		rows = append(rows, gin.H{
			"id": r.ID, "run_id": r.RunID, "prompt_id": r.PromptID,
			"platform_id":   r.PlatformID,
			"prompt_text":   promptNames[r.PromptID],
			"platform_name": platformNames[r.PlatformID],
			"score":         r.Score, "mention_brand": r.MentionBrand,
			"has_own_link": r.HasOwnLink, "own_cite": r.OwnCite,
			"cited_urls": r.CitedURLs, "competitors": r.Competitors,
			"latency_ms": r.LatencyMs, "status": r.Status,
			"error_msg": r.ErrorMsg, "answer": r.Answer,
			"created_at": r.CreatedAt,
		})
	}
	response.OK(c, gin.H{"list": rows, "total": len(rows)})
}

// Trend 指标趋势
// @Summary  最近 N 轮指标趋势
// @Tags     GEO
// @Produce  json
// @Param    limit query int false "轮数上限(默认12)"
// @Success  200 {object} xresponse.Response
// @Router   /geo/trend [get]
func (h *GeoHandler) Trend(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "12"))
	list, err := h.svc.Trend(c.Request.Context(), limit)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, list)
}

// ExportRun 导出一轮明细 CSV
// @Summary  导出轮次明细(CSV,UTF-8 BOM)
// @Tags     GEO
// @Produce  text/csv
// @Param    id path int true "轮次ID"
// @Success  200 {string} string
// @Router   /geo/runs/:id/export [get]
func (h *GeoHandler) ExportRun(c *gin.Context) {
	id, ok := pathID(c)
	if !ok {
		return
	}
	// 校验轮次存在性(不存在时返回错误)
	if _, err := h.svc.GetRun(c.Request.Context(), id); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	results, err := h.svc.ListResults(c.Request.Context(), id)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	promptNames, platformNames, err := h.svc.NameMaps(c.Request.Context())
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}

	c.Header("Content-Type", "text/csv; charset=utf-8")
	c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="geo_run_%d.csv"`, id))
	// BOM:让 Excel 正确识别 UTF-8 中文
	_, _ = c.Writer.WriteString("\xEF\xBB\xBF")
	w := csv.NewWriter(c.Writer)
	_ = w.Write([]string{"平台", "问题", "得分", "提及行简", "含官网链接", "自有引用", "竞品", "引用URL", "耗时ms", "状态", "错误信息"})
	for _, r := range results {
		_ = w.Write([]string{
			platformNames[r.PlatformID], promptNames[r.PromptID],
			strconv.Itoa(r.Score),
			boolStr(r.MentionBrand), boolStr(r.HasOwnLink), boolStr(r.OwnCite),
			r.Competitors, r.CitedURLs,
			strconv.FormatInt(r.LatencyMs, 10),
			r.Status, r.ErrorMsg,
		})
	}
	w.Flush()
}

// ── 工具 ──

func pageParams(c *gin.Context) (page, pageSize int) {
	page, _ = strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ = strconv.Atoi(c.DefaultQuery("page_size", "20"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}
	return page, pageSize
}

func pathID(c *gin.Context) (uint, bool) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil || id == 0 {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return 0, false
	}
	return uint(id), true
}

func boolStr(b bool) string {
	if b {
		return "是"
	}
	return "否"
}
