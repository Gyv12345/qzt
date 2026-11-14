package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	apprmodel "qzt-go-server/internal/model/approval"
	"qzt-go-server/internal/pkg/llm"
	"qzt-go-server/internal/repository"
	apprrepo "qzt-go-server/internal/repository/approval"
	crmrepo "qzt-go-server/internal/repository/crm"
	"qzt-go-server/pkg/xlogger"
)

// ai_agent.go 场景智能体(P30-#3):POST /api/ai/agents/:scenario/run。
// 三场景:insight 经营洞察 / approval-summary 审批助手 / daily-report 日报生成。
// 鉴权口径同 /api/ai/chat(仅 JWT 不进 RBAC 组);总开关复用 sys_config ai.chat_enabled
// 控成本;记账 feature=ai.agent(sys_llm_usage)。
// 数据全部来自真实业务表——repository 为全局共享层,api/service 直接引用 repo
// 是既有例外(同 calendar.go),查询条件只由服务端常量构造。
// 场景数据为空时不调 LLM,直接返回「暂无数据可分析」口径提示;LLM 未配置返回
// ErrAINotConfigured(与 chat 同款明确错误)。

const (
	// aiAgentFeature LLM 记账功能标识(sys_llm_usage.feature)。
	aiAgentFeature = "ai.agent"

	// agentListLimit 各数据源单次取数上限,防上下文膨胀烧 token。
	agentListLimit = 20
)

// 场景标识(路由 :scenario 参数)。
const (
	ScenarioInsight         = "insight"          // 经营洞察
	ScenarioApprovalSummary = "approval-summary" // 审批助手
	ScenarioDailyReport     = "daily-report"     // 日报生成
)

// agentSystemPrompt 系统提示词:数据分析师定位,只基于给定数据分析。
const agentSystemPrompt = "你是行简一体化管理平台的 AI 业务助手。只基于用户消息中给定的真实业务数据分析,不要编造数据,用中文输出。"

// 各场景数据为空时的对外提示(不调 LLM,不烧 token)。
var (
	msgNoInsightData  = "暂无数据可分析:当前系统尚无客户、商机、合同或回款数据,请先录入业务数据后再生成经营洞察。"
	msgNoApprovalTodo = "暂无待办审批任务,无需生成审批摘要。"
	msgNoDailyData    = "今日暂无业务动作(无跟进记录/新建客户/新建合同/已办审批),暂无法生成日报。"
)

// AgentRunResponse 场景智能体运行结果。
type AgentRunResponse struct {
	Output string `json:"output"`
}

// agentFormLabels 审批表单类型 → 中文标签(与 approval/service 的 formTypeLabel 同源;
// api/service 不便引用对方私有 map,此处为有限副本,新增表单类型两处同步)。
var agentFormLabels = map[string]string{
	"CONTRACT":        "合同",
	"QUOTATION":       "报价单",
	"ORDER":           "订单",
	"INVOICE":         "发票",
	"PURCHASE_ORDER":  "采购单",
	"SALES_ORDER":     "销售单",
	"PURCHASE_RETURN": "采购退货",
	"SALES_RETURN":    "销售退货",
	"EXPENSE":         "报销单",
	"LEAVE":           "请假单",
	"TRIP":            "出差申请",
	"LOAN":            "借款单",
	"MEETING_BOOKING": "会议预订",
	"OA_CUSTOM":       "自定义表单",
	"VEHICLE":         "用车申请",
	"SEAL":            "用印申请",
}

// agentTitleColumns 业务表 → 标题列(与 approval/service.todo 的 resourceTitleColumn 同源副本)。
var agentTitleColumns = map[string]string{
	"crm_contract":           "name",
	"crm_quotation":          "title",
	"crm_order":              "order_no",
	"fin_invoice":            "invoice_no",
	"psi_purchase_order":     "order_no",
	"psi_sales_order":        "order_no",
	"psi_purchase_return":    "return_no",
	"psi_sales_return":       "return_no",
	"oa_expense":             "title",
	"hrm_leave":              "CONCAT_WS(' ', NULLIF(reason, ''), NULLIF(leave_no, ''))",
	"oa_business_trip":       "title",
	"oa_loan":                "title",
	"oa_meeting_booking":     "title",
	"oa_form_data":           "CONCAT_WS(' ', NULLIF(template_name, ''), NULLIF(data_no, ''))",
	"oa_vehicle_application": "title",
	"oa_seal_application":    "title",
}

