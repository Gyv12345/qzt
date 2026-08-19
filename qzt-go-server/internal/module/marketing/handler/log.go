package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/module/marketing/service"
	"qzt-go-server/internal/module/system/errcode"
	syservice "qzt-go-server/internal/module/system/service"
	response "qzt-go-server/pkg/xresponse"
)

// LogHandler 营销线索同步日志。
type LogHandler struct {
	svc *service.LogService
}

func NewLogHandler() *LogHandler {
	return &LogHandler{svc: service.NewLogService()}
}

// List 同步日志列表
// @Summary  同步日志列表
// @Description  分页查询营销线索同步日志(账号/状态/关键词/日期窗)
// @Tags     营销
// @Produce  json
// @Param    page        query  int     false  "页码"
// @Param    page_size   query  int     false  "每页条数"
// @Param    account_id  query  int     false  "渠道账号ID"
// @Param    status      query  int     false  "状态(1已入库 2重复跳过 3失败)"
// @Param    keyword     query  string  false  "关键词(姓名/手机号)"
// @Param    start_time  query  string  false  "开始日期(YYYY-MM-DD)"
// @Param    end_time    query  string  false  "结束日期(YYYY-MM-DD)"
// @Success  200  {object}  xresponse.Response
// @Router   /marketing/logs [get]
func (h *LogHandler) List(c *gin.Context) {
	p := syservice.GetPagination(c)
	accountID, _ := strconv.ParseUint(c.Query("account_id"), 10, 64)
	status, _ := strconv.ParseInt(c.Query("status"), 10, 8)
	list, total, err := h.svc.List(c.Request.Context(), p.Page, p.PageSize,
		uint(accountID), int8(status),
		c.Query("keyword"), c.Query("start_time"), c.Query("end_time"))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}

// GetByID 同步日志详情
// @Summary  同步日志详情
// @Description  日志详情(含巨量返回的原始报文)
// @Tags     营销
// @Produce  json
// @Param    id  path  int  true  "日志ID"
// @Success  200  {object}  xresponse.Response
// @Router   /marketing/logs/:id [get]
func (h *LogHandler) GetByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	log, err := h.svc.GetByID(c.Request.Context(), uint(id))
	if err != nil {
		response.Fail(c, errcode.ErrNotFound, err.Error())
		return
	}
	response.OK(c, gin.H{"log": log, "raw": log.Raw})
}
