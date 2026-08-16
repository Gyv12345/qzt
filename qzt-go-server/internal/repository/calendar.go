package repository

import (
	"context"
)

// calendar.go 统一日历聚合查询(api 模块 calendar service 的 12 个来源)。
//
// 日历横跨 oa/crm/hrm/finance/project 多个模块的表,属跨模块聚合层,
// 因此放在全局 repository 包(与 dashboard.go 同理),由 CalendarRepo 统一收口
// 所有 .Table(...) 原生查询;行结构在此定义,标题拼接/事件映射留在 service 层。
// 每个 Load* 只返回原始行,单一来源查询失败由 service 记日志并跳过该来源。

// CalendarQuery 每次聚合查询共享的过滤参数。
type CalendarQuery struct {
	UserID      uint
	EmpID       uint // HRM 来源用(leave/performance), 0 表示无关联员工
	StartDate   string
	EndDate     string
	EndDateTime string // EndDate + " 23:59:59", datetime 列的当日结束边界
}

// CalendarRepo 日历聚合查询(只读,无 BaseRepo 主表)。
type CalendarRepo struct{}

func NewCalendarRepo() *CalendarRepo { return &CalendarRepo{} }

// ScheduleRow OA 日程(手动新增)。
type ScheduleRow struct {
	ID    uint   `gorm:"column:id"`
	Title string `gorm:"column:title"`
	Start string `gorm:"column:start_time"`
	End   string `gorm:"column:end_time"`
}

func (r *CalendarRepo) LoadSchedule(ctx context.Context, p CalendarQuery) ([]ScheduleRow, error) {
	var rows []ScheduleRow
	err := dbFrom(ctx).Table("oa_schedule").Select("id, title, start_time, end_time").
		Where("creator_id = ? AND deleted_at IS NULL AND start_time >= ? AND start_time <= ?", p.UserID, p.StartDate, p.EndDateTime).
		Order("start_time ASC").Scan(&rows).Error
	return rows, err
}

// FollowupRow CRM 跟进计划(仅待办 status=0)。
type FollowupRow struct {
	ID      uint   `gorm:"column:id"`
	Content string `gorm:"column:content"`
	Plan    string `gorm:"column:plan_time"`
}

func (r *CalendarRepo) LoadFollowup(ctx context.Context, p CalendarQuery) ([]FollowupRow, error) {
	var rows []FollowupRow
	err := dbFrom(ctx).Table("follow_up_plan").Select("id, content, plan_time").
		Where("owner_id = ? AND status = 0 AND deleted_at IS NULL AND plan_time >= ? AND plan_time <= ?", p.UserID, p.StartDate, p.EndDateTime).
		Order("plan_time ASC").Scan(&rows).Error
	return rows, err
}

// OpportunityRow CRM 商机预计成交(未成交 stage NOT IN WON,LOST)。
type OpportunityRow struct {
	ID    uint   `gorm:"column:id"`
	Name  string `gorm:"column:name"`
	Close string `gorm:"column:expected_close_date"`
}

func (r *CalendarRepo) LoadOpportunity(ctx context.Context, p CalendarQuery) ([]OpportunityRow, error) {
	var rows []OpportunityRow
	err := dbFrom(ctx).Table("crm_opportunity").Select("id, name, expected_close_date").
		Where("owner_id = ? AND deleted_at IS NULL AND expected_close_date IS NOT NULL AND expected_close_date BETWEEN ? AND ? AND stage NOT IN (?, ?)", p.UserID, p.StartDate, p.EndDate, "WON", "LOST").
		Order("expected_close_date ASC").Scan(&rows).Error
	return rows, err
}

// PaymentRow CRM 回款计划(JOIN 合同,owner=我)。
type PaymentRow struct {
	ID    uint   `gorm:"column:id"`
	Plan  string `gorm:"column:plan_date"`
	CName string `gorm:"column:contract_name"`
}

func (r *CalendarRepo) LoadPayment(ctx context.Context, p CalendarQuery) ([]PaymentRow, error) {
	var rows []PaymentRow
	err := dbFrom(ctx).Table("crm_contract_payment_plan p").
		Select("p.id, p.plan_date, c.name AS contract_name").
		Joins("JOIN crm_contract c ON c.id = p.contract_id AND c.deleted_at IS NULL").
		Where("p.deleted_at IS NULL AND c.owner_id = ? AND p.plan_date BETWEEN ? AND ?", p.UserID, p.StartDate, p.EndDate).
		Order("p.plan_date ASC").Scan(&rows).Error
	return rows, err
}

// MeetingRow OA 会议预订。
type MeetingRow struct {
	ID    uint   `gorm:"column:id"`
	Title string `gorm:"column:title"`
	Start string `gorm:"column:start_time"`
	End   string `gorm:"column:end_time"`
}

func (r *CalendarRepo) LoadMeeting(ctx context.Context, p CalendarQuery) ([]MeetingRow, error) {
	var rows []MeetingRow
	err := dbFrom(ctx).Table("oa_meeting_booking").Select("id, title, start_time, end_time").
		Where("organizer_id = ? AND deleted_at IS NULL AND start_time >= ? AND start_time <= ?", p.UserID, p.StartDate, p.EndDateTime).
		Order("start_time ASC").Scan(&rows).Error
	return rows, err
}

// TripRow OA 出差(显示在开始日)。
type TripRow struct {
	ID    uint   `gorm:"column:id"`
	Title string `gorm:"column:title"`
	Start string `gorm:"column:start_date"`
	End   string `gorm:"column:end_date"`
}

