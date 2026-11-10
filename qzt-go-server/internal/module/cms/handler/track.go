package handler

import (
	"strconv"
	"time"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/module/cms/errcode"
	"qzt-go-server/internal/module/cms/service"
	"qzt-go-server/internal/pkg/cache"
	"qzt-go-server/internal/pkg/pagination"
	response "qzt-go-server/pkg/xresponse"
)

// TrackHandler 官网埋点:公开批量上报 + 管理端统计查询。
type TrackHandler struct {
	svc *service.TrackService
}

func NewTrackHandler() *TrackHandler {
	return &TrackHandler{svc: service.NewTrackService()}
}

// Ingest 批量上报埋点事件(公开,无需登录)
// @Summary      埋点批量上报(公开)
// @Description  官网前台访客行为批量上报,单批最多 20 条;IP/UA 由服务端从请求上下文提取
// @Tags         CMS公开
// @Accept       json
// @Produce      json
// @Param        body  body  service.TrackIngestRequest  true  "事件批次"
// @Success      200  {object}  xresponse.Response
// @Router       /cms/public/track [post]
func (h *TrackHandler) Ingest(c *gin.Context) {
	// 频率限制:同一 IP 每分钟最多 30 次(正常页面单访客每 5 秒 flush 一次,余量充足)。
	// 埋点是旁路数据,超限同样返回 200,不让客户端重试。
	rateKey := "track:rate:" + c.ClientIP()
	if count, _ := cache.GetStore().Incr(rateKey); count == 1 {
		cache.GetStore().Expire(rateKey, time.Minute)
	} else if count > 30 {
		response.OK(c, gin.H{"accepted": 0})
		return
	}

	var req service.TrackIngestRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, err.Error())
		return
	}
	accepted, err := h.svc.Ingest(c.Request.Context(), &req, c.ClientIP(), c.Request.UserAgent())
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	// 上报方不关心结果,固定 200;accepted 便于联调确认。
	response.OK(c, gin.H{"accepted": accepted})
}

// Summary 访问统计汇总(管理端)
// @Summary      访问统计汇总
// @Description  近 N 天(含今日)PV/UV、按天序列、页面/事件/来源 Top 榜
// @Tags         访问统计
// @Produce      json
// @Security     BearerAuth
// @Param        days  query  int  false  "统计窗口天数(默认7,最大180)"
// @Success      200  {object}  xresponse.Response
// @Router       /cms/track/summary [get]
func (h *TrackHandler) Summary(c *gin.Context) {
	days := 7
	if d := c.Query("days"); d != "" {
		if v, err := strconv.Atoi(d); err == nil {
			days = v
		}
	}
	out, err := h.svc.Summary(c.Request.Context(), days)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, out)
}

// List 原始事件分页(管理端)
// @Summary      埋点事件列表
// @Description  近 N 天原始事件分页,排查用
// @Tags         访问统计
// @Produce      json
// @Security     BearerAuth
// @Param        page       query  int     false  "页码(默认1)"
// @Param        page_size  query  int     false  "每页条数(默认20,最大100)"
// @Param        days       query  int     false  "时间窗口天数(默认7,最大180)"
// @Param        event      query  string  false  "事件名过滤"
// @Success      200  {object}  xresponse.Response
// @Router       /cms/track/list [get]
func (h *TrackHandler) List(c *gin.Context) {
	p := pagination.GetPagination(c)
	days := 7
	if d := c.Query("days"); d != "" {
		if v, err := strconv.Atoi(d); err == nil {
			days = v
		}
	}
	list, total, err := h.svc.List(c.Request.Context(), p.Page, p.PageSize, days, c.Query("event"))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}
