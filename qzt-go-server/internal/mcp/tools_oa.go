package mcp

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"

	oasvc "qzt-go-server/internal/module/oa/service"
)

// tools_oa.go OA 办公自动化 tools(站内信/公告/日程/工作日志/报销/出差/借款/会议室/会议预订/表单模板/表单数据)。
// 更新类工具采用「先 Get 再覆盖传入字段」的半增量模式,AI 只需传要改的字段。

func registerOaTools(s *server.MCPServer) {
	// ── 站内信 message (7) ──
	s.AddTool(
		mcp.NewTool("oa_message_inbox",
			mcp.WithDescription("查询收件箱(当前用户的站内信)"),
			mcp.WithNumber("page", mcp.Description("页码(默认1)")),
			mcp.WithNumber("page_size", mcp.Description("每页条数(默认20)")),
		),
		handleOaMessageInbox,
	)
	s.AddTool(
		mcp.NewTool("oa_message_outbox",
			mcp.WithDescription("查询发件箱(当前用户发出的站内信)"),
			mcp.WithNumber("page", mcp.Description("页码(默认1)")),
			mcp.WithNumber("page_size", mcp.Description("每页条数(默认20)")),
		),
		handleOaMessageOutbox,
	)
	s.AddTool(
		mcp.NewTool("oa_message_unread_count",
			mcp.WithDescription("查询当前用户未读站内信数量"),
		),
		handleOaMessageUnreadCount,
	)
	s.AddTool(
		mcp.NewTool("oa_message_get",
			mcp.WithDescription("查询站内信详情"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("消息ID")),
		),
		handleOaMessageGet,
	)
	s.AddTool(
		mcp.NewTool("oa_message_send",
			mcp.WithDescription("发送站内信(当前用户为发送人)"),
			mcp.WithNumber("receiver_id", mcp.Required(), mcp.Description("接收人用户ID")),
			mcp.WithString("title", mcp.Required(), mcp.Description("标题")),
			mcp.WithString("content", mcp.Required(), mcp.Description("内容")),
			mcp.WithString("content_type", mcp.Description("内容格式:text/markdown(默认text)")),
		),
		handleOaMessageSend,
	)
	s.AddTool(
		mcp.NewTool("oa_message_mark_read",
			mcp.WithDescription("标记站内信为已读"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("消息ID")),
		),
		handleOaMessageMarkRead,
	)
	s.AddTool(
		mcp.NewTool("oa_message_read_all",
			mcp.WithDescription("将当前用户全部站内信标记为已读"),
		),
		handleOaMessageReadAll,
	)

	// ── 公告 notice (9) ──
	s.AddTool(
		mcp.NewTool("oa_notice_list",
			mcp.WithDescription("查询公告管理端列表(分页)"),
			mcp.WithString("title", mcp.Description("标题关键词")),
			mcp.WithNumber("type", mcp.Description("类型:1通知 2公告(不传查全部)")),
			mcp.WithNumber("status", mcp.Description("状态:0草稿 1发布(不传查全部)")),
			mcp.WithNumber("page", mcp.Description("页码(默认1)")),
			mcp.WithNumber("page_size", mcp.Description("每页条数(默认20)")),
		),
		handleOaNoticeList,
	)
	s.AddTool(
		mcp.NewTool("oa_notice_feed",
			mcp.WithDescription("首页公告流(已发布的最新公告)"),
			mcp.WithNumber("limit", mcp.Description("返回条数(默认5)")),
		),
		handleOaNoticeFeed,
	)
	s.AddTool(
		mcp.NewTool("oa_notice_published",
			mcp.WithDescription("查询已发布公告"),
			mcp.WithNumber("type", mcp.Description("类型:1通知 2公告(不传查全部)")),
			mcp.WithNumber("limit", mcp.Description("返回条数(默认10)")),
		),
		handleOaNoticePublished,
	)
	s.AddTool(
		mcp.NewTool("oa_notice_get",
			mcp.WithDescription("查询公告详情"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("公告ID")),
		),
		handleOaNoticeGet,
	)
	s.AddTool(
		mcp.NewTool("oa_notice_create",
			mcp.WithDescription("创建公告(默认草稿状态,可用 oa_notice_publish 发布)"),
			mcp.WithString("title", mcp.Required(), mcp.Description("标题")),
			mcp.WithString("content", mcp.Description("正文内容")),
			mcp.WithNumber("type", mcp.Description("类型:1通知 2公告(默认1)")),
		),
		handleOaNoticeCreate,
	)
	s.AddTool(
		mcp.NewTool("oa_notice_update",
			mcp.WithDescription("更新公告(只传要修改的字段)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("公告ID")),
			mcp.WithString("title", mcp.Description("标题")),
			mcp.WithString("content", mcp.Description("正文内容")),
			mcp.WithNumber("type", mcp.Description("类型:1通知 2公告")),
		),
		handleOaNoticeUpdate,
	)
	s.AddTool(
		mcp.NewTool("oa_notice_publish",
			mcp.WithDescription("发布公告(草稿→发布)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("公告ID")),
		),
		handleOaNoticePublish,
	)
	s.AddTool(
		mcp.NewTool("oa_notice_withdraw",
			mcp.WithDescription("撤回公告(发布→草稿)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("公告ID")),
		),
		handleOaNoticeWithdraw,
	)
	s.AddTool(
		mcp.NewTool("oa_notice_delete",
			mcp.WithDescription("删除公告"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("公告ID")),
		),
		handleOaNoticeDelete,
	)

	// ── 日程 schedule (6) ──
	s.AddTool(
		mcp.NewTool("oa_schedule_list",
			mcp.WithDescription("查询日程列表(默认当前用户)"),
			mcp.WithNumber("creator_id", mcp.Description("创建人ID(默认当前用户)")),
			mcp.WithString("event_type", mcp.Description("类型:MEETING/TASK/REMINDER/OUT/OTHER")),
			mcp.WithString("status", mcp.Description("状态:PENDING/DONE/CANCELED")),
			mcp.WithString("start_date", mcp.Description("开始日期(YYYY-MM-DD)")),
			mcp.WithString("end_date", mcp.Description("结束日期(YYYY-MM-DD)")),
			mcp.WithNumber("page", mcp.Description("页码(默认1)")),
			mcp.WithNumber("page_size", mcp.Description("每页条数(默认20)")),
		),
		handleOaScheduleList,
	)
	s.AddTool(
		mcp.NewTool("oa_schedule_calendar",
			mcp.WithDescription("日历视图:返回当前用户指定日期范围内的全部日程"),
			mcp.WithString("start_date", mcp.Required(), mcp.Description("开始日期(YYYY-MM-DD)")),
			mcp.WithString("end_date", mcp.Required(), mcp.Description("结束日期(YYYY-MM-DD)")),
		),
		handleOaScheduleCalendar,
	)
	s.AddTool(
		mcp.NewTool("oa_schedule_get",
			mcp.WithDescription("查询日程详情"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("日程ID")),
		),
		handleOaScheduleGet,
	)
	s.AddTool(
		mcp.NewTool("oa_schedule_create",
			mcp.WithDescription("创建日程"),
			mcp.WithString("title", mcp.Required(), mcp.Description("标题")),
			mcp.WithString("start_time", mcp.Required(), mcp.Description("开始时间(YYYY-MM-DD HH:mm:ss)")),
			mcp.WithString("end_time", mcp.Required(), mcp.Description("结束时间(YYYY-MM-DD HH:mm:ss)")),
			mcp.WithString("event_type", mcp.Description("类型:MEETING/TASK/REMINDER/OUT/OTHER(默认OTHER)")),
			mcp.WithString("location", mcp.Description("地点")),
			mcp.WithString("content", mcp.Description("内容")),
			mcp.WithString("remind_type", mcp.Description("提醒:NONE/MIN5/MIN15/HOUR1/DAY1(默认NONE)")),
			mcp.WithString("status", mcp.Description("状态:PENDING/DONE/CANCELED(默认PENDING)")),
		),
		handleOaScheduleCreate,
	)
	s.AddTool(
		mcp.NewTool("oa_schedule_update",
			mcp.WithDescription("更新日程(只传要修改的字段)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("日程ID")),
			mcp.WithString("title", mcp.Description("标题")),
			mcp.WithString("event_type", mcp.Description("类型")),
			mcp.WithString("start_time", mcp.Description("开始时间(YYYY-MM-DD HH:mm:ss)")),
			mcp.WithString("end_time", mcp.Description("结束时间(YYYY-MM-DD HH:mm:ss)")),
			mcp.WithString("location", mcp.Description("地点")),
			mcp.WithString("content", mcp.Description("内容")),
			mcp.WithString("remind_type", mcp.Description("提醒")),
			mcp.WithString("status", mcp.Description("状态")),
		),
		handleOaScheduleUpdate,
	)
	s.AddTool(
		mcp.NewTool("oa_schedule_delete",
			mcp.WithDescription("删除日程"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("日程ID")),
		),
		handleOaScheduleDelete,
	)

	// ── 工作日志 work_log (5) ──
	s.AddTool(
		mcp.NewTool("oa_work_log_list",
			mcp.WithDescription("查询工作日志列表"),
			mcp.WithString("log_type", mcp.Description("类型:DAILY/WEEKLY/MONTHLY")),
			mcp.WithString("start_date", mcp.Description("开始日期(YYYY-MM-DD)")),
			mcp.WithString("end_date", mcp.Description("结束日期(YYYY-MM-DD)")),
			mcp.WithNumber("page", mcp.Description("页码(默认1)")),
			mcp.WithNumber("page_size", mcp.Description("每页条数(默认20)")),
		),
		handleOaWorkLogList,
	)
	s.AddTool(
		mcp.NewTool("oa_work_log_get",
			mcp.WithDescription("查询工作日志详情"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("日志ID")),
		),
		handleOaWorkLogGet,
	)
	s.AddTool(
		mcp.NewTool("oa_work_log_create",
			mcp.WithDescription("创建工作日志"),
			mcp.WithString("log_date", mcp.Required(), mcp.Description("日志日期(YYYY-MM-DD)")),
			mcp.WithString("log_type", mcp.Description("类型:DAILY/WEEKLY/MONTHLY(默认DAILY)")),
			mcp.WithString("content", mcp.Description("今日完成")),
			mcp.WithString("plan", mcp.Description("明日计划")),
			mcp.WithString("problems", mcp.Description("遇到问题")),
			mcp.WithNumber("dept_id", mcp.Description("部门ID")),
		),
		handleOaWorkLogCreate,
	)
	s.AddTool(
		mcp.NewTool("oa_work_log_update",
			mcp.WithDescription("更新工作日志(只传要修改的字段)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("日志ID")),
			mcp.WithString("log_type", mcp.Description("类型")),
			mcp.WithString("log_date", mcp.Description("日志日期(YYYY-MM-DD)")),
			mcp.WithString("content", mcp.Description("今日完成")),
			mcp.WithString("plan", mcp.Description("明日计划")),
			mcp.WithString("problems", mcp.Description("遇到问题")),
			mcp.WithNumber("dept_id", mcp.Description("部门ID")),
		),
		handleOaWorkLogUpdate,
	)
	s.AddTool(
		mcp.NewTool("oa_work_log_delete",
			mcp.WithDescription("删除工作日志"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("日志ID")),
		),
		handleOaWorkLogDelete,
	)

	// ── 报销 expense (6) ──
	s.AddTool(
		mcp.NewTool("oa_expense_list",
			mcp.WithDescription("查询报销单列表"),
			mcp.WithNumber("applicant_id", mcp.Description("申请人ID")),
			mcp.WithString("expense_type", mcp.Description("费用类型")),
			mcp.WithString("approval_status", mcp.Description("审批状态:NONE/PROCESSING/APPROVED/REJECTED")),
			mcp.WithNumber("payment_status", mcp.Description("打款状态:0未打款 1已打款")),
			mcp.WithNumber("page", mcp.Description("页码(默认1)")),
			mcp.WithNumber("page_size", mcp.Description("每页条数(默认20)")),
		),
		handleOaExpenseList,
	)
	s.AddTool(
		mcp.NewTool("oa_expense_get",
			mcp.WithDescription("查询报销单详情(含明细行)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("报销单ID")),
		),
		handleOaExpenseGet,
	)
	s.AddTool(
		mcp.NewTool("oa_expense_create",
			mcp.WithDescription("创建报销单(含明细行)"),
			mcp.WithString("title", mcp.Required(), mcp.Description("报销标题")),
			mcp.WithString("expense_type", mcp.Required(), mcp.Description("费用类型")),
			mcp.WithString("amount", mcp.Required(), mcp.Description("报销总额(decimal 字符串)")),
			mcp.WithNumber("applicant_id", mcp.Description("申请人ID(默认当前用户)")),
			mcp.WithNumber("dept_id", mcp.Description("部门ID")),
			mcp.WithString("occur_date", mcp.Description("费用发生日期(YYYY-MM-DD)")),
			mcp.WithString("description", mcp.Description("说明")),
			mcp.WithString("items", mcp.Description("明细行JSON数组,如 [{\"item_type\":\"\",\"amount\":\"100\",\"occur_date\":\"2026-08-01\",\"invoice_no\":\"\",\"remark\":\"\"}]")),
		),
		handleOaExpenseCreate,
	)
	s.AddTool(
		mcp.NewTool("oa_expense_update",
			mcp.WithDescription("更新报销单(仅未提交/已驳回可改;只传要修改的字段。注意:传 items 会整体重建明细)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("报销单ID")),
			mcp.WithString("title", mcp.Description("报销标题")),
			mcp.WithNumber("dept_id", mcp.Description("部门ID")),
			mcp.WithString("expense_type", mcp.Description("费用类型")),
			mcp.WithString("amount", mcp.Description("报销总额(decimal 字符串)")),
			mcp.WithString("occur_date", mcp.Description("费用发生日期(YYYY-MM-DD)")),
			mcp.WithString("description", mcp.Description("说明")),
			mcp.WithString("items", mcp.Description("明细行JSON数组(传入则整体重建明细)")),
		),
		handleOaExpenseUpdate,
	)
	s.AddTool(
		mcp.NewTool("oa_expense_delete",
			mcp.WithDescription("删除报销单(仅未提交审批可删)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("报销单ID")),
		),
		handleOaExpenseDelete,
	)
	s.AddTool(
		mcp.NewTool("oa_expense_mark_paid",
			mcp.WithDescription("标记报销单已打款(仅审批通过可标记)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("报销单ID")),
		),
		handleOaExpenseMarkPaid,
	)

	// ── 出差 trip (5) ──
	s.AddTool(
		mcp.NewTool("oa_trip_list",
			mcp.WithDescription("查询出差申请列表"),
			mcp.WithNumber("applicant_id", mcp.Description("申请人ID")),
			mcp.WithString("approval_status", mcp.Description("审批状态:NONE/PROCESSING/APPROVED/REJECTED")),
			mcp.WithNumber("page", mcp.Description("页码(默认1)")),
			mcp.WithNumber("page_size", mcp.Description("每页条数(默认20)")),
		),
		handleOaTripList,
	)
	s.AddTool(
		mcp.NewTool("oa_trip_get",
			mcp.WithDescription("查询出差申请详情"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("出差单ID")),
		),
		handleOaTripGet,
	)
	s.AddTool(
		mcp.NewTool("oa_trip_create",
			mcp.WithDescription("创建出差申请"),
			mcp.WithString("title", mcp.Required(), mcp.Description("出差标题")),
			mcp.WithString("destination", mcp.Required(), mcp.Description("目的地")),
			mcp.WithString("start_date", mcp.Required(), mcp.Description("出发日期(YYYY-MM-DD)")),
			mcp.WithString("end_date", mcp.Required(), mcp.Description("返回日期(YYYY-MM-DD)")),
			mcp.WithNumber("applicant_id", mcp.Description("申请人ID(默认当前用户)")),
			mcp.WithNumber("dept_id", mcp.Description("部门ID")),
			mcp.WithString("purpose", mcp.Description("出差目的")),
			mcp.WithString("transport", mcp.Description("交通方式")),
			mcp.WithString("budget_amount", mcp.Description("预算金额(decimal 字符串)")),
			mcp.WithString("description", mcp.Description("备注说明")),
		),
		handleOaTripCreate,
	)
	s.AddTool(
		mcp.NewTool("oa_trip_update",
			mcp.WithDescription("更新出差申请(仅未提交/已驳回可改;只传要修改的字段)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("出差单ID")),
			mcp.WithString("title", mcp.Description("出差标题")),
			mcp.WithNumber("dept_id", mcp.Description("部门ID")),
			mcp.WithString("destination", mcp.Description("目的地")),
			mcp.WithString("purpose", mcp.Description("出差目的")),
			mcp.WithString("start_date", mcp.Description("出发日期(YYYY-MM-DD)")),
			mcp.WithString("end_date", mcp.Description("返回日期(YYYY-MM-DD)")),
			mcp.WithString("transport", mcp.Description("交通方式")),
			mcp.WithString("budget_amount", mcp.Description("预算金额(decimal 字符串)")),
			mcp.WithString("description", mcp.Description("备注说明")),
		),
		handleOaTripUpdate,
	)
	s.AddTool(
		mcp.NewTool("oa_trip_delete",
			mcp.WithDescription("删除出差申请(仅未提交审批可删)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("出差单ID")),
		),
		handleOaTripDelete,
	)

	// ── 借款 loan (6) ──
	s.AddTool(
		mcp.NewTool("oa_loan_list",
			mcp.WithDescription("查询借款/备用金列表"),
			mcp.WithNumber("applicant_id", mcp.Description("借款人ID")),
			mcp.WithString("loan_type", mcp.Description("借款类型:备用金/差旅借支/个人借款/其他")),
			mcp.WithString("approval_status", mcp.Description("审批状态:NONE/PROCESSING/APPROVED/REJECTED")),
			mcp.WithNumber("repaid_status", mcp.Description("还款状态:0未还 1部分 2已还清")),
			mcp.WithNumber("page", mcp.Description("页码(默认1)")),
			mcp.WithNumber("page_size", mcp.Description("每页条数(默认20)")),
		),
		handleOaLoanList,
	)
	s.AddTool(
		mcp.NewTool("oa_loan_get",
			mcp.WithDescription("查询借款单详情"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("借款单ID")),
		),
		handleOaLoanGet,
	)
	s.AddTool(
		mcp.NewTool("oa_loan_create",
			mcp.WithDescription("创建借款/备用金单"),
			mcp.WithString("title", mcp.Required(), mcp.Description("借款标题")),
			mcp.WithString("loan_type", mcp.Required(), mcp.Description("借款类型:备用金/差旅借支/个人借款/其他")),
			mcp.WithString("amount", mcp.Required(), mcp.Description("借款金额(decimal 字符串)")),
			mcp.WithNumber("applicant_id", mcp.Description("借款人ID(默认当前用户)")),
			mcp.WithNumber("dept_id", mcp.Description("部门ID")),
			mcp.WithString("expected_date", mcp.Description("预计还款日期(YYYY-MM-DD)")),
			mcp.WithString("reason", mcp.Description("借款事由")),
		),
		handleOaLoanCreate,
	)
	s.AddTool(
		mcp.NewTool("oa_loan_update",
			mcp.WithDescription("更新借款单(仅未提交/已驳回可改;只传要修改的字段)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("借款单ID")),
			mcp.WithString("title", mcp.Description("借款标题")),
			mcp.WithNumber("dept_id", mcp.Description("部门ID")),
			mcp.WithString("loan_type", mcp.Description("借款类型")),
			mcp.WithString("amount", mcp.Description("借款金额(decimal 字符串)")),
			mcp.WithString("expected_date", mcp.Description("预计还款日期(YYYY-MM-DD)")),
			mcp.WithString("reason", mcp.Description("借款事由")),
		),
		handleOaLoanUpdate,
	)
	s.AddTool(
		mcp.NewTool("oa_loan_delete",
			mcp.WithDescription("删除借款单(仅未提交审批可删)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("借款单ID")),
		),
		handleOaLoanDelete,
	)
	s.AddTool(
		mcp.NewTool("oa_loan_mark_repaid",
			mcp.WithDescription("标记借款已还清(仅审批通过可标记)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("借款单ID")),
		),
		handleOaLoanMarkRepaid,
	)

	// ── 会议室 meeting_room (5) ──
	s.AddTool(
		mcp.NewTool("oa_meeting_room_list",
			mcp.WithDescription("查询会议室列表"),
			mcp.WithString("name", mcp.Description("会议室名称关键词")),
			mcp.WithString("status", mcp.Description("状态:ENABLED/DISABLED/MAINTENANCE")),
			mcp.WithNumber("page", mcp.Description("页码(默认1)")),
			mcp.WithNumber("page_size", mcp.Description("每页条数(默认20)")),
		),
		handleOaMeetingRoomList,
	)
	s.AddTool(
		mcp.NewTool("oa_meeting_room_get",
			mcp.WithDescription("查询会议室详情"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("会议室ID")),
		),
		handleOaMeetingRoomGet,
	)
	s.AddTool(
		mcp.NewTool("oa_meeting_room_create",
			mcp.WithDescription("创建会议室"),
			mcp.WithString("name", mcp.Required(), mcp.Description("会议室名称")),
			mcp.WithString("location", mcp.Description("位置")),
			mcp.WithNumber("capacity", mcp.Description("容纳人数")),
			mcp.WithString("equipment", mcp.Description("设备(逗号分隔)")),
			mcp.WithString("status", mcp.Description("状态:ENABLED/DISABLED/MAINTENANCE(默认ENABLED)")),
			mcp.WithString("remark", mcp.Description("备注")),
		),
		handleOaMeetingRoomCreate,
	)
	s.AddTool(
		mcp.NewTool("oa_meeting_room_update",
			mcp.WithDescription("更新会议室(只传要修改的字段)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("会议室ID")),
			mcp.WithString("name", mcp.Description("会议室名称")),
			mcp.WithString("location", mcp.Description("位置")),
			mcp.WithNumber("capacity", mcp.Description("容纳人数")),
			mcp.WithString("equipment", mcp.Description("设备(逗号分隔)")),
			mcp.WithString("status", mcp.Description("状态")),
			mcp.WithString("remark", mcp.Description("备注")),
		),
		handleOaMeetingRoomUpdate,
	)
	s.AddTool(
		mcp.NewTool("oa_meeting_room_delete",
			mcp.WithDescription("删除会议室"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("会议室ID")),
		),
		handleOaMeetingRoomDelete,
	)

	// ── 会议预订 meeting_booking (5) ──
	s.AddTool(
		mcp.NewTool("oa_meeting_booking_list",
			mcp.WithDescription("查询会议预订列表"),
			mcp.WithNumber("room_id", mcp.Description("会议室ID")),
			mcp.WithNumber("organizer_id", mcp.Description("预订人ID")),
			mcp.WithString("approval_status", mcp.Description("审批状态:NONE/PROCESSING/APPROVED/REJECTED")),
			mcp.WithString("start_date", mcp.Description("开始日期(YYYY-MM-DD)")),
			mcp.WithString("end_date", mcp.Description("结束日期(YYYY-MM-DD)")),
			mcp.WithNumber("page", mcp.Description("页码(默认1)")),
			mcp.WithNumber("page_size", mcp.Description("每页条数(默认20)")),
		),
		handleOaMeetingBookingList,
	)
	s.AddTool(
		mcp.NewTool("oa_meeting_booking_get",
			mcp.WithDescription("查询会议预订详情"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("预订ID")),
		),
		handleOaMeetingBookingGet,
	)
	s.AddTool(
		mcp.NewTool("oa_meeting_booking_create",
			mcp.WithDescription("创建会议预订(自动冲突检测)"),
			mcp.WithString("title", mcp.Required(), mcp.Description("会议标题")),
			mcp.WithNumber("room_id", mcp.Required(), mcp.Description("会议室ID")),
			mcp.WithString("start_time", mcp.Required(), mcp.Description("开始时间(YYYY-MM-DD HH:mm:ss)")),
			mcp.WithString("end_time", mcp.Required(), mcp.Description("结束时间(YYYY-MM-DD HH:mm:ss)")),
			mcp.WithNumber("attendees", mcp.Description("参会人数")),
			mcp.WithString("topic", mcp.Description("会议主题/议程")),
			mcp.WithString("remark", mcp.Description("备注")),
			mcp.WithNumber("dept_id", mcp.Description("部门ID")),
		),
		handleOaMeetingBookingCreate,
	)
	s.AddTool(
		mcp.NewTool("oa_meeting_booking_update",
			mcp.WithDescription("更新会议预订(仅未提交/已驳回可改;只传要修改的字段;改会议室或时间会重新检测冲突)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("预订ID")),
			mcp.WithString("title", mcp.Description("会议标题")),
			mcp.WithNumber("room_id", mcp.Description("会议室ID")),
			mcp.WithString("start_time", mcp.Description("开始时间(YYYY-MM-DD HH:mm:ss)")),
			mcp.WithString("end_time", mcp.Description("结束时间(YYYY-MM-DD HH:mm:ss)")),
			mcp.WithNumber("attendees", mcp.Description("参会人数")),
			mcp.WithString("topic", mcp.Description("会议主题/议程")),
			mcp.WithString("remark", mcp.Description("备注")),
		),
		handleOaMeetingBookingUpdate,
	)
	s.AddTool(
		mcp.NewTool("oa_meeting_booking_delete",
			mcp.WithDescription("删除会议预订(仅未提交审批可删)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("预订ID")),
		),
		handleOaMeetingBookingDelete,
	)

	// ── 表单模板 form_template (7) ──
	s.AddTool(
		mcp.NewTool("oa_form_template_list",
			mcp.WithDescription("查询表单模板管理端列表"),
			mcp.WithString("name", mcp.Description("表单名称关键词")),
			mcp.WithString("category", mcp.Description("分类:business/non-business")),
			mcp.WithNumber("status", mcp.Description("状态:0停用 1启用(不传查全部)")),
			mcp.WithNumber("page", mcp.Description("页码(默认1)")),
			mcp.WithNumber("page_size", mcp.Description("每页条数(默认20)")),
		),
		handleOaFormTemplateList,
	)
	s.AddTool(
		mcp.NewTool("oa_form_template_list_enabled",
			mcp.WithDescription("查询全部启用的表单模板(用户端)"),
		),
		handleOaFormTemplateListEnabled,
	)
	s.AddTool(
		mcp.NewTool("oa_form_template_get",
			mcp.WithDescription("查询表单模板详情"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("模板ID")),
		),
		handleOaFormTemplateGet,
	)
	s.AddTool(
		mcp.NewTool("oa_form_template_create",
			mcp.WithDescription("创建表单模板"),
			mcp.WithString("form_key", mcp.Required(), mcp.Description("表单标识(如 seal_apply)")),
			mcp.WithString("name", mcp.Required(), mcp.Description("表单名称")),
			mcp.WithString("fields_config", mcp.Required(), mcp.Description("字段定义JSON")),
			mcp.WithString("icon", mcp.Description("图标")),
			mcp.WithString("description", mcp.Description("描述")),
			mcp.WithString("category", mcp.Description("分类:business/non-business(默认non-business)")),
			mcp.WithNumber("status", mcp.Description("状态:0停用 1启用(默认1)")),
			mcp.WithNumber("sort", mcp.Description("排序")),
		),
		handleOaFormTemplateCreate,
	)
	s.AddTool(
		mcp.NewTool("oa_form_template_update",
			mcp.WithDescription("更新表单模板(只传要修改的字段)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("模板ID")),
			mcp.WithString("form_key", mcp.Description("表单标识")),
			mcp.WithString("name", mcp.Description("表单名称")),
			mcp.WithString("icon", mcp.Description("图标")),
			mcp.WithString("description", mcp.Description("描述")),
			mcp.WithString("fields_config", mcp.Description("字段定义JSON")),
			mcp.WithString("category", mcp.Description("分类")),
			mcp.WithNumber("status", mcp.Description("状态:0停用 1启用")),
			mcp.WithNumber("sort", mcp.Description("排序")),
		),
		handleOaFormTemplateUpdate,
	)
	s.AddTool(
		mcp.NewTool("oa_form_template_delete",
			mcp.WithDescription("删除表单模板"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("模板ID")),
		),
		handleOaFormTemplateDelete,
	)
	s.AddTool(
		mcp.NewTool("oa_form_template_toggle",
			mcp.WithDescription("启用/停用表单模板(切换状态)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("模板ID")),
		),
		handleOaFormTemplateToggle,
	)

	// ── 表单数据 form_data (5) ──
	s.AddTool(
		mcp.NewTool("oa_form_data_list",
			mcp.WithDescription("查询表单数据列表"),
			mcp.WithNumber("template_id", mcp.Description("模板ID")),
			mcp.WithNumber("submitter_id", mcp.Description("提交人ID")),
			mcp.WithString("template_key", mcp.Description("表单标识")),
			mcp.WithString("approval_status", mcp.Description("审批状态:NONE/PROCESSING/APPROVED/REJECTED")),
			mcp.WithNumber("page", mcp.Description("页码(默认1)")),
			mcp.WithNumber("page_size", mcp.Description("每页条数(默认20)")),
		),
		handleOaFormDataList,
	)
	s.AddTool(
		mcp.NewTool("oa_form_data_get",
			mcp.WithDescription("查询表单数据详情"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("表单数据ID")),
		),
		handleOaFormDataGet,
	)
	s.AddTool(
		mcp.NewTool("oa_form_data_create",
			mcp.WithDescription("提交表单数据"),
			mcp.WithNumber("template_id", mcp.Required(), mcp.Description("模板ID")),
			mcp.WithString("field_values", mcp.Required(), mcp.Description("填写数据JSON")),
		),
		handleOaFormDataCreate,
	)
	s.AddTool(
		mcp.NewTool("oa_form_data_update",
			mcp.WithDescription("更新表单数据(仅未提交/已驳回可改)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("表单数据ID")),
			mcp.WithString("field_values", mcp.Description("填写数据JSON")),
		),
		handleOaFormDataUpdate,
	)
	s.AddTool(
		mcp.NewTool("oa_form_data_delete",
			mcp.WithDescription("删除表单数据(仅未提交审批可删)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("表单数据ID")),
		),
		handleOaFormDataDelete,
	)
}

// ── 站内信 handlers ──

func handleOaMessageInbox(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewMessageService()
	page, pageSize := mcpPage(req)
	list, total, err := svc.Inbox(ctx, page, pageSize, userIDFromContext(ctx))
	if err != nil {
		return resultError(fmt.Sprintf("查询收件箱失败: %v", err))
	}
	return resultText(map[string]any{"list": list, "total": total, "page": page, "size": pageSize})
}

func handleOaMessageOutbox(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewMessageService()
	page, pageSize := mcpPage(req)
	list, total, err := svc.Outbox(ctx, page, pageSize, userIDFromContext(ctx))
	if err != nil {
		return resultError(fmt.Sprintf("查询发件箱失败: %v", err))
	}
	return resultText(map[string]any{"list": list, "total": total, "page": page, "size": pageSize})
}

func handleOaMessageUnreadCount(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewMessageService()
	count, err := svc.GetUnreadCount(ctx, userIDFromContext(ctx))
	if err != nil {
		return resultError(fmt.Sprintf("查询未读数失败: %v", err))
	}
	return resultText(map[string]any{"unread_count": count})
}

func handleOaMessageGet(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewMessageService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("消息ID(id)必填")
	}
	msg, err := svc.GetByID(ctx, id, userIDFromContext(ctx))
	if err != nil {
		return resultError(fmt.Sprintf("查询消息失败: %v", err))
	}
	return resultText(msg)
}

func handleOaMessageSend(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewMessageService()
	receiverID := uint(req.GetFloat("receiver_id", 0))
	title := req.GetString("title", "")
	content := req.GetString("content", "")
	if receiverID == 0 || title == "" || content == "" {
		return resultError("接收人ID(receiver_id)、标题(title)、内容(content)必填")
	}
	sendReq := &oasvc.SendMessageRequest{
		ReceiverID:  receiverID,
		Title:       title,
		Content:     content,
		ContentType: req.GetString("content_type", ""),
	}
	if err := svc.Send(ctx, userIDFromContext(ctx), sendReq); err != nil {
		return resultError(fmt.Sprintf("发送消息失败: %v", err))
	}
	return resultText(map[string]any{"message": "消息已发送", "receiver_id": receiverID})
}

func handleOaMessageMarkRead(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewMessageService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("消息ID(id)必填")
	}
	if err := svc.MarkAsRead(ctx, id, userIDFromContext(ctx)); err != nil {
		return resultError(fmt.Sprintf("标记已读失败: %v", err))
	}
	return resultText(map[string]any{"message": "已标记已读", "id": id})
}

func handleOaMessageReadAll(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewMessageService()
	n, err := svc.MarkAllAsRead(ctx, userIDFromContext(ctx))
	if err != nil {
		return resultError(fmt.Sprintf("全部已读失败: %v", err))
	}
	return resultText(map[string]any{"message": "已全部标记已读", "marked": n})
}

// ── 公告 handlers ──

func handleOaNoticeList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewNoticeService()
	page, pageSize := mcpPage(req)
	list, total, err := svc.List(ctx, page, pageSize,
		req.GetString("title", ""),
		int8(req.GetFloat("type", 0)),
		int8(req.GetFloat("status", 0)),
	)
	if err != nil {
		return resultError(fmt.Sprintf("查询公告列表失败: %v", err))
	}
	return resultText(map[string]any{"list": list, "total": total, "page": page, "size": pageSize})
}

func handleOaNoticeFeed(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewNoticeService()
	limit := int(req.GetFloat("limit", 5))
	if limit <= 0 {
		limit = 5
	}
	list, err := svc.FindPublished(ctx, 0, limit)
	if err != nil {
		return resultError(fmt.Sprintf("查询公告流失败: %v", err))
	}
	return resultText(map[string]any{"list": list})
}

func handleOaNoticePublished(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewNoticeService()
	limit := int(req.GetFloat("limit", 10))
	if limit <= 0 {
		limit = 10
	}
	list, err := svc.FindPublished(ctx, int8(req.GetFloat("type", 0)), limit)
	if err != nil {
		return resultError(fmt.Sprintf("查询已发布公告失败: %v", err))
	}
	return resultText(map[string]any{"list": list})
}

func handleOaNoticeGet(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewNoticeService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("公告ID(id)必填")
	}
	n, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("查询公告失败: %v", err))
	}
	return resultText(n)
}

func handleOaNoticeCreate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewNoticeService()
	title := req.GetString("title", "")
	if title == "" {
		return resultError("公告标题(title)必填")
	}
	createReq := &oasvc.CreateNoticeRequest{
		Title:   title,
		Content: req.GetString("content", ""),
		Type:    int8(req.GetFloat("type", 0)),
	}
	n, err := svc.Create(ctx, createReq)
	if err != nil {
		return resultError(fmt.Sprintf("创建公告失败: %v", err))
	}
	return resultText(n)
}

func handleOaNoticeUpdate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewNoticeService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("公告ID(id)必填")
	}
	existing, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("公告不存在: %v", err))
	}
	title := req.GetString("title", existing.Title)
	if title == "" {
		return resultError("公告标题不能为空")
	}
	noticeType := existing.Type
	if args := req.GetArguments(); args != nil {
		if _, ok := args["type"]; ok {
			noticeType = int8(req.GetFloat("type", 0))
		}
	}
	upd := &oasvc.UpdateNoticeRequest{
		Title:   title,
		Content: req.GetString("content", existing.Content),
		Type:    noticeType,
	}
	if err := svc.Update(ctx, id, upd); err != nil {
		return resultError(fmt.Sprintf("更新公告失败: %v", err))
	}
	return resultText(map[string]any{"message": "公告已更新", "id": id})
}

func handleOaNoticePublish(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewNoticeService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("公告ID(id)必填")
	}
	if err := svc.Publish(ctx, id); err != nil {
		return resultError(fmt.Sprintf("发布公告失败: %v", err))
	}
	return resultText(map[string]any{"message": "公告已发布", "id": id})
}

func handleOaNoticeWithdraw(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewNoticeService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("公告ID(id)必填")
	}
	if err := svc.Withdraw(ctx, id); err != nil {
		return resultError(fmt.Sprintf("撤回公告失败: %v", err))
	}
	return resultText(map[string]any{"message": "公告已撤回", "id": id})
}

func handleOaNoticeDelete(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewNoticeService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("公告ID(id)必填")
	}
	if err := svc.Delete(ctx, id); err != nil {
		return resultError(fmt.Sprintf("删除公告失败: %v", err))
	}
	return resultText(map[string]any{"message": "公告已删除", "id": id})
}

// ── 日程 handlers ──

func handleOaScheduleList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewScheduleService()
	page, pageSize := mcpPage(req)
	creatorID := uint(req.GetFloat("creator_id", float64(userIDFromContext(ctx))))
	list, total, err := svc.List(ctx, page, pageSize, creatorID,
		req.GetString("event_type", ""),
		req.GetString("status", ""),
		req.GetString("start_date", ""),
		req.GetString("end_date", ""),
	)
	if err != nil {
		return resultError(fmt.Sprintf("查询日程列表失败: %v", err))
	}
	return resultText(map[string]any{"list": list, "total": total, "page": page, "size": pageSize})
}

func handleOaScheduleCalendar(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewScheduleService()
	startDate := req.GetString("start_date", "")
	endDate := req.GetString("end_date", "")
	if startDate == "" || endDate == "" {
		return resultError("开始日期(start_date)和结束日期(end_date)必填")
	}
	list, err := svc.ListByDateRange(ctx, userIDFromContext(ctx), startDate, endDate)
	if err != nil {
		return resultError(fmt.Sprintf("查询日程日历失败: %v", err))
	}
	return resultText(map[string]any{"list": list})
}

func handleOaScheduleGet(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewScheduleService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("日程ID(id)必填")
	}
	sch, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("查询日程失败: %v", err))
	}
	return resultText(sch)
}

func handleOaScheduleCreate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewScheduleService()
	title := req.GetString("title", "")
	startTime := req.GetString("start_time", "")
	endTime := req.GetString("end_time", "")
	if title == "" || startTime == "" || endTime == "" {
		return resultError("标题(title)、开始时间(start_time)、结束时间(end_time)必填")
	}
	createReq := &oasvc.CreateScheduleRequest{
		Title:      title,
		EventType:  req.GetString("event_type", ""),
		StartTime:  startTime,
		EndTime:    endTime,
		Location:   req.GetString("location", ""),
		Content:    req.GetString("content", ""),
		RemindType: req.GetString("remind_type", ""),
		Status:     req.GetString("status", ""),
	}
	sch, err := svc.Create(ctx, createReq, userIDFromContext(ctx))
	if err != nil {
		return resultError(fmt.Sprintf("创建日程失败: %v", err))
	}
	return resultText(sch)
}

func handleOaScheduleUpdate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewScheduleService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("日程ID(id)必填")
	}
	existing, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("日程不存在: %v", err))
	}
	// start_time/end_time 留空时 service 自动保留旧值
	upd := &oasvc.UpdateScheduleRequest{
		Title:      req.GetString("title", existing.Title),
		EventType:  req.GetString("event_type", existing.EventType),
		StartTime:  req.GetString("start_time", ""),
		EndTime:    req.GetString("end_time", ""),
		Location:   req.GetString("location", existing.Location),
		Content:    req.GetString("content", existing.Content),
		RemindType: req.GetString("remind_type", existing.RemindType),
		Status:     req.GetString("status", existing.Status),
	}
	if err := svc.Update(ctx, id, upd); err != nil {
		return resultError(fmt.Sprintf("更新日程失败: %v", err))
	}
	return resultText(map[string]any{"message": "日程已更新", "id": id})
}