func (r *CalendarRepo) LoadTrip(ctx context.Context, p CalendarQuery) ([]TripRow, error) {
	var rows []TripRow
	err := dbFrom(ctx).Table("oa_business_trip").Select("id, title, start_date, end_date").
		Where("applicant_id = ? AND deleted_at IS NULL AND start_date BETWEEN ? AND ?", p.UserID, p.StartDate, p.EndDate).
		Order("start_date ASC").Scan(&rows).Error
	return rows, err
}

// LeaveRow 请假(我的,显示在开始日)。
type LeaveRow struct {
	ID    uint   `gorm:"column:id"`
	Type  string `gorm:"column:leave_type"`
	Start string `gorm:"column:start_date"`
	End   string `gorm:"column:end_date"`
}

func (r *CalendarRepo) LoadLeave(ctx context.Context, p CalendarQuery) ([]LeaveRow, error) {
	var rows []LeaveRow
	err := dbFrom(ctx).Table("hrm_leave").Select("id, leave_type, start_date, end_date").
		Where("employee_id = ? AND deleted_at IS NULL AND start_date >= ? AND start_date <= ?", p.EmpID, p.StartDate, p.EndDateTime).
		Order("start_date ASC").Scan(&rows).Error
	return rows, err
}

// WorklogRow 工作日志。
type WorklogRow struct {
	ID  uint   `gorm:"column:id"`
	Day string `gorm:"column:log_date"`
}

func (r *CalendarRepo) LoadWorklog(ctx context.Context, p CalendarQuery) ([]WorklogRow, error) {
	var rows []WorklogRow
	err := dbFrom(ctx).Table("oa_work_log").Select("id, log_date").
		Where("creator_id = ? AND deleted_at IS NULL AND log_date BETWEEN ? AND ?", p.UserID, p.StartDate, p.EndDate).
		Scan(&rows).Error
	return rows, err
}

// ProjectRow 项目(我负责或参与的,未完成,显示在开始日)。
type ProjectRow struct {
	ID    uint   `gorm:"column:id"`
	Name  string `gorm:"column:name"`
	Start string `gorm:"column:start_date"`
	End   string `gorm:"column:end_date"`
}

func (r *CalendarRepo) LoadProject(ctx context.Context, p CalendarQuery) ([]ProjectRow, error) {
	var rows []ProjectRow
	err := dbFrom(ctx).Table("proj_project").Select("id, name, start_date, end_date").
		Where("deleted_at IS NULL AND status NOT IN (?, ?) AND start_date BETWEEN ? AND ? AND (manager_id = ? OR FIND_IN_SET(?, member_ids))", 4, 5, p.StartDate, p.EndDate, p.UserID, p.UserID).
		Order("start_date ASC").Scan(&rows).Error
	return rows, err
}

// TaskRow 项目任务(我的,未完成)。
type TaskRow struct {
	ID    uint   `gorm:"column:id"`
	Title string `gorm:"column:title"`
	Due   string `gorm:"column:due_date"`
}

func (r *CalendarRepo) LoadTask(ctx context.Context, p CalendarQuery) ([]TaskRow, error) {
	var rows []TaskRow
	err := dbFrom(ctx).Table("proj_task").Select("id, title, due_date").
		Where("assignee_id = ? AND deleted_at IS NULL AND status IN (?, ?) AND due_date IS NOT NULL AND due_date BETWEEN ? AND ?", p.UserID, 1, 2, p.StartDate, p.EndDate).
		Order("due_date ASC").Scan(&rows).Error
	return rows, err
}

// ReceivableRow 应收应付到期(关联合同 owner=我,未结清)。
type ReceivableRow struct {
	ID    uint   `gorm:"column:id"`
	Dir   string `gorm:"column:direction"`
	Party string `gorm:"column:party_name"`
	Due   string `gorm:"column:due_date"`
}

func (r *CalendarRepo) LoadReceivable(ctx context.Context, p CalendarQuery) ([]ReceivableRow, error) {
	var rows []ReceivableRow
	err := dbFrom(ctx).Table("fin_receivable").Select("id, direction, party_name, due_date").
		Where("deleted_at IS NULL AND due_date IS NOT NULL AND due_date BETWEEN ? AND ? AND status IN (?, ?) AND biz_type = ? AND biz_id IN (SELECT id FROM crm_contract WHERE owner_id = ? AND deleted_at IS NULL)", p.StartDate, p.EndDate, 0, 1, "CONTRACT", p.UserID).
		Order("due_date ASC").Scan(&rows).Error
	return rows, err
}

// PerformanceRow 绩效考核(我的,显示在开始日)。
type PerformanceRow struct {
	ID    uint   `gorm:"column:id"`
	Title string `gorm:"column:title"`
	Start string `gorm:"column:start_date"`
	End   string `gorm:"column:end_date"`
}

func (r *CalendarRepo) LoadPerformance(ctx context.Context, p CalendarQuery) ([]PerformanceRow, error) {
	var rows []PerformanceRow
	err := dbFrom(ctx).Table("hrm_performance").Select("id, title, start_date, end_date").
		Where("deleted_at IS NULL AND start_date BETWEEN ? AND ? AND (employee_id = ? OR reviewer_id = ?)", p.StartDate, p.EndDate, p.EmpID, p.UserID).
		Order("start_date ASC").Scan(&rows).Error
	return rows, err
}

// EmpIDByUserID 查用户关联的员工 ID(无关联员工返回 0,查询失败同返回 0)。
func (r *CalendarRepo) EmpIDByUserID(ctx context.Context, userID uint) uint {
	var empID uint
	_ = dbFrom(ctx).Table("hrm_employee").Select("id").
		Where("user_id = ? AND deleted_at IS NULL", userID).Limit(1).Scan(&empID).Error
	return empID
}
