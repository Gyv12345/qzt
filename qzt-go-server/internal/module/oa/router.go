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
	noticeHandler := handler.NewNoticeHandler()
	formTemplateHandler := handler.NewFormTemplateHandler()
	formDataHandler := handler.NewFormDataHandler()
	messageHandler := handler.NewMessageHandler()
	sseHandler := handler.NewSSEHandler()

	// 已认证路由(仅 JWT,无 RBAC):公告流(首页用)、启用表单列表、站内信、SSE 流
	authenticated := rg.Group("", middleware.Auth(app.JwtManager))
	{
		authenticated.GET("/notices/feed", noticeHandler.Feed)
		authenticated.GET("/notices/published", noticeHandler.Published)
		authenticated.GET("/notices/:id", noticeHandler.GetByID)
		authenticated.GET("/forms/enabled", formTemplateHandler.ListEnabled)
		// 站内信(个人,免 RBAC)
		authenticated.GET("/messages/inbox", messageHandler.Inbox)
		authenticated.GET("/messages/outbox", messageHandler.Outbox)
		authenticated.GET("/messages/unread-count", messageHandler.UnreadCount)
		authenticated.GET("/messages/:id", messageHandler.GetByID)
		authenticated.POST("/messages", messageHandler.Send)
		authenticated.PUT("/messages/:id/read", messageHandler.MarkAsRead)
		authenticated.PUT("/messages/read-all", messageHandler.MarkAllAsRead)
		authenticated.PUT("/messages/read-batch", messageHandler.MarkAsReadByIds)
		authenticated.DELETE("/messages/:id", messageHandler.Delete)
		// SSE 实时消息流
		authenticated.GET("/messages/stream", sseHandler.MessageStream)
	}

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

		// 公告管理
		auth.GET("/notices", noticeHandler.List)
		auth.POST("/notices", noticeHandler.Create)
		auth.PUT("/notices/:id", noticeHandler.Update)
		auth.PUT("/notices/:id/publish", noticeHandler.Publish)
		auth.PUT("/notices/:id/withdraw", noticeHandler.Withdraw)
		auth.DELETE("/notices/:id", noticeHandler.Delete)

		// 自定义表单模板管理
		auth.GET("/forms", formTemplateHandler.List)
		auth.POST("/forms", formTemplateHandler.Create)
		auth.GET("/forms/:id", formTemplateHandler.GetByID)
		auth.PUT("/forms/:id", formTemplateHandler.Update)
		auth.PUT("/forms/:id/toggle", formTemplateHandler.ToggleStatus)
		auth.DELETE("/forms/:id", formTemplateHandler.Delete)

		// 自定义表单数据(用户提交)
		auth.GET("/form-data", formDataHandler.List)
		auth.POST("/form-data", formDataHandler.Create)
		auth.GET("/form-data/:id", formDataHandler.GetByID)
		auth.PUT("/form-data/:id", formDataHandler.Update)
		auth.DELETE("/form-data/:id", formDataHandler.Delete)
	}
}