func handleOaScheduleDelete(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewScheduleService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("日程ID(id)必填")
	}
	if err := svc.Delete(ctx, id); err != nil {
		return resultError(fmt.Sprintf("删除日程失败: %v", err))
	}
	return resultText(map[string]any{"message": "日程已删除", "id": id})
}

// ── 工作日志 handlers ──

func handleOaWorkLogList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewWorkLogService()
	page, pageSize := mcpPage(req)
	list, total, err := svc.List(ctx, page, pageSize,
		req.GetString("log_type", ""),
		req.GetString("start_date", ""),
		req.GetString("end_date", ""),
	)
	if err != nil {
		return resultError(fmt.Sprintf("查询工作日志列表失败: %v", err))
	}
	return resultText(map[string]any{"list": list, "total": total, "page": page, "size": pageSize})
}

func handleOaWorkLogGet(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewWorkLogService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("日志ID(id)必填")
	}
	log, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("查询工作日志失败: %v", err))
	}
	return resultText(log)
}

func handleOaWorkLogCreate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewWorkLogService()
	logDate := req.GetString("log_date", "")
	if logDate == "" {
		return resultError("日志日期(log_date)必填")
	}
	createReq := &oasvc.CreateWorkLogRequest{
		LogType:  req.GetString("log_type", ""),
		LogDate:  logDate,
		Content:  req.GetString("content", ""),
		Plan:     req.GetString("plan", ""),
		Problems: req.GetString("problems", ""),
		DeptID:   oaOptUint(req, "dept_id"),
	}
	log, err := svc.Create(ctx, createReq, userIDFromContext(ctx))
	if err != nil {
		return resultError(fmt.Sprintf("创建工作日志失败: %v", err))
	}
	return resultText(log)
}

