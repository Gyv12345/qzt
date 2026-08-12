package service

import (
	"context"

	"gorm.io/gorm"

	"qzt-go-server/internal/repository"
	"qzt-go-server/pkg/xlogger"
)

// calendar.go 统一日历聚合服务。
// 把各业务模块带日期的待办聚合成统一事件,供 /oa/schedule 日历视图展示。
// 仅返回"我的"(按当前用户归属过滤)。日期取主日期(开始/计划/截止/到期),
// 范围用 BETWEEN(主日期落在查询区间内即展示)。单一来源查询出错只跳过该来源,不影响整体。

// CalendarEvent 统一日历事件。颜色/标签/跳转由前端按 source 映射。
type CalendarEvent struct {
	ID        uint64 `json:"id"`
	Source    string `json:"source"`    // schedule/followup/opportunity/payment/meeting/trip/leave/worklog/project/task/receivable/performance
	Title     string `json:"title"`
	StartTime string `json:"start_time"` // datetime 或 date 字符串
	EndTime   string `json:"end_time"`
	AllDay    bool   `json:"all_day"`
}

// CalendarService 日历聚合服务。
type CalendarService struct{}

func NewCalendarService() *CalendarService { return &CalendarService{} }

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

// calendarQuery 携带每次 List 调用共享的过滤参数,传给所有 source loader。
type calendarQuery struct {
	userID      uint
	empID       uint // HRM 来源用(leave/performance), 0 表示无关联员工
	startDate   string
	endDate     string
	endDateTime string // endDate + " 23:59:59", datetime 列的当日结束边界
}

