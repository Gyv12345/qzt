package mcp

import (
	"github.com/mark3labs/mcp-go/server"
)

// tools_hrm_write.go HRM 写操作 tools 入口(部门/岗位/员工/考勤/薪酬写 + 招聘/绩效读写)。
// 各资源域的 tool 定义与 handler 按域拆分在 tools_hrm_<domain>.go。
// 更新类工具采用「先 Get 再覆盖传入字段」的半增量模式,AI 只需传要改的字段。

func registerHrmWriteTools(s *server.MCPServer) {
	registerHrmDepartmentTools(s)  // 部门
	registerHrmPositionTools(s)    // 岗位
	registerHrmEmployeeTools(s)    // 员工
	registerHrmAttendanceTools(s)  // 考勤
	registerHrmPayrollTools(s)     // 薪酬
	registerHrmJobTools(s)         // 招聘:职位
	registerHrmCandidateTools(s)   // 招聘:候选人
	registerHrmPerformanceTools(s) // 绩效
}