func handleOaWorkLogUpdate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewWorkLogService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("日志ID(id)必填")
	}
	existing, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("日志不存在: %v", err))
	}
	// log_date 留空时 service 自动保留旧值
	upd := &oasvc.UpdateWorkLogRequest{
		LogType:  req.GetString("log_type", existing.LogType),
		LogDate:  req.GetString("log_date", ""),
		Content:  req.GetString("content", existing.Content),
		Plan:     req.GetString("plan", existing.Plan),
		Problems: req.GetString("problems", existing.Problems),
		DeptID:   oaDeptID(req, existing.DeptID),
	}
	if err := svc.Update(ctx, id, upd); err != nil {
		return resultError(fmt.Sprintf("更新工作日志失败: %v", err))
	}
	return resultText(map[string]any{"message": "工作日志已更新", "id": id})
}

func handleOaWorkLogDelete(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewWorkLogService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("日志ID(id)必填")
	}
	if err := svc.Delete(ctx, id); err != nil {
		return resultError(fmt.Sprintf("删除工作日志失败: %v", err))
	}
	return resultText(map[string]any{"message": "工作日志已删除", "id": id})
}

// ── 报销 handlers ──

func handleOaExpenseList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewExpenseService()
	page, pageSize := mcpPage(req)
	list, total, err := svc.List(ctx, page, pageSize,
		uint(req.GetFloat("applicant_id", 0)),
		req.GetString("expense_type", ""),
		req.GetString("approval_status", ""),
		int8(req.GetFloat("payment_status", 0)),
	)
	if err != nil {
		return resultError(fmt.Sprintf("查询报销单列表失败: %v", err))
	}
	return resultText(map[string]any{"list": list, "total": total, "page": page, "size": pageSize})
}

