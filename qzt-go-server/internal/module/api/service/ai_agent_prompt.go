package service

import (
	"fmt"
	"strings"

	"github.com/shopspring/decimal"
)

// ai_agent_prompt.go 场景智能体的提示词构建(纯函数,数据 → 中文提示词,
// 确定性输出便于单测断言)。AI 场景智能体(P30-#3)三场景共用本文件的
// 数据结构与 builder:insight 经营洞察 / approval-summary 审批助手 / daily-report 日报生成。

// stageCount 阶段计数行(中文标签 + 数量 + 金额字符串)。
type stageCount struct {
	Stage  string // 中文阶段标签
	Count  int64
	Amount string // decimal 字符串(无金额语义的阶段为空串)
}

// ── 阶段顺序与中文标签(与 crm model 阶段常量/字典口径一致,纯展示映射) ──

// contractStageOrder 合同阶段固定顺序(输出确定性)。
var contractStageOrder = []string{"DRAFT", "APPROVAL", "SIGNED", "EXECUTING", "COMPLETED", "TERMINATED"}

// contractStageLabels 合同阶段中文标签。
var contractStageLabels = map[string]string{
	"DRAFT":      "草稿",
	"APPROVAL":   "审批中",
	"SIGNED":     "已签订",
	"EXECUTING":  "执行中",
	"COMPLETED":  "已完成",
	"TERMINATED": "已终止",
}

// opportunityStageOrder 商机阶段固定顺序(输出确定性)。
var opportunityStageOrder = []string{"PROSPECTING", "ANALYSIS", "PROPOSAL", "NEGOTIATION", "WON", "LOST"}

// opportunityStageLabels 商机阶段中文标签。
var opportunityStageLabels = map[string]string{
	"PROSPECTING": "初步接触",
	"ANALYSIS":    "需求分析",
	"PROPOSAL":    "方案报价",
	"NEGOTIATION": "谈判",
	"WON":         "已成交",
	"LOST":        "已丢失",
}

// mapStageRows 把 SQL GROUP BY 行按固定顺序映射为中文阶段计数(缺的阶段补零;
// 草稿/审批中阶段无金额语义,金额置空只出数量)。
func mapStageRows(rows []crmStageStatRow, order []string, labels map[string]string) []stageCount {
	byStage := make(map[string]crmStageStatRow, len(rows))
	for _, r := range rows {
		byStage[r.Stage] = r
	}
	out := make([]stageCount, 0, len(order))
	for _, st := range order {
		row := byStage[st]
		amount := ""
		if st != "DRAFT" && st != "APPROVAL" {
			amount = row.Amount.String()
		}
		out = append(out, stageCount{Stage: labels[st], Count: row.Count, Amount: amount})
	}
	return out
}

// crmStageStatRow SQL 分阶段聚合行的本地形态(与 crmrepo.StageStatRow 字段一致;
// 独立定义使 prompt 构建为纯函数,单测无需引入 repo/DB 依赖)。
type crmStageStatRow struct {
	Stage  string
	Count  int64
	Amount decimal.Decimal
}

// insightData 经营洞察场景的数据快照(采集于 collectInsight,全为真实业务数据)。
type insightData struct {
	CustomerTotal   int64        // 客户总数
	Opportunities   []stageCount // 商机各阶段数量(固定 6 阶段,含 0)
	ContractTotal   string       // 未归档执行口径(EXECUTING+SIGNED+COMPLETED)合同总金额
	ContractStages  []stageCount // 合同分阶段(条数+金额)
	SignedThisMonth string       // 本月新签订合同金额
	PaymentLast30d  string       // 近 30 天回款合计
	WindowStart     string       // 近 30 天窗口起 YYYY-MM-DD(写进提示词保证确定性)
	WindowEnd       string       // 数据截止日 YYYY-MM-DD
}

// approvalTodoLine 待办审批行。
type approvalTodoLine struct {
	Type   string // 中文单据类型(合同/报销单/…)
	Title  string // 业务资源标题(取不到为空)
	Submit string // 提审时间 YYYY-MM-DD HH:mm:ss
}

// approvalData 审批助手场景的数据快照(调用人当前待办,≤20 条)。
type approvalData struct {
	Todos []approvalTodoLine
	Total int64 // 待办实例总数(可能大于展示条数)
}

// dailyData 日报生成场景的数据快照(调用人今日业务动作,各类 ≤20 条)。
type dailyData struct {
	Date          string   // 日期 YYYY-MM-DD
	Followups     []string // 今日跟进记录内容行
	NewCustomers  []string // 今日新建客户名
	Contracts     []string // 今日新建合同名
	DoneApprovals []string // 今日已办审批行「类型:标题」
}

// isEmpty 全空判断(用于「暂无数据可分析」短路,不烧 token)。
func (d *insightData) isEmpty() bool {
	if d.CustomerTotal > 0 {
		return false
	}
	for _, s := range d.Opportunities {
		if s.Count > 0 {
			return false
		}
	}
	for _, s := range d.ContractStages {
		if s.Count > 0 {
			return false
		}
	}
	return isZeroAmount(d.ContractTotal) && isZeroAmount(d.SignedThisMonth) && isZeroAmount(d.PaymentLast30d)
}

// isEmpty 全空判断。
func (d *approvalData) isEmpty() bool { return len(d.Todos) == 0 && d.Total == 0 }

// isEmpty 全空判断。
func (d *dailyData) isEmpty() bool {
	return len(d.Followups) == 0 && len(d.NewCustomers) == 0 && len(d.Contracts) == 0 && len(d.DoneApprovals) == 0
}