// calendarSource 描述一个聚合来源: 名称、是否需要 empID、以及它的查询+映射 loader。
type calendarSource struct {
	name     string
	needsEmp bool // 为真时, empID==0 则跳过(等价原 if want(name) && empID > 0)
	load     func(ctx context.Context, db *gorm.DB, p calendarQuery) []CalendarEvent
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

// List 聚合各来源事件。sources 为空=全部。
// 单一来源查询出错只跳过该来源(各 loader 内部记日志并返回空),不影响整体。
func (s *CalendarService) List(ctx context.Context, userID uint, startDate, endDate string, sources []string) ([]CalendarEvent, error) {
	db := repository.DBFrom(ctx)
	all := len(sources) == 0
	want := func(name string) bool { return all || contains(sources, name) }
	endDateTime := endDate + " 23:59:59"

	// 解析当前用户的 employee_id(HRM 来源用), 可能为 0(无关联员工)。
	var empID uint
	if want("leave") || want("performance") {
		_ = db.Table("hrm_employee").Select("id").
			Where("user_id = ? AND deleted_at IS NULL", userID).Limit(1).Scan(&empID).Error
	}

	p := calendarQuery{userID: userID, empID: empID, startDate: startDate, endDate: endDate, endDateTime: endDateTime}
	events := make([]CalendarEvent, 0)
	for _, src := range calendarSources {
		if !want(src.name) || (src.needsEmp && empID == 0) {
			continue
		}
		events = append(events, src.load(ctx, db, p)...)
	}
	return events, nil
}

// 1. OA 日程(手动新增)
func loadSchedule(ctx context.Context, db *gorm.DB, p calendarQuery) []CalendarEvent {
	var rows []struct {
		ID    uint   `gorm:"column:id"`
		Title string `gorm:"column:title"`
		Start string `gorm:"column:start_time"`
		End   string `gorm:"column:end_time"`
	}
	if err := db.Table("oa_schedule").Select("id, title, start_time, end_time").
		Where("creator_id = ? AND deleted_at IS NULL AND start_time >= ? AND start_time <= ?", p.userID, p.startDate, p.endDateTime).
		Order("start_time ASC").Scan(&rows).Error; err != nil {
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
func loadFollowup(ctx context.Context, db *gorm.DB, p calendarQuery) []CalendarEvent {
	var rows []struct {
		ID      uint   `gorm:"column:id"`
		Content string `gorm:"column:content"`
		Plan    string `gorm:"column:plan_time"`
	}
	if err := db.Table("follow_up_plan").Select("id, content, plan_time").
		Where("owner_id = ? AND status = 0 AND deleted_at IS NULL AND plan_time >= ? AND plan_time <= ?", p.userID, p.startDate, p.endDateTime).
		Order("plan_time ASC").Scan(&rows).Error; err != nil {
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
func loadOpportunity(ctx context.Context, db *gorm.DB, p calendarQuery) []CalendarEvent {
	var rows []struct {
		ID    uint   `gorm:"column:id"`
		Name  string `gorm:"column:name"`
		Close string `gorm:"column:expected_close_date"`
	}
	if err := db.Table("crm_opportunity").Select("id, name, expected_close_date").
		Where("owner_id = ? AND deleted_at IS NULL AND expected_close_date IS NOT NULL AND expected_close_date BETWEEN ? AND ? AND stage NOT IN (?, ?)", p.userID, p.startDate, p.endDate, "WON", "LOST").
		Order("expected_close_date ASC").Scan(&rows).Error; err != nil {
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
func loadPayment(ctx context.Context, db *gorm.DB, p calendarQuery) []CalendarEvent {
	var rows []struct {
		ID    uint   `gorm:"column:id"`
		Plan  string `gorm:"column:plan_date"`
		CName string `gorm:"column:contract_name"`
	}
	if err := db.Table("crm_contract_payment_plan p").
		Select("p.id, p.plan_date, c.name AS contract_name").
		Joins("JOIN crm_contract c ON c.id = p.contract_id AND c.deleted_at IS NULL").
		Where("p.deleted_at IS NULL AND c.owner_id = ? AND p.plan_date BETWEEN ? AND ?", p.userID, p.startDate, p.endDate).
		Order("p.plan_date ASC").Scan(&rows).Error; err != nil {
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
func loadMeeting(ctx context.Context, db *gorm.DB, p calendarQuery) []CalendarEvent {
	var rows []struct {
		ID    uint   `gorm:"column:id"`
		Title string `gorm:"column:title"`
		Start string `gorm:"column:start_time"`
		End   string `gorm:"column:end_time"`
	}
	if err := db.Table("oa_meeting_booking").Select("id, title, start_time, end_time").
		Where("organizer_id = ? AND deleted_at IS NULL AND start_time >= ? AND start_time <= ?", p.userID, p.startDate, p.endDateTime).
		Order("start_time ASC").Scan(&rows).Error; err != nil {
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
func loadTrip(ctx context.Context, db *gorm.DB, p calendarQuery) []CalendarEvent {
	var rows []struct {
		ID    uint   `gorm:"column:id"`
		Title string `gorm:"column:title"`
		Start string `gorm:"column:start_date"`
		End   string `gorm:"column:end_date"`
	}
	if err := db.Table("oa_business_trip").Select("id, title, start_date, end_date").
		Where("applicant_id = ? AND deleted_at IS NULL AND start_date BETWEEN ? AND ?", p.userID, p.startDate, p.endDate).
		Order("start_date ASC").Scan(&rows).Error; err != nil {
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
func loadLeave(ctx context.Context, db *gorm.DB, p calendarQuery) []CalendarEvent {
	var rows []struct {
		ID    uint   `gorm:"column:id"`
		Type  string `gorm:"column:leave_type"`
		Start string `gorm:"column:start_date"`
		End   string `gorm:"column:end_date"`
	}
	if err := db.Table("hrm_leave").Select("id, leave_type, start_date, end_date").
		Where("employee_id = ? AND deleted_at IS NULL AND start_date >= ? AND start_date <= ?", p.empID, p.startDate, p.endDateTime).
		Order("start_date ASC").Scan(&rows).Error; err != nil {
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
func loadWorklog(ctx context.Context, db *gorm.DB, p calendarQuery) []CalendarEvent {
	var rows []struct {
		ID  uint   `gorm:"column:id"`
		Day string `gorm:"column:log_date"`
	}
	if err := db.Table("oa_work_log").Select("id, log_date").
		Where("creator_id = ? AND deleted_at IS NULL AND log_date BETWEEN ? AND ?", p.userID, p.startDate, p.endDate).
		Scan(&rows).Error; err != nil {
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
func loadProject(ctx context.Context, db *gorm.DB, p calendarQuery) []CalendarEvent {
	var rows []struct {
		ID    uint   `gorm:"column:id"`
		Name  string `gorm:"column:name"`
		Start string `gorm:"column:start_date"`
		End   string `gorm:"column:end_date"`
	}
	if err := db.Table("proj_project").Select("id, name, start_date, end_date").
		Where("deleted_at IS NULL AND status NOT IN (?, ?) AND start_date BETWEEN ? AND ? AND (manager_id = ? OR FIND_IN_SET(?, member_ids))", 4, 5, p.startDate, p.endDate, p.userID, p.userID).
		Order("start_date ASC").Scan(&rows).Error; err != nil {
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
func loadTask(ctx context.Context, db *gorm.DB, p calendarQuery) []CalendarEvent {
	var rows []struct {
		ID    uint   `gorm:"column:id"`
		Title string `gorm:"column:title"`
		Due   string `gorm:"column:due_date"`
	}
	if err := db.Table("proj_task").Select("id, title, due_date").
		Where("assignee_id = ? AND deleted_at IS NULL AND status IN (?, ?) AND due_date IS NOT NULL AND due_date BETWEEN ? AND ?", p.userID, 1, 2, p.startDate, p.endDate).
		Order("due_date ASC").Scan(&rows).Error; err != nil {
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
func loadReceivable(ctx context.Context, db *gorm.DB, p calendarQuery) []CalendarEvent {
	var rows []struct {
		ID    uint   `gorm:"column:id"`
		Dir   string `gorm:"column:direction"`
		Party string `gorm:"column:party_name"`
		Due   string `gorm:"column:due_date"`
	}
	if err := db.Table("fin_receivable").Select("id, direction, party_name, due_date").
		Where("deleted_at IS NULL AND due_date IS NOT NULL AND due_date BETWEEN ? AND ? AND status IN (?, ?) AND biz_type = ? AND biz_id IN (SELECT id FROM crm_contract WHERE owner_id = ? AND deleted_at IS NULL)", p.startDate, p.endDate, 0, 1, "CONTRACT", p.userID).
		Order("due_date ASC").Scan(&rows).Error; err != nil {
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
func loadPerformance(ctx context.Context, db *gorm.DB, p calendarQuery) []CalendarEvent {
	var rows []struct {
		ID    uint   `gorm:"column:id"`
		Title string `gorm:"column:title"`
		Start string `gorm:"column:start_date"`
		End   string `gorm:"column:end_date"`
	}
	if err := db.Table("hrm_performance").Select("id, title, start_date, end_date").
		Where("deleted_at IS NULL AND start_date BETWEEN ? AND ? AND (employee_id = ? OR reviewer_id = ?)", p.startDate, p.endDate, p.empID, p.userID).
		Order("start_date ASC").Scan(&rows).Error; err != nil {
		xlogger.ErrorfCtx(ctx, "calendar performance query failed: %v", err)
		return nil
	}
	events := make([]CalendarEvent, 0, len(rows))
	for _, r := range rows {
		events = append(events, CalendarEvent{ID: uint64(r.ID), Source: "performance", Title: "绩效:" + r.Title, StartTime: r.Start, EndTime: r.End, AllDay: true})
	}
	return events
}