func handleOaExpenseGet(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewExpenseService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("报销单ID(id)必填")
	}
	detail, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("查询报销单失败: %v", err))
	}
	return resultText(detail)
}

func handleOaExpenseCreate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewExpenseService()
	title := req.GetString("title", "")
	expenseType := req.GetString("expense_type", "")
	amount := req.GetString("amount", "")
	if title == "" || expenseType == "" || amount == "" {
		return resultError("报销标题(title)、费用类型(expense_type)、金额(amount)必填")
	}
	items, err := oaExpenseItems(req.GetString("items", ""))
	if err != nil {
		return resultError(err.Error())
	}
	createReq := &oasvc.CreateExpenseRequest{
		Title:       title,
		ApplicantID: uint(req.GetFloat("applicant_id", 0)),
		DeptID:      oaOptUint(req, "dept_id"),
		ExpenseType: expenseType,
		Amount:      amount,
		OccurDate:   req.GetString("occur_date", ""),
		Description: req.GetString("description", ""),
		Items:       items,
	}
	expense, err := svc.Create(ctx, createReq, userIDFromContext(ctx))
	if err != nil {
		return resultError(fmt.Sprintf("创建报销单失败: %v", err))
	}
	return resultText(expense)
}

func handleOaExpenseUpdate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewExpenseService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("报销单ID(id)必填")
	}
	existing, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("报销单不存在: %v", err))
	}

	// 明细:传入 items 则整体重建,否则保留现有明细(转换为输入)
	items := make([]oasvc.ExpenseItemInput, 0, len(existing.Items))
	if itemsStr := req.GetString("items", ""); itemsStr != "" {
		if err := json.Unmarshal([]byte(itemsStr), &items); err != nil {
			return resultError(fmt.Sprintf("明细 items 格式错误: %v", err))
		}
	} else {
		for _, it := range existing.Items {
			ii := oasvc.ExpenseItemInput{
				ItemType:  it.ItemType,
				Amount:    it.Amount.String(),
				InvoiceNo: it.InvoiceNo,
				Remark:    it.Remark,
			}
			if !it.OccurDate.IsZero() {
				ii.OccurDate = time.Time(it.OccurDate).Format("2006-01-02")
			}
			items = append(items, ii)
		}
	}

	// amount/occur_date 留空时 service 自动保留旧值
	upd := &oasvc.UpdateExpenseRequest{
		Title:       req.GetString("title", existing.Expense.Title),
		DeptID:      oaDeptID(req, existing.Expense.DeptID),
		ExpenseType: req.GetString("expense_type", existing.Expense.ExpenseType),
		Amount:      req.GetString("amount", ""),
		OccurDate:   req.GetString("occur_date", ""),
		Description: req.GetString("description", existing.Expense.Description),
		Items:       items,
	}
	if err := svc.Update(ctx, id, upd); err != nil {
		return resultError(fmt.Sprintf("更新报销单失败: %v", err))
	}
	return resultText(map[string]any{"message": "报销单已更新", "id": id})
}

