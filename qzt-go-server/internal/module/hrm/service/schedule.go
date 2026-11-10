package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	hrmmodel "qzt-go-server/internal/model/hrm"
	"qzt-go-server/internal/repository"
	hrmrepo "qzt-go-server/internal/repository/hrm"
	"qzt-go-server/pkg/xtime"
)

// schedule.go 考勤排班 v2 服务:班次/节假日/考勤组/排班 CRUD + 班次判定纯函数。
// 未排班员工沿用原固定口径(workDays=22);有排班员工按班次口径重算汇总,
// 两套口径并存互不影响。

// ScheduleService 排班服务。
type ScheduleService struct {
	shiftRepo    *hrmrepo.ShiftRepo
	holidayRepo  *hrmrepo.HolidayRepo
	groupRepo    *hrmrepo.AttendanceGroupRepo
	scheduleRepo *hrmrepo.ScheduleRepo
}

func NewScheduleService() *ScheduleService {
	return &ScheduleService{
		shiftRepo:    hrmrepo.NewShiftRepo(),
		holidayRepo:  hrmrepo.NewHolidayRepo(),
		groupRepo:    hrmrepo.NewAttendanceGroupRepo(),
		scheduleRepo: hrmrepo.NewScheduleRepo(),
	}
}

// ── 班次 ──

// ShiftRequest 班次创建/更新请求。
type ShiftRequest struct {
	Name        string `json:"name" binding:"required"`
	StartTime   string `json:"start_time" binding:"required"`
	EndTime     string `json:"end_time" binding:"required"`
	FlexMinutes int    `json:"flex_minutes"`
	CrossDay    int8   `json:"cross_day"`
	Status      int8   `json:"status"`
}

func validClockTime(s string) bool {
	if len(s) != 8 {
		return false
	}
	_, err := time.ParseInLocation("15:04:05", s, time.Local)
	return err == nil
}

// CreateShift 新建班次。
func (s *ScheduleService) CreateShift(ctx context.Context, req *ShiftRequest) (*hrmmodel.HrmShift, error) {
	if !validClockTime(req.StartTime) || !validClockTime(req.EndTime) {
		return nil, errors.New("时间格式应为 HH:mm:ss")
	}
	shift := &hrmmodel.HrmShift{
		Name:        req.Name,
		StartTime:   req.StartTime,
		EndTime:     req.EndTime,
		FlexMinutes: req.FlexMinutes,
		CrossDay:    req.CrossDay,
		Status:      1,
	}
	if req.Status != 0 {
		shift.Status = req.Status
	}
	if err := s.shiftRepo.Create(ctx, shift); err != nil {
		return nil, err
	}
	return shift, nil
}

// UpdateShift 更新班次。
func (s *ScheduleService) UpdateShift(ctx context.Context, id uint, req *ShiftRequest) error {
	shift, err := s.shiftRepo.GetByID(ctx, id)
	if err != nil {
		return errors.New("班次不存在")
	}
	if !validClockTime(req.StartTime) || !validClockTime(req.EndTime) {
		return errors.New("时间格式应为 HH:mm:ss")
	}
	shift.Name = req.Name
	shift.StartTime = req.StartTime
	shift.EndTime = req.EndTime
	shift.FlexMinutes = req.FlexMinutes
	shift.CrossDay = req.CrossDay
	if req.Status != 0 {
		shift.Status = req.Status
	}
	return s.shiftRepo.Update(ctx, shift)
}

// DeleteShift 删除班次(软删)。
func (s *ScheduleService) DeleteShift(ctx context.Context, id uint) error {
	if _, err := s.shiftRepo.GetByID(ctx, id); err != nil {
		return errors.New("班次不存在")
	}
	return s.shiftRepo.Delete(ctx, id)
}

// ListShifts 班次列表(分页)。
func (s *ScheduleService) ListShifts(ctx context.Context, page, pageSize int) ([]hrmmodel.HrmShift, int64, error) {
	return s.shiftRepo.PageList(ctx, page, pageSize, &repository.QueryOptions{Order: []string{"id DESC"}})
}

// ── 节假日 ──

// HolidayRequest 节假日请求。
type HolidayRequest struct {
	HolidayDate string `json:"holiday_date" binding:"required"` // yyyy-MM-dd
	Name        string `json:"name" binding:"required"`
	Type        string `json:"type" binding:"required"` // HOLIDAY / WORKDAY
}

func validHolidayType(t string) bool {
	return t == hrmmodel.HolidayTypeHoliday || t == hrmmodel.HolidayTypeWorkday
}

