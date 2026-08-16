package service

import (
	"context"

	"qzt-go-server/internal/repository"
	"qzt-go-server/pkg/xlogger"
)

// calendar.go 统一日历聚合服务。
// 把各业务模块带日期的待办聚合成统一事件,供 /oa/schedule 日历视图展示。
// 仅返回"我的"(按当前用户归属过滤)。日期取主日期(开始/计划/截止/到期),
// 范围用 BETWEEN(主日期落在查询区间内即展示)。单一来源查询出错只跳过该来源,不影响整体。
// 查询全部下沉 repository.CalendarRepo,本文件只做行 → 事件的映射。

// CalendarEvent 统一日历事件。颜色/标签/跳转由前端按 source 映射。
type CalendarEvent struct {
	ID        uint64 `json:"id"`
	Source    string `json:"source"` // schedule/followup/opportunity/payment/meeting/trip/leave/worklog/project/task/receivable/performance
	Title     string `json:"title"`
	StartTime string `json:"start_time"` // datetime 或 date 字符串
	EndTime   string `json:"end_time"`
	AllDay    bool   `json:"all_day"`
}

// CalendarService 日历聚合服务。
type CalendarService struct {
	calRepo *repository.CalendarRepo
}

func NewCalendarService() *CalendarService {
	return &CalendarService{calRepo: repository.NewCalendarRepo()}
}

func contains(src []string, s string) bool {
	for _, v := range src {
		if v == s {
			return true
		}
	}
	return false
}

func leaveTypeText(t string) string {
	switch t {
	case "ANNUAL":
		return "年假"
	case "SICK":
		return "病假"
	case "PERSONAL":
		return "事假"
	case "MARRIAGE":
		return "婚假"
	case "MATERNITY":
		return "产假"
	case "FUNERAL":
		return "丧假"
	default:
		if t == "" {
			return "请假"
		}
		return t
	}
}

// truncateRunes 截断字符串到 n 个 rune,超出加省略号。
func truncateRunes(s string, n int) string {
	r := []rune(s)
	if len(r) <= n {
		return s
	}
	return string(r[:n]) + "…"
}

// calendarSource 描述一个聚合来源: 名称、是否需要 empID、以及它的映射 loader。
type calendarSource struct {
	name     string
	needsEmp bool // 为真时, empID==0 则跳过(等价原 if want(name) && empID > 0)
	load     func(ctx context.Context, p repository.CalendarQuery) []CalendarEvent
}

// calendarSources 是来源清单, 顺序决定事件在结果中的分块顺序(与原 1-12 顺序一致)。
var calendarSources = []calendarSource{
	{"schedule", false, loadSchedule},
	{"followup", false, loadFollowup},
	{"opportunity", false, loadOpportunity},
	{"payment", false, loadPayment},
	{"meeting", false, loadMeeting},
	{"trip", false, loadTrip},
	{"leave", true, loadLeave},
	{"worklog", false, loadWorklog},
	{"project", false, loadProject},
	{"task", false, loadTask},
	{"receivable", false, loadReceivable},
	{"performance", true, loadPerformance},
}

// calRepo 各 loader 共用的 repo(无状态)。
var calRepo = repository.NewCalendarRepo()

// List 聚合各来源事件。sources 为空=全部。
// 单一来源查询出错只跳过该来源(各 loader 内部记日志并返回空),不影响整体。
func (s *CalendarService) List(ctx context.Context, userID uint, startDate, endDate string, sources []string) ([]CalendarEvent, error) {
	all := len(sources) == 0
	want := func(name string) bool { return all || contains(sources, name) }
	endDateTime := endDate + " 23:59:59"

	// 解析当前用户的 employee_id(HRM 来源用), 可能为 0(无关联员工)。
	var empID uint
	if want("leave") || want("performance") {
		empID = s.calRepo.EmpIDByUserID(ctx, userID)
	}

	p := repository.CalendarQuery{UserID: userID, EmpID: empID, StartDate: startDate, EndDate: endDate, EndDateTime: endDateTime}
	events := make([]CalendarEvent, 0)
	for _, src := range calendarSources {
		if !want(src.name) || (src.needsEmp && empID == 0) {
			continue
		}
		events = append(events, src.load(ctx, p)...)
	}
	return events, nil
}