func handleOaExpenseDelete(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewExpenseService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("报销单ID(id)必填")
	}
	if err := svc.Delete(ctx, id); err != nil {
		return resultError(fmt.Sprintf("删除报销单失败: %v", err))
	}
	return resultText(map[string]any{"message": "报销单已删除", "id": id})
}

func handleOaExpenseMarkPaid(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewExpenseService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("报销单ID(id)必填")
	}
	if err := svc.MarkPaid(ctx, id); err != nil {
		return resultError(fmt.Sprintf("标记打款失败: %v", err))
	}
	return resultText(map[string]any{"message": "报销单已标记打款", "id": id})
}

// ── 出差 handlers ──

func handleOaTripList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewTripService()
	page, pageSize := mcpPage(req)
	list, total, err := svc.List(ctx, page, pageSize,
		uint(req.GetFloat("applicant_id", 0)),
		req.GetString("approval_status", ""),
	)
	if err != nil {
		return resultError(fmt.Sprintf("查询出差列表失败: %v", err))
	}
	return resultText(map[string]any{"list": list, "total": total, "page": page, "size": pageSize})
}

func handleOaTripGet(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewTripService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("出差单ID(id)必填")
	}
	trip, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("查询出差单失败: %v", err))
	}
	return resultText(trip)
}