// agentTaskActionLabels 已办审批动作标签。
var agentTaskActionLabels = map[string]string{
	"APPROVE": "通过",
	"REJECT":  "驳回",
}

// RunAgent 运行场景智能体:采集真实数据 → 构建 prompt → 统一 LLM 网关 → 返回 markdown。
func RunAgent(ctx context.Context, userID uint, scenario string) (*AgentRunResponse, error) {
	if !AIChatEnabled(ctx) {
		return nil, ErrAIChatDisabled
	}

	var prompt string
	switch scenario {
	case ScenarioInsight:
		d := collectInsight(ctx)
		if d.isEmpty() {
			return &AgentRunResponse{Output: msgNoInsightData}, nil
		}
		prompt = buildInsightPrompt(d)
	case ScenarioApprovalSummary:
		d, err := collectApproval(ctx, userID)
		if err != nil {
			return nil, err
		}
		if d.isEmpty() {
			return &AgentRunResponse{Output: msgNoApprovalTodo}, nil
		}
		prompt = buildApprovalSummaryPrompt(d)
	case ScenarioDailyReport:
		d := collectDaily(ctx, userID)
		if d.isEmpty() {
			return &AgentRunResponse{Output: msgNoDailyData}, nil
		}
		prompt = buildDailyReportPrompt(d)
	default:
		return nil, fmt.Errorf("未知场景 %q,支持 insight/approval-summary/daily-report", scenario)
	}

	resp, err := llm.Chat(ctx, llm.ChatRequest{
		Messages: []llm.Message{
			{Role: "system", Content: agentSystemPrompt},
			{Role: "user", Content: prompt},
		},
		UserID:  userID,
		Feature: aiAgentFeature,
	})
	if err != nil {
		// 未初始化/未配置 API key 统一成对外友好文案;其余透传(限流、供应商错误摘要)。
		if errors.Is(err, llm.ErrNotInitialized) || errors.Is(err, llm.ErrNotConfigured) {
			return nil, ErrAINotConfigured
		}
		return nil, err
	}
	return &AgentRunResponse{Output: resp.Content}, nil
}

// ── 数据采集 ──

// truncateDay 截断到当日 0 点。
func truncateDay(t time.Time) time.Time {
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, t.Location())
}

// collectInsight 经营洞察数据快照。全公司口径(与 BI 看板一致);
// 单一来源查询失败记日志并按零值继续,不阻断整体。
func collectInsight(ctx context.Context) *insightData {
	now := time.Now()
	today := truncateDay(now)
	from := today.AddDate(0, 0, -30)
	monthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	monthEnd := monthStart.AddDate(0, 1, 0).Add(-time.Second)

	d := &insightData{
		WindowStart: from.Format("2006-01-02"),
		WindowEnd:   today.Format("2006-01-02"),
	}

	contractRepo := crmrepo.NewContractRepo()
	if v, err := contractRepo.StatsTotalAmount(ctx); err != nil {
		xlogger.ErrorfCtx(ctx, "ai agent insight: contract total failed: %v", err)
	} else {
		d.ContractTotal = v.String()
	}
	if rows, err := contractRepo.StatsByStage(ctx); err != nil {
		xlogger.ErrorfCtx(ctx, "ai agent insight: contract by stage failed: %v", err)
	} else {
		d.ContractStages = mapStageRows(toStageRows(rows), contractStageOrder, contractStageLabels)
	}
	if v, err := contractRepo.SignedMonthAmount(ctx, monthStart, monthEnd); err != nil {
		xlogger.ErrorfCtx(ctx, "ai agent insight: signed month failed: %v", err)
	} else {
		d.SignedThisMonth = v.String()
	}
	if total, err := crmrepo.NewCustomerRepo().Count(ctx, nil); err != nil {
		xlogger.ErrorfCtx(ctx, "ai agent insight: customer count failed: %v", err)
	} else {
		d.CustomerTotal = total
	}

	// 商机各阶段数量:固定 6 阶段逐阶段计数(阶段列有索引,开销可忽略)。
	oppRepo := crmrepo.NewOpportunityRepo()
	for _, st := range opportunityStageOrder {
		cnt, err := oppRepo.Count(ctx, &repository.QueryOptions{Where: map[string]any{"stage": st}})
		if err != nil {
			xlogger.ErrorfCtx(ctx, "ai agent insight: opportunity count stage=%s failed: %v", st, err)
			cnt = 0
		}
		d.Opportunities = append(d.Opportunities, stageCount{Stage: opportunityStageLabels[st], Count: cnt})
	}

	if v, err := crmrepo.NewPaymentRecordRepo().SumReceivedBetween(ctx, from, today); err != nil {
		xlogger.ErrorfCtx(ctx, "ai agent insight: payment 30d sum failed: %v", err)
	} else {
		d.PaymentLast30d = v.String()
	}
	return d
}

