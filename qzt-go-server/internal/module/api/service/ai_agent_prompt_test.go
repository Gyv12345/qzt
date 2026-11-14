package service

import (
	"strings"
	"testing"

	"github.com/shopspring/decimal"
)

// ai_agent_prompt_test.go 场景智能体提示词构建纯函数的确定性断言:
// 固定输入 → 固定 prompt(含数据行/输出段标题/口径说明),不触网、不依赖 DB。

func TestBuildInsightPrompt(t *testing.T) {
	d := &insightData{
		CustomerTotal: 5,
		Opportunities: []stageCount{
			{Stage: "初步接触", Count: 2},
			{Stage: "需求分析", Count: 1},
			{Stage: "方案报价", Count: 0},
			{Stage: "谈判", Count: 1},
			{Stage: "已成交", Count: 1},
			{Stage: "已丢失", Count: 0},
		},
		ContractTotal:   "120000.50",
		ContractStages:  mapStageRows([]crmStageStatRow{{Stage: "EXECUTING", Count: 2, Amount: decimal.RequireFromString("80000")}}, contractStageOrder, contractStageLabels),
		SignedThisMonth: "30000.00",
		PaymentLast30d:  "15000.25",
		WindowStart:     "2026-10-15",
		WindowEnd:       "2026-11-14",
	}
	p := buildInsightPrompt(d)

	for _, want := range []string{
		"【数据截止日】2026-11-14",
		"客户总数:5",
		"- 初步接触:2 个",
		"- 方案报价:0 个",
		"- 执行中:2 个,金额 80000",
		"未归档执行口径(执行中+已签订+已完成)总金额:120000.50",
		"本月新签订合同金额:30000.00",
		"近 30 天(2026-10-15 至 2026-11-14)回款合计:15000.25",
		"## 经营概况\n## 亮点\n## 风险\n## 建议\n",
		"某项数据为 0 时如实说明",
	} {
		if !strings.Contains(p, want) {
			t.Fatalf("insight prompt 缺少片段 %q\nprompt:\n%s", want, p)
		}
	}
	// 确定性:同输入两次构建逐字节一致。
	if p != buildInsightPrompt(d) {
		t.Fatal("insight prompt 构建不确定(同输入两次结果不一致)")
	}
}

func TestBuildApprovalSummaryPrompt(t *testing.T) {
	d := &approvalData{
		Total: 3,
		Todos: []approvalTodoLine{
			{Type: "合同", Title: "ACME 年度服务合同", Submit: "2026-11-13 09:30:00"},
			{Type: "报销单", Title: "", Submit: "2026-11-14 10:00:00"},
		},
	}
	p := buildApprovalSummaryPrompt(d)

	for _, want := range []string{
		"待办共 3 项",
		"以下仅展示最新 2 项",
		"1. [合同]ACME 年度服务合同(提审 2026-11-13 09:30:00)",
		"2. [报销单](提审 2026-11-14 10:00:00)",
		"## 待办概览\n## 建议优先级\n## 风险提示\n",
	} {
		if !strings.Contains(p, want) {
			t.Fatalf("approval prompt 缺少片段 %q\nprompt:\n%s", want, p)
		}
	}

	// 全量展示口径:total == len 时不得出现「仅展示」。
	d2 := &approvalData{Total: 1, Todos: d.Todos[:1]}
	if strings.Contains(buildApprovalSummaryPrompt(d2), "仅展示") {
		t.Fatal("total==len 时不应出现「仅展示」字样")
	}
}

func TestBuildDailyReportPrompt(t *testing.T) {
	d := &dailyData{
		Date:          "2026-11-14",
		Followups:     []string{"电话回访 ACME,确认续约意向"},
		NewCustomers:  []string{"星辰科技"},
		Contracts:     nil,
		DoneApprovals: []string{"合同:ACME 年度服务合同(通过)"},
	}
	p := buildDailyReportPrompt(d)

	for _, want := range []string{
		"「2026-11-14」的真实业务动作记录",
		"【今日跟进记录】\n- 电话回访 ACME,确认续约意向",
		"【今日新建客户】\n- 星辰科技",
		"【今日新建合同】\n(无)",
		"【今日已办审批】\n- 合同:ACME 年度服务合同(通过)",
		"## 今日完成\n## 明日计划建议\n",
	} {
		if !strings.Contains(p, want) {
			t.Fatalf("daily prompt 缺少片段 %q\nprompt:\n%s", want, p)
		}
	}
}

func TestAgentDataEmpty(t *testing.T) {
	// insight:全零/零金额视为空。
	empty := &insightData{
		ContractTotal:   "0",
		SignedThisMonth: "0.00",
		PaymentLast30d:  "0",
		Opportunities:   []stageCount{{Stage: "初步接触", Count: 0}},
		ContractStages:  []stageCount{{Stage: "草稿", Count: 0}},
	}
	if !empty.isEmpty() {
		t.Fatal("全零 insightData 应判空")
	}
	if (&insightData{CustomerTotal: 1}).isEmpty() {
		t.Fatal("有客户时不应判空")
	}
	if (&insightData{PaymentLast30d: "12.5"}).isEmpty() {
		t.Fatal("有回款金额时不应判空")
	}
	// approval/daily 空判断。
	if !(&approvalData{}).isEmpty() {
		t.Fatal("无待办应判空")
	}
	if (&approvalData{Total: 1}).isEmpty() {
		t.Fatal("有待办数不应判空")
	}
	if !(&dailyData{}).isEmpty() {
		t.Fatal("无今日动作应判空")
	}
	if (&dailyData{Followups: []string{"x"}}).isEmpty() {
		t.Fatal("有跟进记录不应判空")
	}
}