func handleOaTripCreate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewTripService()
	title := req.GetString("title", "")
	destination := req.GetString("destination", "")
	startDate := req.GetString("start_date", "")
	endDate := req.GetString("end_date", "")
	if title == "" || destination == "" || startDate == "" || endDate == "" {
		return resultError("标题(title)、目的地(destination)、出发日期(start_date)、返回日期(end_date)必填")
	}
	createReq := &oasvc.CreateTripRequest{
		Title:        title,
		ApplicantID:  uint(req.GetFloat("applicant_id", 0)),
		DeptID:       oaOptUint(req, "dept_id"),
		Destination:  destination,
		Purpose:      req.GetString("purpose", ""),
		StartDate:    startDate,
		EndDate:      endDate,
		Transport:    req.GetString("transport", ""),
		BudgetAmount: req.GetString("budget_amount", ""),
		Description:  req.GetString("description", ""),
	}
	trip, err := svc.Create(ctx, createReq, userIDFromContext(ctx))
	if err != nil {
		return resultError(fmt.Sprintf("创建出差单失败: %v", err))
	}
	return resultText(trip)
}

func handleOaTripUpdate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewTripService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("出差单ID(id)必填")
	}
	existing, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("出差单不存在: %v", err))
	}
	// start_date/end_date 留空时 service 自动保留旧值
	upd := &oasvc.UpdateTripRequest{
		Title:        req.GetString("title", existing.Title),
		DeptID:       oaDeptID(req, existing.DeptID),
		Destination:  req.GetString("destination", existing.Destination),
		Purpose:      req.GetString("purpose", existing.Purpose),
		StartDate:    req.GetString("start_date", ""),
		EndDate:      req.GetString("end_date", ""),
		Transport:    req.GetString("transport", existing.Transport),
		BudgetAmount: req.GetString("budget_amount", existing.BudgetAmount),
		Description:  req.GetString("description", existing.Description),
	}
	if err := svc.Update(ctx, id, upd); err != nil {
		return resultError(fmt.Sprintf("更新出差单失败: %v", err))
	}
	return resultText(map[string]any{"message": "出差单已更新", "id": id})
}

