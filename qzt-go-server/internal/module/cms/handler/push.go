package handler

import (
	"github.com/gin-gonic/gin"

	cmsmodel "qzt-go-server/internal/model/cms"
	"qzt-go-server/internal/module/cms/errcode"
	"qzt-go-server/internal/module/cms/service"
	"qzt-go-server/internal/pkg/pagination"
	response "qzt-go-server/pkg/xresponse"
)

// PushHandler 搜索引擎主动推送(百度/IndexNow)。
type PushHandler struct {
	svc *service.PushService
}

func NewPushHandler() *PushHandler {
	return &PushHandler{svc: service.NewPushService()}
}

// pushRequest 手动推送请求:urls 与 article_ids 至少给一个,两者可混用。
type pushRequest struct {
	// 直接给完整 URL(会被域名白名单过滤)
	URLs []string `json:"urls"`
	// 或给文章ID(按 slug 拼公开链接,无 slug 的自动跳过)
	ArticleIDs []uint `json:"article_ids"`
}

// PushBaidu 手动推送到百度
// @Summary      推送百度
// @Description  将URL或文章公开链接提交到百度主动推送(24h内已推过的自动跳过;配额耗尽即停)
// @Tags         搜索引擎推送
// @Produce      json
// @Security     BearerAuth
// @Param        req body handler.pushRequest true "URL列表或文章ID列表"
// @Success      200  {object}  xresponse.Response
// @Router       /cms/push/baidu [post]
func (h *PushHandler) PushBaidu(c *gin.Context) {
	h.push(c, cmsmodel.PushChannelBaidu)
}

// PushIndexNow 手动推送到 IndexNow
// @Summary      推送 IndexNow
// @Description  将URL或文章公开链接批量提交到 IndexNow(自动分发 Bing/Yandex 等)
// @Tags         搜索引擎推送
// @Produce      json
// @Security     BearerAuth
// @Param        req body handler.pushRequest true "URL列表或文章ID列表"
// @Success      200  {object}  xresponse.Response
// @Router       /cms/push/indexnow [post]
func (h *PushHandler) PushIndexNow(c *gin.Context) {
	h.push(c, cmsmodel.PushChannelIndexNow)
}

func (h *PushHandler) push(c *gin.Context, channel string) {
	var req pushRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	if len(req.URLs) == 0 && len(req.ArticleIDs) == 0 {
		response.Fail(c, errcode.ErrParam, "请提供要推送的 urls 或 article_ids")
		return
	}
	res, err := h.svc.Push(c.Request.Context(), channel, req.URLs, req.ArticleIDs)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, res)
}

// ListPushLogs 推送日志
// @Summary      推送日志列表
// @Tags         搜索引擎推送
// @Produce      json
// @Security     BearerAuth
// @Param        page       query  int     false  "页码(默认1)"
// @Param        page_size  query  int     false  "每页条数(默认10,最大100)"
// @Param        channel    query  string  false  "通道过滤 baidu/indexnow"
// @Success      200  {object}  xresponse.Response
// @Router       /cms/push/logs [get]
func (h *PushHandler) ListPushLogs(c *gin.Context) {
	p := pagination.GetPagination(c)
	list, total, err := h.svc.ListLogs(c.Request.Context(), p.Page, p.PageSize, c.Query("channel"))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}
