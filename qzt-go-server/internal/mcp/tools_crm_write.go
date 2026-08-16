package mcp

import (
	"github.com/mark3labs/mcp-go/server"
)

// tools_crm_write.go CRM 写操作 tools 入口(客户流转/线索公海/商机/合同/回款/跟进/查重)。
// 各资源域的 tool 定义与 handler 按域拆分在 tools_crm_<domain>_write.go。
// 更新类工具采用「先 Get 再覆盖传入字段」的半增量模式,AI 只需传要改的字段。

func registerCrmWriteTools(s *server.MCPServer) {
	registerCrmCustomerFlowTools(s)     // 客户流转
	registerCrmOpportunityWriteTools(s) // 商机
	registerCrmContractWriteTools(s)    // 合同
	registerCrmPaymentWriteTools(s)     // 回款
	registerCrmFollowupWriteTools(s)    // 跟进
	registerCrmDedupTools(s)            // 查重
	registerCrmLeadPoolTools(s)         // 线索公海
}
