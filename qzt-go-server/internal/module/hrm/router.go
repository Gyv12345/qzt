package hrm

import (
	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/app"
	"qzt-go-server/internal/middleware"
	"qzt-go-server/internal/module/hrm/handler"
)

// Module HRM 人力资源管理模块。实现 server.Module 接口,注册在 /hrm 下。
type Module struct{}

func New() *Module { return &Module{} }

func (m *Module) Name() string { return "hrm" }

func (m *Module) RegisterRoutes(rg *gin.RouterGroup) {
	deptHandler := handler.NewDepartmentHandler()
	positionHandler := handler.NewPositionHandler()
	employeeHandler := handler.NewEmployeeHandler()
	attendanceHandler := handler.NewAttendanceHandler()
	payrollHandler := handler.NewPayrollHandler()
	payrollConfigHandler := handler.NewPayrollConfigHandler()
	recruitmentHandler := handler.NewRecruitmentHandler()
	performanceHandler := handler.NewPerformanceHandler()
	scheduleHandler := handler.NewScheduleHandler()

	// 已认证路由(仅 JWT,无 RBAC):部门树/岗位下拉(供其他模块表单选择)。
	authenticated := rg.Group("", middleware.Auth(app.JwtManager))
	{
		authenticated.GET("/departments/tree", deptHandler.Tree)
		authenticated.GET("/positions/enabled", positionHandler.ListEnabled)

		// 考勤个人自助(打卡/我的打卡记录/加班):仅登录即可,与审批操作同一模式——
		// service 层强制按登录人自身档案读写,不依赖菜单授权,移动端全员可用。
		authenticated.POST("/attendance/clock", attendanceHandler.ClockIn)
		authenticated.GET("/attendance/clocks", attendanceHandler.ClockList)
		authenticated.GET("/attendance/overtimes", attendanceHandler.OvertimeList)
		authenticated.POST("/attendance/overtimes", attendanceHandler.ApplyOvertime)

		// 我的排班(P14 移动端:仅登录,按登录人档案查本人班表)
		authenticated.GET("/schedules/my", scheduleHandler.MySchedule)
	}

	// 受保护路由(JWT + 操作日志 + Casbin RBAC):CRUD。
	// OperationLog 位于 auth 与 RBAC 之间,使权限拒绝(403)也被审计。
	auth := rg.Group("", middleware.Auth(app.JwtManager), middleware.OperationLog(), middleware.CasbinRBAC())
	{
		// 部门管理
		auth.GET("/departments", deptHandler.List)
		auth.POST("/departments", deptHandler.Create)
		auth.GET("/departments/:id", deptHandler.GetByID)
		auth.PUT("/departments/:id", deptHandler.Update)
		auth.DELETE("/departments/:id", deptHandler.Delete)

		// 岗位管理
		auth.GET("/positions", positionHandler.List)
		auth.POST("/positions", positionHandler.Create)
		auth.GET("/positions/:id", positionHandler.GetByID)
		auth.PUT("/positions/:id", positionHandler.Update)
		auth.DELETE("/positions/:id", positionHandler.Delete)

		// 员工管理
		auth.GET("/employees", employeeHandler.List)
		auth.POST("/employees", employeeHandler.Create)
		auth.GET("/employees/:id", employeeHandler.GetByID)
		auth.PUT("/employees/:id", employeeHandler.Update)
		auth.DELETE("/employees/:id", employeeHandler.Delete)
		auth.GET("/employees/:id/changes", employeeHandler.Changes)

		// 考勤管理(leaves/summary 涉及他人数据与 HR 口径,保持 RBAC)
		auth.GET("/attendance/leaves", attendanceHandler.LeaveList)
		auth.POST("/attendance/leaves", attendanceHandler.ApplyLeave)
		auth.PUT("/attendance/leaves/:id/approve", attendanceHandler.ApproveLeave)
		auth.PUT("/attendance/overtimes/:id/approve", attendanceHandler.ApproveOvertime)
		auth.POST("/attendance/summary/generate", attendanceHandler.GenerateSummary)
		auth.GET("/attendance/summary", attendanceHandler.SummaryList)

		// 排班管理(P14:班次/节假日/考勤组/排班)
		auth.GET("/shifts", scheduleHandler.ListShifts)
		auth.POST("/shifts", scheduleHandler.CreateShift)
		auth.PUT("/shifts/:id", scheduleHandler.UpdateShift)
		auth.DELETE("/shifts/:id", scheduleHandler.DeleteShift)
		auth.GET("/holidays", scheduleHandler.ListHolidays)
		auth.POST("/holidays", scheduleHandler.CreateHoliday)
		auth.PUT("/holidays/:id", scheduleHandler.UpdateHoliday)
		auth.DELETE("/holidays/:id", scheduleHandler.DeleteHoliday)
		auth.GET("/attendance-groups", scheduleHandler.ListGroups)
		auth.POST("/attendance-groups", scheduleHandler.CreateGroup)
		auth.PUT("/attendance-groups/:id", scheduleHandler.UpdateGroup)
		auth.DELETE("/attendance-groups/:id", scheduleHandler.DeleteGroup)
		auth.GET("/schedules/month", scheduleHandler.MonthView)
		auth.POST("/schedules/batch", scheduleHandler.BatchSchedule)
		auth.DELETE("/schedules/:id", scheduleHandler.DeleteSchedule)

		// 薪酬管理
		auth.PUT("/payroll/structure", payrollHandler.SaveStructure)
		auth.GET("/payroll/structure", payrollHandler.GetStructure)
		auth.POST("/payroll/generate", payrollHandler.GeneratePayroll)
		auth.GET("/payroll", payrollHandler.PayrollList)

		// 薪酬设置(P16:社保方案/工资项/结构 v2)
		auth.GET("/insurance-plans", payrollConfigHandler.ListPlans)
		auth.POST("/insurance-plans", payrollConfigHandler.CreatePlan)
		auth.PUT("/insurance-plans/:id", payrollConfigHandler.UpdatePlan)
		auth.DELETE("/insurance-plans/:id", payrollConfigHandler.DeletePlan)
		auth.GET("/salary-items", payrollConfigHandler.ListItems)
		auth.POST("/salary-items", payrollConfigHandler.CreateItem)
		auth.PUT("/salary-items/:id", payrollConfigHandler.UpdateItem)
		auth.DELETE("/salary-items/:id", payrollConfigHandler.DeleteItem)
		auth.PUT("/payroll/structure/v2", payrollConfigHandler.SaveStructureV2)
		auth.PUT("/payroll/:id/confirm", payrollHandler.ConfirmPayroll)
		auth.PUT("/payroll/:id/paid", payrollHandler.MarkPaid)

		// 招聘管理
		auth.GET("/jobs", recruitmentHandler.ListJobs)
		auth.POST("/jobs", recruitmentHandler.CreateJob)
		auth.GET("/jobs/:id", recruitmentHandler.GetJob)
		auth.PUT("/jobs/:id", recruitmentHandler.UpdateJob)
		auth.DELETE("/jobs/:id", recruitmentHandler.DeleteJob)

		// 候选人
		auth.GET("/candidates", recruitmentHandler.ListCandidates)
		auth.POST("/candidates", recruitmentHandler.CreateCandidate)
		auth.PUT("/candidates/:id", recruitmentHandler.UpdateCandidate)
		auth.DELETE("/candidates/:id", recruitmentHandler.DeleteCandidate)

		// 绩效考核
		auth.GET("/performances", performanceHandler.List)
		auth.POST("/performances", performanceHandler.Create)
		auth.GET("/performances/:id", performanceHandler.GetByID)
		auth.PUT("/performances/:id/self-review", performanceHandler.SelfReview)
		auth.PUT("/performances/:id/review", performanceHandler.Review)
		auth.DELETE("/performances/:id", performanceHandler.Delete)
	}
}
