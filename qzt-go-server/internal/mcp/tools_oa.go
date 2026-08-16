package mcp

import (
	"github.com/mark3labs/mcp-go/server"
)

// tools_oa.go OA 办公自动化 tools 入口(站内信/公告/日程/工作日志/报销/出差/借款/会议室/会议预订/表单模板/表单数据)。
// 各资源域的 tool 定义与 handler 按域拆分在 tools_oa_<domain>.go。
// 更新类工具采用「先 Get 再覆盖传入字段」的半增量模式,AI 只需传要改的字段。

func registerOaTools(s *server.MCPServer) {
	registerOaMessageTools(s)        // 站内信
	registerOaNoticeTools(s)         // 公告
	registerOaScheduleTools(s)       // 日程
	registerOaWorkLogTools(s)        // 工作日志
	registerOaExpenseTools(s)        // 报销
	registerOaTripTools(s)           // 出差
	registerOaLoanTools(s)           // 借款
	registerOaMeetingRoomTools(s)    // 会议室
	registerOaMeetingBookingTools(s) // 会议预订
	registerOaFormTemplateTools(s)   // 表单模板
	registerOaFormDataTools(s)       // 表单数据
}
