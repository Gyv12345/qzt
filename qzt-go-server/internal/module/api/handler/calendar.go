package handler

import (
	"strings"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/middleware"
	"qzt-go-server/internal/module/api/service"
	"qzt-go-server/internal/module/system/errcode"
	response "qzt-go-server/pkg/xresponse"
)

// CalendarHandler 统一日历聚合(各业务模块待办)。
type CalendarHandler struct {
	svc *service.CalendarService
}

func NewCalendarHandler() *CalendarHandler {
	return &CalendarHandler{svc: service.NewCalendarService()}
}

// Calendar 统一日历
// @Summary      统一日历
// @Description  聚合各业务模块(日程/跟进/商机/回款/会议/出差/请假/工作日志/项目/任务/应收/绩效)带日期的待办,仅返回当前用户的
// @Tags         日历
// @Produce      json
// @Security     BearerAuth
// @Param        start_date  query   string  false  "开始日期(YYYY-MM-DD)"
// @Param        end_date    query   string  false  "结束日期(YYYY-MM-DD)"
// @Param        sources     query   string  false  "来源(逗号分隔),省略=全部。可选:schedule,followup,opportunity,payment,meeting,trip,leave,worklog,project,task,receivable,performance"
// @Success      200  {object}  xresponse.Response
// @Router       /api/calendar [get]
func (h *CalendarHandler) Calendar(c *gin.Context) {
	userID := middleware.GetUserID(c)
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")
	var sources []string
	if s := c.Query("sources"); s != "" {
		for _, v := range strings.Split(s, ",") {
			if v = strings.TrimSpace(v); v != "" {
				sources = append(sources, v)
			}
		}
	}
	events, err := h.svc.List(c.Request.Context(), userID, startDate, endDate, sources)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": events})
}
