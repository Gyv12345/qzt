package mcp

import (
	"context"
	"strings"

	"github.com/mark3labs/mcp-go/mcp"
)

// toolsets.go MCP 工具集(toolset)目录与 API Key 级工具过滤。
//
// 背景:全量 333+ 个工具平铺在一个 MCP server 上,客户端会把全部工具 schema
// 塞进模型上下文,既浪费 token 又降低选工具准确率。sys_api_key.toolsets 可
// 绑定工具集(逗号分隔,空=不限制),MCP 层按工具名前缀过滤该 Key 的会话
// (tools/list 可见性与 tools/call 调用双重生效,见 server.go 的 WithToolFilter)。
//
// 目录在此单点维护:后台勾选 UI(system/api-keys/toolsets)、创建/更新的
// 入参校验、运行时过滤共用这一份定义。

// Toolset 一个可选启用的工具集。
type Toolset struct {
	// 存储标识(如 "crm")
	Key string `json:"key"`
	// 显示名(如 "CRM 客户关系")
	Name string `json:"name"`
	// 覆盖的工具名前缀(工具名第一段,如 crm_customer_list → "crm")
	Prefixes []string `json:"prefixes"`
	// 运行时统计的工具数
	ToolCount int `json:"tool_count"`
}

// toolsetCatalog 工具集目录(展示顺序即勾选 UI 顺序)。
var toolsetCatalog = []Toolset{
	{Key: "crm", Name: "CRM(客户/线索/商机/合同/回款/工单)", Prefixes: []string{"crm"}},
	{Key: "marketing", Name: "营销(渠道账号/线索同步)", Prefixes: []string{"marketing"}},
	{Key: "oa", Name: "OA 办公(站内信/公告/日程/报销/出差/借款/会议/表单)", Prefixes: []string{"oa"}},
	{Key: "hrm", Name: "人力资源(组织/员工/考勤/薪酬/招聘/绩效)", Prefixes: []string{"hrm"}},
	{Key: "psi", Name: "进销存(供应商/仓库/采购/销售/库存/资产)", Prefixes: []string{"psi"}},
	{Key: "finance", Name: "财务(科目/凭证/发票/往来款/报表)", Prefixes: []string{"finance"}},
	{Key: "approval", Name: "审批中心(流程/待办/实例)", Prefixes: []string{"approval"}},
	{Key: "project", Name: "项目管理(项目/任务)", Prefixes: []string{"project"}},
	{Key: "kb", Name: "知识库(分类/文档/版本)", Prefixes: []string{"kb"}},
	{Key: "cloud", Name: "企业网盘(文件/文件夹/用量)", Prefixes: []string{"cloud"}},
	{Key: "cms", Name: "内容管理(文章/分类/标签/单页)", Prefixes: []string{"cms"}},
	{Key: "dashboard", Name: "BI 看板(经营/销售/人力/财务报表)", Prefixes: []string{"dashboard"}},
	{Key: "system", Name: "系统管理(用户/角色/菜单/字典/站点与企微配置)", Prefixes: []string{"system", "site", "wecom"}},
	{Key: "enterprise", Name: "定时任务(任务/执行日志)", Prefixes: []string{"enterprise"}},
	{Key: "common", Name: "公共服务(附件/文件签名/统一日历)", Prefixes: []string{"attachment", "file", "calendar"}},
}

// mcpToolsetsKey request context key:当前 API Key 勾选的工具集(空=全部)。
const mcpToolsetsKey mcpCtxKey = "mcp_toolsets"

// ToolsetCatalog 返回工具集目录(含运行时统计的工具数),供后台勾选 UI 使用。
func ToolsetCatalog() []Toolset {
	counts := make(map[string]int)
	for name := range buildServer().ListTools() {
		counts[toolPrefix(name)]++
	}
	out := make([]Toolset, 0, len(toolsetCatalog))
	for _, ts := range toolsetCatalog {
		n := 0
		for _, p := range ts.Prefixes {
			n += counts[p]
		}
		ts.ToolCount = n
		out = append(out, ts)
	}
	return out
}

// ParseToolsets 把逗号分隔的存储值解析为 key 数组(去空白/去重/保序)。
func ParseToolsets(s string) []string {
	if strings.TrimSpace(s) == "" {
		return nil
	}
	seen := make(map[string]bool)
	out := make([]string, 0, 4)
	for _, p := range strings.Split(s, ",") {
		p = strings.TrimSpace(p)
		if p != "" && !seen[p] {
			seen[p] = true
			out = append(out, p)
		}
	}
	return out
}

// ValidToolset 校验 key 是否在目录中(创建/更新 API Key 时校验入参)。
func ValidToolset(key string) bool {
	for _, ts := range toolsetCatalog {
		if ts.Key == key {
			return true
		}
	}
	return false
}

// toolPrefix 取工具名第一段(crm_customer_list → "crm")。
func toolPrefix(name string) string {
	if i := strings.Index(name, "_"); i > 0 {
		return name[:i]
	}
	return name
}

// toolsetFilter API Key 级工具过滤:mcp-go WithToolFilter 注入,
// ctx 中无工具集(未勾选/存量 Key)→ 全放行;有 → 只放行命中的前缀。
func toolsetFilter(ctx context.Context, tools []mcp.Tool) []mcp.Tool {
	sets, _ := ctx.Value(mcpToolsetsKey).([]string)
	if len(sets) == 0 {
		return tools
	}
	allowed := make(map[string]bool, len(sets))
	for _, ts := range toolsetCatalog {
		for _, k := range sets {
			if k == ts.Key {
				for _, p := range ts.Prefixes {
					allowed[p] = true
				}
			}
		}
	}
	out := make([]mcp.Tool, 0, len(tools))
	for _, t := range tools {
		if allowed[toolPrefix(t.Name)] {
			out = append(out, t)
		}
	}
	return out
}
