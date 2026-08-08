package oa

import (
	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/app"
	"qzt-go-server/internal/middleware"
	"qzt-go-server/internal/module/oa/handler"
)

// Module OA 办公自动化模块。注册在 /oa 下。
type Module struct{}

func New() *Module { return &Module{} }

func (m *Module) Name() string { return "oa" }

func (m *Module) RegisterRoutes(rg *gin.RouterGroup) {
	expenseHandler := handler.NewExpenseHandler()
	tripHandler := handler.NewTripHandler()
	loanHandler := handler.NewLoanHandler()
	workLogHandler := handler.NewWorkLogHandler()
	scheduleHandler := handler.NewScheduleHandler()
	meetingRoomHandler := handler.NewMeetingRoomHandler()
	meetingBookingHandler := handler.NewMeetingBookingHandler()

	// 受保护路由(JWT + 操作日志 + Casbin RBAC)
	auth := rg.Group("", middleware.Auth(app.JwtManager), middleware.OperationLog(), middleware.CasbinRBAC())
	{
		// 报销单
		auth.GET("/expenses", expenseHandler.List)
		auth.POST("/expenses", expenseHandler.Create)
		auth.GET("/expenses/:id", expenseHandler.GetByID)
		auth.PUT("/expenses/:id", expenseHandler.Update)
		auth.DELETE("/expenses/:id", expenseHandler.Delete)
		auth.POST("/expenses/:id/mark-paid", expenseHandler.MarkPaid)

		// 出差申请
		auth.GET("/trips", tripHandler.List)
		auth.POST("/trips", tripHandler.Create)
		auth.GET("/trips/:id", tripHandler.GetByID)
		auth.PUT("/trips/:id", tripHandler.Update)
		auth.DELETE("/trips/:id", tripHandler.Delete)

		// 借款/备用金
		auth.GET("/loans", loanHandler.List)
		auth.POST("/loans", loanHandler.Create)
		auth.GET("/loans/:id", loanHandler.GetByID)
		auth.PUT("/loans/:id", loanHandler.Update)
		auth.DELETE("/loans/:id", loanHandler.Delete)
		auth.POST("/loans/:id/mark-repaid", loanHandler.MarkRepaid)

		// 工作日志
		auth.GET("/work-logs", workLogHandler.List)
		auth.POST("/work-logs", workLogHandler.Create)
		auth.GET("/work-logs/:id", workLogHandler.GetByID)
		auth.PUT("/work-logs/:id", workLogHandler.Update)
		auth.DELETE("/work-logs/:id", workLogHandler.Delete)

		// 日程安排
		auth.GET("/schedules", scheduleHandler.List)
		auth.GET("/schedules/calendar", scheduleHandler.Calendar)
		auth.POST("/schedules", scheduleHandler.Create)
		auth.GET("/schedules/:id", scheduleHandler.GetByID)
		auth.PUT("/schedules/:id", scheduleHandler.Update)
		auth.DELETE("/schedules/:id", scheduleHandler.Delete)

		// 会议室管理
		auth.GET("/meeting-rooms", meetingRoomHandler.List)
		auth.POST("/meeting-rooms", meetingRoomHandler.Create)
		auth.GET("/meeting-rooms/:id", meetingRoomHandler.GetByID)
		auth.PUT("/meeting-rooms/:id", meetingRoomHandler.Update)
		auth.DELETE("/meeting-rooms/:id", meetingRoomHandler.Delete)

		// 会议预订
		auth.GET("/meeting-bookings", meetingBookingHandler.List)
		auth.POST("/meeting-bookings", meetingBookingHandler.Create)
		auth.GET("/meeting-bookings/:id", meetingBookingHandler.GetByID)
		auth.PUT("/meeting-bookings/:id", meetingBookingHandler.Update)
		auth.DELETE("/meeting-bookings/:id", meetingBookingHandler.Delete)
	}
}