// CreateHoliday 新建节假日(同日唯一)。
func (s *ScheduleService) CreateHoliday(ctx context.Context, req *HolidayRequest) (*hrmmodel.HrmHoliday, error) {
	if !validHolidayType(req.Type) {
		return nil, errors.New("type 只能是 HOLIDAY(放假)或 WORKDAY(补班)")
	}
	d, err := time.ParseInLocation("2006-01-02", req.HolidayDate, time.Local)
	if err != nil {
		return nil, errors.New("holiday_date 格式应为 yyyy-MM-dd")
	}
	h := &hrmmodel.HrmHoliday{
		HolidayDate: xtime.NewDateTime(d),
		Name:        req.Name,
		Type:        req.Type,
	}
	if err := s.holidayRepo.Create(ctx, h); err != nil {
		return nil, fmt.Errorf("保存失败(该日期可能已存在): %w", err)
	}
	return h, nil
}

// UpdateHoliday 更新节假日。
func (s *ScheduleService) UpdateHoliday(ctx context.Context, id uint, req *HolidayRequest) error {
	h, err := s.holidayRepo.GetByID(ctx, id)
	if err != nil {
		return errors.New("节假日不存在")
	}
	if !validHolidayType(req.Type) {
		return errors.New("type 只能是 HOLIDAY(放假)或 WORKDAY(补班)")
	}
	h.Name = req.Name
	h.Type = req.Type
	return s.holidayRepo.Update(ctx, h)
}

// DeleteHoliday 删除节假日。
func (s *ScheduleService) DeleteHoliday(ctx context.Context, id uint) error {
	if _, err := s.holidayRepo.GetByID(ctx, id); err != nil {
		return errors.New("节假日不存在")
	}
	return s.holidayRepo.Delete(ctx, id)
}

// ListHolidays 节假日列表(分页,可按年份过滤)。
func (s *ScheduleService) ListHolidays(ctx context.Context, page, pageSize int, year string) ([]hrmmodel.HrmHoliday, int64, error) {
	q := &repository.QueryOptions{Order: []string{"holiday_date ASC"}}
	if year != "" {
		q.Where = map[string]any{"YEAR(holiday_date)": year}
	}
	return s.holidayRepo.PageList(ctx, page, pageSize, q)
}

// ── 考勤组 ──

// AttendanceGroupRequest 考勤组请求。
type AttendanceGroupRequest struct {
	Name    string `json:"name" binding:"required"`
	DeptID  *uint  `json:"dept_id"`
	ShiftID uint   `json:"shift_id" binding:"required"`
	Status  int8   `json:"status"`
}

// CreateGroup 新建考勤组。
func (s *ScheduleService) CreateGroup(ctx context.Context, req *AttendanceGroupRequest) (*hrmmodel.HrmAttendanceGroup, error) {
	if _, err := s.shiftRepo.GetByID(ctx, req.ShiftID); err != nil {
		return nil, errors.New("班次不存在")
	}
	g := &hrmmodel.HrmAttendanceGroup{
		Name:    req.Name,
		DeptID:  req.DeptID,
		ShiftID: req.ShiftID,
		Status:  1,
	}
	if req.Status != 0 {
		g.Status = req.Status
	}
	if err := s.groupRepo.Create(ctx, g); err != nil {
		return nil, err
	}
	return g, nil
}

// UpdateGroup 更新考勤组。
func (s *ScheduleService) UpdateGroup(ctx context.Context, id uint, req *AttendanceGroupRequest) error {
	g, err := s.groupRepo.GetByID(ctx, id)
	if err != nil {
		return errors.New("考勤组不存在")
	}
	g.Name = req.Name
	g.DeptID = req.DeptID
	g.ShiftID = req.ShiftID
	if req.Status != 0 {
		g.Status = req.Status
	}
	return s.groupRepo.Update(ctx, g)
}

// DeleteGroup 删除考勤组。
func (s *ScheduleService) DeleteGroup(ctx context.Context, id uint) error {
	if _, err := s.groupRepo.GetByID(ctx, id); err != nil {
		return errors.New("考勤组不存在")
	}
	return s.groupRepo.Delete(ctx, id)
}

// ListGroups 考勤组列表。
func (s *ScheduleService) ListGroups(ctx context.Context, page, pageSize int) ([]hrmmodel.HrmAttendanceGroup, int64, error) {
	return s.groupRepo.PageList(ctx, page, pageSize, &repository.QueryOptions{Order: []string{"id DESC"}})
}

// ── 排班 ──

// ScheduleBatchRequest 整月批量排班请求(员工×日期→班次,upsert)。
type ScheduleBatchRequest struct {
	EmployeeID uint                `json:"employee_id" binding:"required"`
	Items      []ScheduleBatchItem `json:"items" binding:"required,min=1,dive"`
}

// ScheduleBatchItem 批量排班项。
type ScheduleBatchItem struct {
	Date    string `json:"date" binding:"required"` // yyyy-MM-dd
	ShiftID uint   `json:"shift_id" binding:"required"`
}