// isZeroAmount 金额字符串是否为 0/空(0、0.00、"" 均视为零)。
func isZeroAmount(s string) bool {
	s = strings.TrimSpace(s)
	if s == "" {
		return true
	}
	// 去掉两端的 0 与小数点后为空,即纯零值("0"/"0.00"/"000" 等)。
	return strings.Trim(s, "0.") == ""
}

// renderStageLines 把阶段计数渲染为 "- 标签:N 个(金额 M)" 行列表;金额空则只出数量。
func renderStageLines(stages []stageCount) []string {
	lines := make([]string, 0, len(stages))
	for _, s := range stages {
		if s.Amount != "" {
			lines = append(lines, fmt.Sprintf("- %s:%d 个,金额 %s", s.Stage, s.Count, s.Amount))
			continue
		}
		lines = append(lines, fmt.Sprintf("- %s:%d 个", s.Stage, s.Count))
	}
	return lines
}

// buildInsightPrompt 经营洞察提示词:真实数据快照 + 固定四段输出要求
// (经营概况/亮点/风险/建议,markdown 二级标题)。
func buildInsightPrompt(d *insightData) string {
	var b strings.Builder
	b.WriteString("你是企业经营管理分析师。以下是行简一体化管理平台导出的真实经营数据快照,请只基于这些数据做分析,不要编造数据。\n\n")
	b.WriteString("【数据截止日】" + d.WindowEnd + "\n")
	b.WriteString("【客户】客户总数:" + fmt.Sprintf("%d", d.CustomerTotal) + "\n")
	b.WriteString("【商机】按阶段分布:\n")
	for _, line := range renderStageLines(d.Opportunities) {
		b.WriteString(line + "\n")
	}
	b.WriteString("【合同】未归档执行口径(执行中+已签订+已完成)总金额:" + d.ContractTotal + "\n")
	b.WriteString("合同分阶段:\n")
	for _, line := range renderStageLines(d.ContractStages) {
		b.WriteString(line + "\n")
	}
	b.WriteString("本月新签订合同金额:" + d.SignedThisMonth + "\n")
	b.WriteString("【回款】近 30 天(" + d.WindowStart + " 至 " + d.WindowEnd + ")回款合计:" + d.PaymentLast30d + "\n\n")
	b.WriteString("请用中文 markdown 输出,固定以下四个二级标题段落,不要输出其他内容:\n")
	b.WriteString("## 经营概况\n## 亮点\n## 风险\n## 建议\n")
	b.WriteString("要求:每段 2-4 条要点;所有结论必须能对应到上述数据;某项数据为 0 时如实说明而非臆测。")
	return b.String()
}

// buildApprovalSummaryPrompt 审批助手提示词:当前待办清单 + 固定三段输出要求
// (待办概览/建议优先级/风险提示)。超过 20 条时在提示词中说明仅展示最新一批。
func buildApprovalSummaryPrompt(d *approvalData) string {
	var b strings.Builder
	b.WriteString("你是企业审批助手。以下是审批人当前待审批任务清单(平台真实数据),请给出处理建议。\n\n")
	if d.Total > int64(len(d.Todos)) {
		b.WriteString(fmt.Sprintf("待办共 %d 项,以下仅展示最新 %d 项:\n", d.Total, len(d.Todos)))
	} else {
		b.WriteString(fmt.Sprintf("待办共 %d 项:\n", len(d.Todos)))
	}
	for i, t := range d.Todos {
		line := fmt.Sprintf("%d. [%s]", i+1, t.Type)
		if t.Title != "" {
			line += t.Title
		}
		if t.Submit != "" {
			line += "(提审 " + t.Submit + ")"
		}
		b.WriteString(line + "\n")
	}
	b.WriteString("\n请用中文 markdown 输出,固定以下三个二级标题段落,不要输出其他内容:\n")
	b.WriteString("## 待办概览\n## 建议优先级\n## 风险提示\n")
	b.WriteString("要求:优先级按提审时间早晚与单据业务紧急程度综合判断并说明理由;风险提示只基于清单信息(如积压时长),不要臆测单据内容。")
	return b.String()
}

// buildDailyReportPrompt 日报生成提示词:调用人今日业务动作 + 固定两段输出要求
// (今日完成/明日计划建议)。
func buildDailyReportPrompt(d *dailyData) string {
	var b strings.Builder
	b.WriteString("你是企业工作日报助手。以下是用户在行简一体化管理平台「" + d.Date + "」的真实业务动作记录,请据此生成工作日报。\n\n")
	b.WriteString("【今日跟进记录】\n")
	if len(d.Followups) == 0 {
		b.WriteString("(无)\n")
	} else {
		for _, line := range d.Followups {
			b.WriteString("- " + line + "\n")
		}
	}
	b.WriteString("【今日新建客户】\n")
	if len(d.NewCustomers) == 0 {
		b.WriteString("(无)\n")
	} else {
		for _, line := range d.NewCustomers {
			b.WriteString("- " + line + "\n")
		}
	}
	b.WriteString("【今日新建合同】\n")
	if len(d.Contracts) == 0 {
		b.WriteString("(无)\n")
	} else {
		for _, line := range d.Contracts {
			b.WriteString("- " + line + "\n")
		}
	}
	b.WriteString("【今日已办审批】\n")
	if len(d.DoneApprovals) == 0 {
		b.WriteString("(无)\n")
	} else {
		for _, line := range d.DoneApprovals {
			b.WriteString("- " + line + "\n")
		}
	}
	b.WriteString("\n请用中文 markdown 输出,固定以下两个二级标题段落,不要输出其他内容:\n")
	b.WriteString("## 今日完成\n## 明日计划建议\n")
	b.WriteString("要求:今日完成按上面记录归纳,不添加记录之外的内容;明日计划基于今日动作给出 2-4 条可执行建议。")
	return b.String()
}