func handleOaTripDelete(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewTripService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("出差单ID(id)必填")
	}
	if err := svc.Delete(ctx, id); err != nil {
		return resultError(fmt.Sprintf("删除出差单失败: %v", err))
	}
	return resultText(map[string]any{"message": "出差单已删除", "id": id})
}

// ── 借款 handlers ──

func handleOaLoanList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewLoanService()
	page, pageSize := mcpPage(req)
	list, total, err := svc.List(ctx, page, pageSize,
		uint(req.GetFloat("applicant_id", 0)),
		req.GetString("loan_type", ""),
		req.GetString("approval_status", ""),
		int8(req.GetFloat("repaid_status", 0)),
	)
	if err != nil {
		return resultError(fmt.Sprintf("查询借款列表失败: %v", err))
	}
	return resultText(map[string]any{"list": list, "total": total, "page": page, "size": pageSize})
}

func handleOaLoanGet(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewLoanService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("借款单ID(id)必填")
	}
	loan, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("查询借款单失败: %v", err))
	}
	return resultText(loan)
}

func handleOaLoanCreate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewLoanService()
	title := req.GetString("title", "")
	loanType := req.GetString("loan_type", "")
	amount := req.GetString("amount", "")
	if title == "" || loanType == "" || amount == "" {
		return resultError("借款标题(title)、类型(loan_type)、金额(amount)必填")
	}
	createReq := &oasvc.CreateLoanRequest{
		Title:        title,
		ApplicantID:  uint(req.GetFloat("applicant_id", 0)),
		DeptID:       oaOptUint(req, "dept_id"),
		LoanType:     loanType,
		Amount:       amount,
		ExpectedDate: req.GetString("expected_date", ""),
		Reason:       req.GetString("reason", ""),
	}
	loan, err := svc.Create(ctx, createReq, userIDFromContext(ctx))
	if err != nil {
		return resultError(fmt.Sprintf("创建借款单失败: %v", err))
	}
	return resultText(loan)
}

func handleOaLoanUpdate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewLoanService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("借款单ID(id)必填")
	}
	existing, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("借款单不存在: %v", err))
	}
	// amount/expected_date 留空时 service 自动保留旧值
	upd := &oasvc.UpdateLoanRequest{
		Title:        req.GetString("title", existing.Title),
		DeptID:       oaDeptID(req, existing.DeptID),
		LoanType:     req.GetString("loan_type", existing.LoanType),
		Amount:       req.GetString("amount", ""),
		ExpectedDate: req.GetString("expected_date", ""),
		Reason:       req.GetString("reason", existing.Reason),
	}
	if err := svc.Update(ctx, id, upd); err != nil {
		return resultError(fmt.Sprintf("更新借款单失败: %v", err))
	}
	return resultText(map[string]any{"message": "借款单已更新", "id": id})
}

func handleOaLoanDelete(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewLoanService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("借款单ID(id)必填")
	}
	if err := svc.Delete(ctx, id); err != nil {
		return resultError(fmt.Sprintf("删除借款单失败: %v", err))
	}
	return resultText(map[string]any{"message": "借款单已删除", "id": id})
}

func handleOaLoanMarkRepaid(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewLoanService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("借款单ID(id)必填")
	}
	if err := svc.MarkRepaid(ctx, id); err != nil {
		return resultError(fmt.Sprintf("标记还款失败: %v", err))
	}
	return resultText(map[string]any{"message": "借款单已标记还清", "id": id})
}

// ── 会议室 handlers ──

func handleOaMeetingRoomList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewMeetingRoomService()
	page, pageSize := mcpPage(req)
	list, total, err := svc.List(ctx, page, pageSize,
		req.GetString("name", ""),
		req.GetString("status", ""),
	)
	if err != nil {
		return resultError(fmt.Sprintf("查询会议室列表失败: %v", err))
	}
	return resultText(map[string]any{"list": list, "total": total, "page": page, "size": pageSize})
}

func handleOaMeetingRoomGet(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewMeetingRoomService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("会议室ID(id)必填")
	}
	room, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("查询会议室失败: %v", err))
	}
	return resultText(room)
}

func handleOaMeetingRoomCreate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewMeetingRoomService()
	name := req.GetString("name", "")
	if name == "" {
		return resultError("会议室名称(name)必填")
	}
	createReq := &oasvc.CreateMeetingRoomRequest{
		Name:      name,
		Location:  req.GetString("location", ""),
		Capacity:  int(req.GetFloat("capacity", 0)),
		Equipment: req.GetString("equipment", ""),
		Status:    req.GetString("status", ""),
		Remark:    req.GetString("remark", ""),
	}
	room, err := svc.Create(ctx, createReq)
	if err != nil {
		return resultError(fmt.Sprintf("创建会议室失败: %v", err))
	}
	return resultText(room)
}

func handleOaMeetingRoomUpdate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewMeetingRoomService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("会议室ID(id)必填")
	}
	existing, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("会议室不存在: %v", err))
	}
	upd := &oasvc.UpdateMeetingRoomRequest{
		Name:      req.GetString("name", existing.Name),
		Location:  req.GetString("location", existing.Location),
		Capacity:  int(req.GetFloat("capacity", float64(existing.Capacity))),
		Equipment: req.GetString("equipment", existing.Equipment),
		Status:    req.GetString("status", existing.Status),
		Remark:    req.GetString("remark", existing.Remark),
	}
	if err := svc.Update(ctx, id, upd); err != nil {
		return resultError(fmt.Sprintf("更新会议室失败: %v", err))
	}
	return resultText(map[string]any{"message": "会议室已更新", "id": id})
}

func handleOaMeetingRoomDelete(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewMeetingRoomService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("会议室ID(id)必填")
	}
	if err := svc.Delete(ctx, id); err != nil {
		return resultError(fmt.Sprintf("删除会议室失败: %v", err))
	}
	return resultText(map[string]any{"message": "会议室已删除", "id": id})
}

// ── 会议预订 handlers ──

func handleOaMeetingBookingList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewMeetingBookingService()
	page, pageSize := mcpPage(req)
	list, total, err := svc.List(ctx, page, pageSize,
		uint(req.GetFloat("room_id", 0)),
		uint(req.GetFloat("organizer_id", 0)),
		req.GetString("approval_status", ""),
		req.GetString("start_date", ""),
		req.GetString("end_date", ""),
	)
	if err != nil {
		return resultError(fmt.Sprintf("查询会议预订列表失败: %v", err))
	}
	return resultText(map[string]any{"list": list, "total": total, "page": page, "size": pageSize})
}

func handleOaMeetingBookingGet(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewMeetingBookingService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("预订ID(id)必填")
	}
	booking, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("查询会议预订失败: %v", err))
	}
	return resultText(booking)
}

func handleOaMeetingBookingCreate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewMeetingBookingService()
	title := req.GetString("title", "")
	roomID := uint(req.GetFloat("room_id", 0))
	startTime := req.GetString("start_time", "")
	endTime := req.GetString("end_time", "")
	if title == "" || roomID == 0 || startTime == "" || endTime == "" {
		return resultError("标题(title)、会议室ID(room_id)、开始时间(start_time)、结束时间(end_time)必填")
	}
	createReq := &oasvc.CreateMeetingBookingRequest{
		Title:      title,
		RoomID:     roomID,
		StartTime:  startTime,
		EndTime:    endTime,
		Attendees:  int(req.GetFloat("attendees", 0)),
		Topic:      req.GetString("topic", ""),
		Remark:     req.GetString("remark", ""),
		DeptID:     oaOptUint(req, "dept_id"),
	}
	booking, err := svc.Create(ctx, createReq, userIDFromContext(ctx))
	if err != nil {
		return resultError(fmt.Sprintf("创建会议预订失败: %v", err))
	}
	return resultText(booking)
}