// collectApproval 审批助手数据快照:调用人当前待办实例(≤20 条,附类型/标题/提审时间)。
func collectApproval(ctx context.Context, userID uint) (*approvalData, error) {
	instances, total, err := apprrepo.NewInstanceRepo().PageByApprover(ctx, 1, agentListLimit, userID, apprmodel.TaskStatusApproving)
	if err != nil {
		return nil, err
	}
	titleMap := fetchAgentTitles(ctx, instances)
	d := &approvalData{Total: total, Todos: make([]approvalTodoLine, 0, len(instances))}
	for i := range instances {
		inst := &instances[i]
		d.Todos = append(d.Todos, approvalTodoLine{
			Type:   agentFormLabel(inst.Type),
			Title:  titleMap[fmt.Sprintf("%s:%d", inst.Type, inst.ResourceID)],
			Submit: inst.SubmitTime.Time().Format("2006-01-02 15:04:05"),
		})
	}
	return d, nil
}

// collectDaily 日报数据快照:调用人今日业务动作(跟进/新客户/新合同/已办审批,各 ≤20 条)。
// 单一来源查询失败记日志并跳过该来源,不阻断整体。
func collectDaily(ctx context.Context, userID uint) *dailyData {
	now := time.Now()
	today := truncateDay(now)
	tomorrow := today.AddDate(0, 0, 1)
	dayRange := []repository.Cond{{Query: "created_at >= ? AND created_at < ?", Args: []any{today, tomorrow}}}

	d := &dailyData{Date: today.Format("2006-01-02")}

	if rows, _, err := crmrepo.NewFollowUpRecordRepo().PageList(ctx, 1, agentListLimit, &repository.QueryOptions{
		Where: map[string]any{"owner_id": userID},
		Conds: dayRange,
		Order: []string{"id DESC"},
	}); err != nil {
		xlogger.ErrorfCtx(ctx, "ai agent daily: followups failed: %v", err)
	} else {
		for _, r := range rows {
			d.Followups = append(d.Followups, truncateRunes(r.Content, 60))
		}
	}

	if rows, _, err := crmrepo.NewCustomerRepo().PageList(ctx, 1, agentListLimit, &repository.QueryOptions{
		Where: map[string]any{"owner_id": userID},
		Conds: dayRange,
		Order: []string{"id DESC"},
	}); err != nil {
		xlogger.ErrorfCtx(ctx, "ai agent daily: new customers failed: %v", err)
	} else {
		for _, r := range rows {
			d.NewCustomers = append(d.NewCustomers, r.Name)
		}
	}

	if rows, _, err := crmrepo.NewContractRepo().PageList(ctx, 1, agentListLimit, &repository.QueryOptions{
		Where: map[string]any{"owner_id": userID},
		Conds: dayRange,
		Order: []string{"id DESC"},
	}); err != nil {
		xlogger.ErrorfCtx(ctx, "ai agent daily: new contracts failed: %v", err)
	} else {
		for _, r := range rows {
			d.Contracts = append(d.Contracts, r.Name)
		}
	}

	// 今日已办审批:本人审批动作已完成(APPROVED/UNAPPROVED)且 updated_at 落今日的任务。
	if tasks, _, err := apprrepo.NewTaskRepo().PageList(ctx, 1, agentListLimit, &repository.QueryOptions{
		Where: map[string]any{"approver_id": userID},
		Conds: []repository.Cond{
			{Query: "status IN ?", Args: []any{[]string{apprmodel.TaskStatusApproved, apprmodel.TaskStatusUnapproved}}},
			{Query: "updated_at >= ? AND updated_at < ?", Args: []any{today, tomorrow}},
		},
		Order: []string{"updated_at DESC"},
	}); err != nil {
		xlogger.ErrorfCtx(ctx, "ai agent daily: done approvals failed: %v", err)
	} else if len(tasks) > 0 {
		instIDs := make([]uint, 0, len(tasks))
		for _, t := range tasks {
			if t.InstanceID > 0 {
				instIDs = append(instIDs, t.InstanceID)
			}
		}
		instMap := map[uint]apprmodel.ApprovalInstance{}
		if instances, err := apprrepo.NewInstanceRepo().ListByIDs(ctx, instIDs); err == nil {
			for _, inst := range instances {
				instMap[inst.ID] = inst
			}
		}
		titleMap := fetchAgentTitles(ctx, instancesToSlice(instMap))
		for _, t := range tasks {
			inst, ok := instMap[t.InstanceID]
			if !ok {
				continue
			}
			line := agentFormLabel(inst.Type) + ":" + titleMap[fmt.Sprintf("%s:%d", inst.Type, inst.ResourceID)]
			if action, ok := agentTaskActionLabels[t.Action]; ok {
				line += "(" + action + ")"
			}
			d.DoneApprovals = append(d.DoneApprovals, line)
		}
	}
	return d
}