// 1. OA 日程(手动新增)
func loadSchedule(ctx context.Context, p repository.CalendarQuery) []CalendarEvent {
	rows, err := calRepo.LoadSchedule(ctx, p)
	if err != nil {
		xlogger.ErrorfCtx(ctx, "calendar schedule query failed: %v", err)
		return nil
	}
	events := make([]CalendarEvent, 0, len(rows))
	for _, r := range rows {
		events = append(events, CalendarEvent{ID: uint64(r.ID), Source: "schedule", Title: r.Title, StartTime: r.Start, EndTime: r.End, AllDay: false})
	}
	return events
}

// 2. CRM 跟进计划(仅待办 status=0)
func loadFollowup(ctx context.Context, p repository.CalendarQuery) []CalendarEvent {
	rows, err := calRepo.LoadFollowup(ctx, p)
	if err != nil {
		xlogger.ErrorfCtx(ctx, "calendar followup query failed: %v", err)
		return nil
	}
	events := make([]CalendarEvent, 0, len(rows))
	for _, r := range rows {
		events = append(events, CalendarEvent{ID: uint64(r.ID), Source: "followup", Title: "跟进:" + truncateRunes(r.Content, 16), StartTime: r.Plan, AllDay: false})
	}
	return events
}

// 3. CRM 商机预计成交(未成交 stage NOT IN WON,LOST)
func loadOpportunity(ctx context.Context, p repository.CalendarQuery) []CalendarEvent {
	rows, err := calRepo.LoadOpportunity(ctx, p)
	if err != nil {
		xlogger.ErrorfCtx(ctx, "calendar opportunity query failed: %v", err)
		return nil
	}
	events := make([]CalendarEvent, 0, len(rows))
	for _, r := range rows {
		events = append(events, CalendarEvent{ID: uint64(r.ID), Source: "opportunity", Title: "商机成交:" + r.Name, StartTime: r.Close, AllDay: true})
	}
	return events
}

// 4. CRM 回款计划(JOIN 合同,owner=我)
func loadPayment(ctx context.Context, p repository.CalendarQuery) []CalendarEvent {
	rows, err := calRepo.LoadPayment(ctx, p)
	if err != nil {
		xlogger.ErrorfCtx(ctx, "calendar payment query failed: %v", err)
		return nil
	}
	events := make([]CalendarEvent, 0, len(rows))
	for _, r := range rows {
		events = append(events, CalendarEvent{ID: uint64(r.ID), Source: "payment", Title: "回款:" + truncateRunes(r.CName, 16), StartTime: r.Plan, AllDay: true})
	}
	return events
}

// 5. OA 会议预订
func loadMeeting(ctx context.Context, p repository.CalendarQuery) []CalendarEvent {
	rows, err := calRepo.LoadMeeting(ctx, p)
	if err != nil {
		xlogger.ErrorfCtx(ctx, "calendar meeting query failed: %v", err)
		return nil
	}
	events := make([]CalendarEvent, 0, len(rows))
	for _, r := range rows {
		events = append(events, CalendarEvent{ID: uint64(r.ID), Source: "meeting", Title: "会议:" + r.Title, StartTime: r.Start, EndTime: r.End, AllDay: false})
	}
	return events
}

// 6. OA 出差(显示在开始日)
func loadTrip(ctx context.Context, p repository.CalendarQuery) []CalendarEvent {
	rows, err := calRepo.LoadTrip(ctx, p)
	if err != nil {
		xlogger.ErrorfCtx(ctx, "calendar trip query failed: %v", err)
		return nil
	}
	events := make([]CalendarEvent, 0, len(rows))
	for _, r := range rows {
		events = append(events, CalendarEvent{ID: uint64(r.ID), Source: "trip", Title: "出差:" + r.Title, StartTime: r.Start, EndTime: r.End, AllDay: true})
	}
	return events
}

