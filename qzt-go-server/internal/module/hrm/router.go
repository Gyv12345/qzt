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

	// 已认证路由(仅 JWT,无 RBAC):部门树/岗位下拉(供其他模块表单选择)。
	authenticated := rg.Group("", middleware.Auth(app.JwtManager))
	{
		authenticated.GET("/departments/tree", deptHandler.Tree)
		authenticated.GET("/positions/enabled", positionHandler.ListEnabled)
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

		// 考勤管理
		auth.POST("/attendance/clock", attendanceHandler.ClockIn)
		auth.GET("/attendance/clocks", attendanceHandler.ClockList)
		auth.GET("/attendance/leaves", attendanceHandler.LeaveList)
		auth.POST("/attendance/leaves", attendanceHandler.ApplyLeave)
		auth.PUT("/attendance/leaves/:id/approve", attendanceHandler.ApproveLeave)
		auth.GET("/attendance/overtimes", attendanceHandler.OvertimeList)
		auth.POST("/attendance/overtimes", attendanceHandler.ApplyOvertime)
		auth.PUT("/attendance/overtimes/:id/approve", attendanceHandler.ApproveOvertime)
		auth.POST("/attendance/summary/generate", attendanceHandler.GenerateSummary)
		auth.GET("/attendance/summary", attendanceHandler.SummaryList)

		// 薪酬管理
		auth.PUT("/payroll/structure", payrollHandler.SaveStructure)
		auth.GET("/payroll/structure", payrollHandler.GetStructure)
		auth.POST("/payroll/generate", payrollHandler.GeneratePayroll)
		auth.GET("/payroll", payrollHandler.PayrollList)
		auth.PUT("/payroll/:id/confirm", payrollHandler.ConfirmPayroll)
		auth.PUT("/payroll/:id/paid", payrollHandler.MarkPaid)
	}
}