// fetchAgentTitles 批量查业务资源标题,返回 "formType:resourceID" → 标题。
// 表名/列名均来自服务端常量映射(FormTable/agentTitleColumns),不收客户端输入。
func fetchAgentTitles(ctx context.Context, instances []apprmodel.ApprovalInstance) map[string]string {
	byType := make(map[string][]uint)
	for _, inst := range instances {
		if inst.ResourceID > 0 {
			byType[inst.Type] = append(byType[inst.Type], inst.ResourceID)
		}
	}
	out := make(map[string]string)
	for formType, ids := range byType {
		table := apprmodel.FormTable[formType]
		col := agentTitleColumns[table]
		if table == "" || col == "" {
			continue
		}
		titles, err := apprrepo.ScanResourceTitles(ctx, table, col, ids)
		if err != nil {
			xlogger.ErrorfCtx(ctx, "ai agent: fetch titles type=%s failed: %v", formType, err)
			continue
		}
		for id, title := range titles {
			out[fmt.Sprintf("%s:%d", formType, id)] = title
		}
	}
	return out
}

// agentFormLabel 表单类型中文标签(未知类型原样回传)。
func agentFormLabel(t string) string {
	if label, ok := agentFormLabels[t]; ok {
		return label
	}
	return t
}

// toStageRows crmrepo 聚合行 → prompt 层本地形态(解耦 repo 类型,便于纯函数单测)。
func toStageRows(rows []crmrepo.StageStatRow) []crmStageStatRow {
	out := make([]crmStageStatRow, 0, len(rows))
	for _, r := range rows {
		out = append(out, crmStageStatRow{Stage: r.Stage, Count: r.Count, Amount: r.Amount})
	}
	return out
}

// instancesToSlice 实例 map → 切片(标题批量查询入参)。
func instancesToSlice(m map[uint]apprmodel.ApprovalInstance) []apprmodel.ApprovalInstance {
	out := make([]apprmodel.ApprovalInstance, 0, len(m))
	for _, inst := range m {
		out = append(out, inst)
	}
	return out
}