// 7. 请假(我的,显示在开始日) — needsEmp: empID==0 时跳过。
func loadLeave(ctx context.Context, p repository.CalendarQuery) []CalendarEvent {
	rows, err := calRepo.LoadLeave(ctx, p)
	if err != nil {
		xlogger.ErrorfCtx(ctx, "calendar leave query failed: %v", err)
		return nil
	}
	events := make([]CalendarEvent, 0, len(rows))
	for _, r := range rows {
		events = append(events, CalendarEvent{ID: uint64(r.ID), Source: "leave", Title: "请假:" + leaveTypeText(r.Type), StartTime: r.Start, EndTime: r.End, AllDay: true})
	}
	return events
}

// 8. 工作日志
func loadWorklog(ctx context.Context, p repository.CalendarQuery) []CalendarEvent {
	rows, err := calRepo.LoadWorklog(ctx, p)
	if err != nil {
		xlogger.ErrorfCtx(ctx, "calendar worklog query failed: %v", err)
		return nil
	}
	events := make([]CalendarEvent, 0, len(rows))
	for _, r := range rows {
		events = append(events, CalendarEvent{ID: uint64(r.ID), Source: "worklog", Title: "工作日志", StartTime: r.Day, AllDay: true})
	}
	return events
}

// 9. 项目(我负责或参与的,未完成,显示在开始日)
func loadProject(ctx context.Context, p repository.CalendarQuery) []CalendarEvent {
	rows, err := calRepo.LoadProject(ctx, p)
	if err != nil {
		xlogger.ErrorfCtx(ctx, "calendar project query failed: %v", err)
		return nil
	}
	events := make([]CalendarEvent, 0, len(rows))
	for _, r := range rows {
		events = append(events, CalendarEvent{ID: uint64(r.ID), Source: "project", Title: "项目:" + r.Name, StartTime: r.Start, EndTime: r.End, AllDay: true})
	}
	return events
}

// 10. 项目任务(我的,未完成)
func loadTask(ctx context.Context, p repository.CalendarQuery) []CalendarEvent {
	rows, err := calRepo.LoadTask(ctx, p)
	if err != nil {
		xlogger.ErrorfCtx(ctx, "calendar task query failed: %v", err)
		return nil
	}
	events := make([]CalendarEvent, 0, len(rows))
	for _, r := range rows {
		events = append(events, CalendarEvent{ID: uint64(r.ID), Source: "task", Title: "任务截止:" + r.Title, StartTime: r.Due, AllDay: true})
	}
	return events
}

// 11. 应收应付到期(关联合同 owner=我,未结清)
func loadReceivable(ctx context.Context, p repository.CalendarQuery) []CalendarEvent {
	rows, err := calRepo.LoadReceivable(ctx, p)
	if err != nil {
		xlogger.ErrorfCtx(ctx, "calendar receivable query failed: %v", err)
		return nil
	}
	events := make([]CalendarEvent, 0, len(rows))
	for _, r := range rows {
		prefix := "应收:"
		if r.Dir == "PAYABLE" {
			prefix = "应付:"
		}
		events = append(events, CalendarEvent{ID: uint64(r.ID), Source: "receivable", Title: prefix + r.Party, StartTime: r.Due, AllDay: true})
	}
	return events
}

// 12. 绩效考核(我的,显示在开始日) — needsEmp: empID==0 时跳过。
func loadPerformance(ctx context.Context, p repository.CalendarQuery) []CalendarEvent {
	rows, err := calRepo.LoadPerformance(ctx, p)
	if err != nil {
		xlogger.ErrorfCtx(ctx, "calendar performance query failed: %v", err)
		return nil
	}
	events := make([]CalendarEvent, 0, len(rows))
	for _, r := range rows {
		events = append(events, CalendarEvent{ID: uint64(r.ID), Source: "performance", Title: "绩效:" + r.Title, StartTime: r.Start, EndTime: r.End, AllDay: true})
	}
	return events
}
