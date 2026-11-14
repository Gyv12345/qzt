package handler

import (
	"strconv"
	"time"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/middleware"
	"qzt-go-server/internal/module/cloud/service"
	"qzt-go-server/internal/module/system/errcode"
	"qzt-go-server/internal/pkg/cache"
	"qzt-go-server/pkg/xlogger"
	response "qzt-go-server/pkg/xresponse"
)

// share.go 网盘分享:创建/列表/取消(登录态)+ 公开元信息/公开下载(免登录)。
// Uploader 由 service 层运行期懒取(app.GetUploader),handler 不再注入实例,
// 保证存储配置热切换后分享下载即刻用新驱动签名。
type ShareHandler struct {
	svc *service.ShareService
}

func NewShareHandler() *ShareHandler {
	return &ShareHandler{svc: service.NewShareService()}
}

// CreateShare 创建分享
// @Summary      创建文件分享
// @Description  校验文件属主/非文件夹/状态正常;expire_days 白名单 7/30;单用户活跃分享上限 200
// @Tags         网盘-分享
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body  service.CreateShareRequest  true  "文件ID/有效期天数/提取码(可空)"
// @Success      200  {object}  xresponse.Response
// @Router       /cloud/shares [post]
func (h *ShareHandler) CreateShare(c *gin.Context) {
	var req service.CreateShareRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	userID := middleware.GetUserID(c)
	created, err := h.svc.Create(c.Request.Context(), &req, userID)
	if err != nil {
		response.Fail(c, errcode.ErrParam, err.Error())
		return
	}
	response.OK(c, created)
}

// ListShares 我的分享列表
// @Summary      我创建的分享分页
// @Description  联 cloud_file 返回文件名/大小,含下载次数
// @Tags         网盘-分享
// @Produce      json
// @Security     BearerAuth
// @Param        page       query  int  false  "页码(默认1)"
// @Param        page_size  query  int  false  "每页条数(默认10,最大100)"
// @Success      200  {object}  xresponse.Response
// @Router       /cloud/shares [get]
func (h *ShareHandler) ListShares(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 10
	}
	userID := middleware.GetUserID(c)
	list, total, err := h.svc.List(c.Request.Context(), userID, page, pageSize)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}

// CancelShare 取消分享
// @Summary      取消分享
// @Description  仅本人可取消,置 disabled=1,公开侧立即失效
// @Tags         网盘-分享
// @Produce      json
// @Security     BearerAuth
// @Param        id  path  int  true  "分享ID"
// @Success      200  {object}  xresponse.Response
// @Router       /cloud/shares/{id} [delete]
func (h *ShareHandler) CancelShare(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	userID := middleware.GetUserID(c)
	if err := h.svc.Cancel(c.Request.Context(), uint(id), userID); err != nil {
		response.Fail(c, errcode.ErrParam, err.Error())
		return
	}
	response.OK(c, nil)
}

// PublicGetShareMeta 分享元信息
// @Summary      公开获取分享元信息
// @Description  免登录;返回文件名/大小/过期时间/是否需要提取码/下载次数
// @Tags         公共接口
// @Produce      json
// @Param        token  path  string  true  "分享令牌"
// @Success      200  {object}  xresponse.Response
// @Router       /cloud/public/shares/{token} [get]
func (h *ShareHandler) PublicGetShareMeta(c *gin.Context) {
	meta, err := h.svc.GetPublicMeta(c.Request.Context(), c.Param("token"))
	if err != nil {
		response.Fail(c, errcode.ErrNotFound, "分享链接已失效")
		return
	}
	response.OK(c, meta)
}

type ShareDownloadRequest struct {
	Code string `json:"code"`
}

// PublicDownload 公开下载
// @Summary      公开获取分享下载地址
// @Description  免登录;校验提取码(恒时比较)后签出 10 分钟有效下载 URL;每 IP 每分钟 10 次
// @Tags         公共接口
// @Accept       json
// @Produce      json
// @Param        token  path  string  true  "分享令牌"
// @Param        body   body  ShareDownloadRequest  false  "提取码(无提取码分享可不传)"
// @Success      200  {object}  xresponse.Response
// @Router       /cloud/public/shares/{token}/download [post]
func (h *ShareHandler) PublicDownload(c *gin.Context) {
	// 频率限制:同一 IP 每分钟最多 10 次
	ip := c.ClientIP()
	rateKey := "cloud:share:dl:rate:" + ip
	count, _ := cache.GetStore().Incr(rateKey)
	if count == 1 {
		cache.GetStore().Expire(rateKey, time.Minute)
	}
	if count > 10 {
		response.Fail(c, errcode.ErrParam, "请求过于频繁,请稍后再试")
		return
	}

	var req ShareDownloadRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		// 下载可无 body,绑定失败按空提取码处理
		req.Code = ""
	}
	url, err := h.svc.PublicDownload(c.Request.Context(), c.Param("token"), req.Code)
	if err != nil {
		if err == service.ErrShareInvalid {
			response.Fail(c, errcode.ErrNotFound, "分享链接已失效")
			return
		}
		response.Fail(c, errcode.ErrParam, err.Error())
		return
	}
	xlogger.InfofCtx(c.Request.Context(), "网盘分享下载成功: ip=%s", ip)
	response.OK(c, gin.H{"download_url": url})
}