// BatchSchedule 整月批量排班(upsert:同员工同日期覆盖班次,source=MANUAL)。
func (s *ScheduleService) BatchSchedule(ctx context.Context, req *ScheduleBatchRequest) (int, error) {
	for i := range req.Items {
		if _, err := s.shiftRepo.GetByID(ctx, req.Items[i].ShiftID); err != nil {
			return 0, errors.New("班次不存在: " + fmt.Sprint(req.Items[i].ShiftID))
		}
	}
	rows := make([]hrmmodel.HrmSchedule, 0, len(req.Items))
	for i := range req.Items {
		d, err := time.ParseInLocation("2006-01-02", req.Items[i].Date, time.Local)
		if err != nil {
			return 0, errors.New("日期格式应为 yyyy-MM-dd: " + req.Items[i].Date)
		}
		rows = append(rows, hrmmodel.HrmSchedule{
			EmployeeID:   req.EmployeeID,
			ScheduleDate: xtime.NewDateTime(d),
			ShiftID:      req.Items[i].ShiftID,
			Source:       hrmmodel.ScheduleSourceManual,
		})
	}
	if err := s.scheduleRepo.BatchUpsert(ctx, rows); err != nil {
		return 0, err
	}
	return len(rows), nil
}

// DeleteSchedule 删除单条排班。
func (s *ScheduleService) DeleteSchedule(ctx context.Context, id uint) error {
	if _, err := s.scheduleRepo.GetByID(ctx, id); err != nil {
		return errors.New("排班不存在")
	}
	return s.scheduleRepo.Delete(ctx, id)
}

// ScheduleMonthRow 月视图行(排班+班次+员工展示字段)。
type ScheduleMonthRow struct {
	hrmmodel.HrmSchedule
	ShiftName    string `json:"shift_name"`
	StartTime    string `json:"start_time"`
	EndTime      string `json:"end_time"`
	EmployeeName string `json:"employee_name"`
}

// MonthView 排班月视图(当月全部排班,回填班次与员工名)。
func (s *ScheduleService) MonthView(ctx context.Context, month string) ([]ScheduleMonthRow, error) {
	schedules, err := s.scheduleRepo.ListByMonth(ctx, month)
	if err != nil {
		return nil, err
	}
	rows := make([]ScheduleMonthRow, 0, len(schedules))
	if len(schedules) == 0 {
		return rows, nil
	}
	// 班次回填
	shiftIDs := make([]uint, 0, len(schedules))
	for _, sc := range schedules {
		shiftIDs = append(shiftIDs, sc.ShiftID)
	}
	shifts, _ := s.shiftRepo.List(ctx, &repository.QueryOptions{
		Conds: []repository.Cond{{Query: "id IN ?", Args: []any{shiftIDs}}},
	})
	shiftByID := make(map[uint]hrmmodel.HrmShift, len(shifts))
	for _, sh := range shifts {
		shiftByID[sh.ID] = sh
	}
	// 员工回填
	empIDs := make([]uint, 0, len(schedules))
	for _, sc := range schedules {
		empIDs = append(empIDs, sc.EmployeeID)
	}
	empSvc := NewEmployeeService()
	emps, _ := empSvc.repo.List(ctx, &repository.QueryOptions{
		Conds: []repository.Cond{{Query: "id IN ?", Args: []any{empIDs}}},
	})
	empName := make(map[uint]string, len(emps))
	for _, e := range emps {
		empName[e.ID] = e.Name
	}
	for _, sc := range schedules {
		sh := shiftByID[sc.ShiftID]
		rows = append(rows, ScheduleMonthRow{
			HrmSchedule:  sc,
			ShiftName:    sh.Name,
			StartTime:    sh.StartTime,
			EndTime:      sh.EndTime,
			EmployeeName: empName[sc.EmployeeID],
		})
	}
	return rows, nil
}

// ── 班次判定纯函数(供汇总重算与外部复用) ──

// ShiftDayResult 单日班次判定结果。
type ShiftDayResult struct {
	ShouldAttend bool // 当日应出勤(排班存在且非法定假日)
	LateMinutes  int  // 迟到分钟(0=不迟到)
	EarlyMinutes int  // 早退分钟(0=不早退)
	MissingIn    bool // 缺上班卡
	MissingOut   bool // 缺下班卡
	Present      bool // 当日到岗(有上班卡)
}