func handleOaMeetingBookingUpdate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewMeetingBookingService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("预订ID(id)必填")
	}
	existing, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("会议预订不存在: %v", err))
	}
	// attendees service 无条件覆盖,需显式保留旧值
	attendees := existing.Attendees
	if args := req.GetArguments(); args != nil {
		if _, ok := args["attendees"]; ok {
			attendees = int(req.GetFloat("attendees", 0))
		}
	}
	// start_time/end_time/room_id 留空/0 时 service 自动保留旧值
	upd := &oasvc.UpdateMeetingBookingRequest{
		Title:     req.GetString("title", existing.Title),
		RoomID:    uint(req.GetFloat("room_id", float64(existing.RoomID))),
		StartTime: req.GetString("start_time", ""),
		EndTime:   req.GetString("end_time", ""),
		Attendees: attendees,
		Topic:     req.GetString("topic", existing.Topic),
		Remark:    req.GetString("remark", existing.Remark),
	}
	if err := svc.Update(ctx, id, upd); err != nil {
		return resultError(fmt.Sprintf("更新会议预订失败: %v", err))
	}
	return resultText(map[string]any{"message": "会议预订已更新", "id": id})
}

func handleOaMeetingBookingDelete(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewMeetingBookingService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("预订ID(id)必填")
	}
	if err := svc.Delete(ctx, id); err != nil {
		return resultError(fmt.Sprintf("删除会议预订失败: %v", err))
	}
	return resultText(map[string]any{"message": "会议预订已删除", "id": id})
}

// ── 表单模板 handlers ──

func handleOaFormTemplateList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewFormTemplateService()
	page, pageSize := mcpPage(req)
	list, total, err := svc.List(ctx, page, pageSize,
		req.GetString("name", ""),
		req.GetString("category", ""),
		int8(req.GetFloat("status", 0)),
	)
	if err != nil {
		return resultError(fmt.Sprintf("查询表单模板列表失败: %v", err))
	}
	return resultText(map[string]any{"list": list, "total": total, "page": page, "size": pageSize})
}

func handleOaFormTemplateListEnabled(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewFormTemplateService()
	list, err := svc.ListEnabled(ctx)
	if err != nil {
		return resultError(fmt.Sprintf("查询启用表单模板失败: %v", err))
	}
	return resultText(map[string]any{"list": list})
}

func handleOaFormTemplateGet(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewFormTemplateService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("模板ID(id)必填")
	}
	tpl, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("查询表单模板失败: %v", err))
	}
	return resultText(tpl)
}

func handleOaFormTemplateCreate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewFormTemplateService()
	formKey := req.GetString("form_key", "")
	name := req.GetString("name", "")
	fieldsConfig := req.GetString("fields_config", "")
	if formKey == "" || name == "" || fieldsConfig == "" {
		return resultError("表单标识(form_key)、名称(name)、字段定义(fields_config)必填")
	}
	createReq := &oasvc.CreateFormTemplateRequest{
		FormKey:      formKey,
		Name:         name,
		Icon:         req.GetString("icon", ""),
		Description:  req.GetString("description", ""),
		FieldsConfig: fieldsConfig,
		Category:     req.GetString("category", ""),
		Status:       int8(req.GetFloat("status", 0)),
		Sort:         int(req.GetFloat("sort", 0)),
	}
	tpl, err := svc.Create(ctx, createReq)
	if err != nil {
		return resultError(fmt.Sprintf("创建表单模板失败: %v", err))
	}
	return resultText(tpl)
}

func handleOaFormTemplateUpdate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewFormTemplateService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("模板ID(id)必填")
	}
	existing, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("表单模板不存在: %v", err))
	}
	upd := &oasvc.UpdateFormTemplateRequest{
		FormKey:      req.GetString("form_key", existing.FormKey),
		Name:         req.GetString("name", existing.Name),
		Icon:         req.GetString("icon", existing.Icon),
		Description:  req.GetString("description", existing.Description),
		FieldsConfig: req.GetString("fields_config", existing.FieldsConfig),
		Category:     req.GetString("category", existing.Category),
		Status:       int8(req.GetFloat("status", float64(existing.Status))),
		Sort:         int(req.GetFloat("sort", float64(existing.Sort))),
	}
	if err := svc.Update(ctx, id, upd); err != nil {
		return resultError(fmt.Sprintf("更新表单模板失败: %v", err))
	}
	return resultText(map[string]any{"message": "表单模板已更新", "id": id})
}

func handleOaFormTemplateDelete(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewFormTemplateService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("模板ID(id)必填")
	}
	if err := svc.Delete(ctx, id); err != nil {
		return resultError(fmt.Sprintf("删除表单模板失败: %v", err))
	}
	return resultText(map[string]any{"message": "表单模板已删除", "id": id})
}

func handleOaFormTemplateToggle(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewFormTemplateService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("模板ID(id)必填")
	}
	if err := svc.ToggleStatus(ctx, id); err != nil {
		return resultError(fmt.Sprintf("切换表单模板状态失败: %v", err))
	}
	return resultText(map[string]any{"message": "表单模板状态已切换", "id": id})
}

// ── 表单数据 handlers ──

func handleOaFormDataList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewFormDataService()
	page, pageSize := mcpPage(req)
	list, total, err := svc.List(ctx, page, pageSize,
		uint(req.GetFloat("template_id", 0)),
		uint(req.GetFloat("submitter_id", 0)),
		req.GetString("template_key", ""),
		req.GetString("approval_status", ""),
	)
	if err != nil {
		return resultError(fmt.Sprintf("查询表单数据列表失败: %v", err))
	}
	return resultText(map[string]any{"list": list, "total": total, "page": page, "size": pageSize})
}

func handleOaFormDataGet(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewFormDataService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("表单数据ID(id)必填")
	}
	data, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("查询表单数据失败: %v", err))
	}
	return resultText(data)
}

func handleOaFormDataCreate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewFormDataService()
	templateID := uint(req.GetFloat("template_id", 0))
	fieldValues := req.GetString("field_values", "")
	if templateID == 0 || fieldValues == "" {
		return resultError("模板ID(template_id)、填写数据(field_values)必填")
	}
	createReq := &oasvc.CreateFormDataRequest{
		TemplateID:  templateID,
		FieldValues: fieldValues,
	}
	data, err := svc.Create(ctx, createReq, userIDFromContext(ctx))
	if err != nil {
		return resultError(fmt.Sprintf("提交表单数据失败: %v", err))
	}
	return resultText(data)
}

func handleOaFormDataUpdate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewFormDataService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("表单数据ID(id)必填")
	}
	existing, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("表单数据不存在: %v", err))
	}
	fieldValues := req.GetString("field_values", existing.FieldValues)
	if fieldValues == "" {
		return resultError("填写数据(field_values)不能为空")
	}
	upd := &oasvc.UpdateFormDataRequest{
		FieldValues: fieldValues,
	}
	if err := svc.Update(ctx, id, upd); err != nil {
		return resultError(fmt.Sprintf("更新表单数据失败: %v", err))
	}
	return resultText(map[string]any{"message": "表单数据已更新", "id": id})
}

func handleOaFormDataDelete(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := oasvc.NewFormDataService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("表单数据ID(id)必填")
	}
	if err := svc.Delete(ctx, id); err != nil {
		return resultError(fmt.Sprintf("删除表单数据失败: %v", err))
	}
	return resultText(map[string]any{"message": "表单数据已删除", "id": id})
}

// ── 本文件辅助函数 ──

// oaOptUint 取可选 uint 指针(>0 才返回指针,用于创建场景)。
func oaOptUint(req mcp.CallToolRequest, key string) *uint {
	if v := uint(req.GetFloat(key, 0)); v > 0 {
		return &v
	}
	return nil
}

// oaDeptID 半增量取 dept_id:未提供则保留 existing;提供 0 视为清空;>0 设值。
func oaDeptID(req mcp.CallToolRequest, existing *uint) *uint {
	if args := req.GetArguments(); args != nil {
		if _, ok := args["dept_id"]; ok {
			v := uint(req.GetFloat("dept_id", 0))
			if v > 0 {
				return &v
			}
			return nil
		}
	}
	return existing
}

// oaExpenseItems 解析 items JSON 字符串为报销明细输入。
func oaExpenseItems(s string) ([]oasvc.ExpenseItemInput, error) {
	if s == "" {
		return nil, nil
	}
	var items []oasvc.ExpenseItemInput
	if err := json.Unmarshal([]byte(s), &items); err != nil {
		return nil, fmt.Errorf("明细 items 格式错误: %v", err)
	}
	return items, nil
}