// EvaluateShiftDay 按班次判定单日出勤。
// holidayType: ""=普通日 / HOLIDAY=法定放假 / WORKDAY=调休补班。
// 迟到=打卡晚于 上班时间+弹性宽限;早退=下班卡早于 下班时间(跨天班次 v1 不精确判定早退)。
func EvaluateShiftDay(shift *hrmmodel.HrmShift, holidayType string, clockIn, clockOut *time.Time) ShiftDayResult {
	r := ShiftDayResult{ShouldAttend: holidayType != hrmmodel.HolidayTypeHoliday}
	if !r.ShouldAttend {
		return r
	}
	if clockIn == nil {
		r.MissingIn = true
		r.MissingOut = true
		return r
	}
	r.Present = true
	r.MissingOut = clockOut == nil
	if clockOut != nil && shift.CrossDay == 0 {
		r.EarlyMinutes = minutesBefore(clockOut, shift.EndTime)
	}
	late := minutesAfter(clockIn, shift.StartTime)
	if late > shift.FlexMinutes {
		r.LateMinutes = late
	}
	return r
}

// minutesAfter 打卡时间晚于班次时间多少分钟(仅取当日 HH:mm:ss 比较,负值截 0)。
func minutesAfter(t *time.Time, shiftTime string) int {
	st, err := time.ParseInLocation("15:04:05", shiftTime, time.Local)
	if err != nil {
		return 0
	}
	base := time.Date(t.Year(), t.Month(), t.Day(), st.Hour(), st.Minute(), st.Second(), 0, time.Local)
	d := int(t.Sub(base).Minutes())
	if d < 0 {
		return 0
	}
	return d
}

// minutesBefore 打卡时间早于班次时间多少分钟(负值截 0)。
func minutesBefore(t *time.Time, shiftTime string) int {
	st, err := time.ParseInLocation("15:04:05", shiftTime, time.Local)
	if err != nil {
		return 0
	}
	base := time.Date(t.Year(), t.Month(), t.Day(), st.Hour(), st.Minute(), st.Second(), 0, time.Local)
	d := int(base.Sub(*t).Minutes())
	if d < 0 {
		return 0
	}
	return d
}

// MyScheduleRow 我的排班行(移动端员工查本人班表)。
type MyScheduleRow struct {
	Date        string `json:"date"`       // yyyy-MM-dd
	ShiftName   string `json:"shift_name"` // 班次名
	StartTime   string `json:"start_time"` // 上班时间
	EndTime     string `json:"end_time"`   // 下班时间
	IsHoliday   bool   `json:"is_holiday"` // 当日法定放假
	HolidayName string `json:"holiday_name"`
}

// MySchedule 我的排班月视图:按登录用户反查员工档案,列本人当月排班(带班次与假日标注)。
func (s *ScheduleService) MySchedule(ctx context.Context, userID uint, month string) ([]MyScheduleRow, error) {
	emp, err := hrmrepo.NewEmployeeRepo().GetByUserID(ctx, userID)
	if err != nil {
		return nil, errors.New("当前登录用户未关联员工档案")
	}
	year, monthNum, err := parseYearMonth(month)
	if err != nil {
		return nil, err
	}
	start := time.Date(year, time.Month(monthNum), 1, 0, 0, 0, 0, time.Local)
	end := start.AddDate(0, 1, -1)
	startStr, endStr := start.Format("2006-01-02"), end.Format("2006-01-02")

	schedules, err := s.scheduleRepo.ListByEmpRange(ctx, emp.ID, startStr, endStr)
	if err != nil {
		return nil, err
	}
	holidays, _ := s.holidayRepo.ListByRange(ctx, startStr, endStr)
	holidayMap := make(map[string]hrmmodel.HrmHoliday, len(holidays))
	for _, h := range holidays {
		holidayMap[time.Time(h.HolidayDate).Format("2006-01-02")] = h
	}
	shiftIDs := make([]uint, 0, len(schedules))
	for _, sc := range schedules {
		shiftIDs = append(shiftIDs, sc.ShiftID)
	}
	shifts, _ := s.shiftRepo.List(ctx, &repository.QueryOptions{
		Conds: []repository.Cond{{Query: "id IN ?", Args: []any{shiftIDs}}},
	})
	shiftByID := make(map[uint]hrmmodel.HrmShift, len(shifts))
	for _, sh := range shifts {
		shiftByID[sh.ID] = sh
	}
	rows := make([]MyScheduleRow, 0, len(schedules))
	for _, sc := range schedules {
		day := time.Time(sc.ScheduleDate).Format("2006-01-02")
		sh := shiftByID[sc.ShiftID]
		h, hasH := holidayMap[day]
		hname := ""
		if hasH {
			hname = h.Name
		}
		rows = append(rows, MyScheduleRow{
			Date:        day,
			ShiftName:   sh.Name,
			StartTime:   sh.StartTime,
			EndTime:     sh.EndTime,
			IsHoliday:   hasH && h.Type == hrmmodel.HolidayTypeHoliday,
			HolidayName: hname,
		})
	}
	return rows, nil
}
