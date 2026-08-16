package service

// job_handlers.go CRM 定时任务处理器:公海自动回收 + 跟进逾期提醒。
// 在包加载时通过 init() 注册到 enterprise 调度框架(JobHandlerRegistry),
// 由 sys_job 表中 status=1 且 bean_class 匹配的记录按 cron 表达式触发。

import (
	"context"
	"fmt"
	"strings"
	"time"

	crmmodel "qzt-go-server/internal/model/crm"
	entsvc "qzt-go-server/internal/module/enterprise/service"
	oasvc "qzt-go-server/internal/module/oa/service"
	crrepo "qzt-go-server/internal/repository/crm"
	"qzt-go-server/pkg/xlogger"
)

// 注册的 bean_class 必须与 sys_job.bean_class 完全一致。
func init() {
	entsvc.RegisterJobHandler("crm.pool.auto_recycle", &autoRecycleJob{})
	entsvc.RegisterJobHandler("crm.followup.reminder", &followupReminderJob{})
}

// ── 公海自动回收 ──

type autoRecycleJob struct{}

// Execute 扫描所有 auto_recycle=1 的客户/线索公海池,执行 ManualRecycle。
// 总开关 crm.pool.auto_recycle_enabled=0 时整体跳过。
func (h *autoRecycleJob) Execute(ctx context.Context) error {
	if !cfgBool(ctx, "crm.pool.auto_recycle_enabled", true) {
		xlogger.InfofCtx(ctx, "公海自动回收:总开关关闭,跳过")
		return nil
	}

	// 客户公海池:auto_recycle=1
	custPoolIDs, err := crrepo.NewCustomerPoolRepo().ListAutoRecycleIDs(ctx)
	if err != nil {
		return fmt.Errorf("查询客户公海池失败: %w", err)
	}
	custTotal := 0
	poolSvc := NewPoolService()
	for _, pid := range custPoolIDs {
		n, err := poolSvc.ManualRecycle(ctx, pid, 0)
		if err != nil {
			xlogger.ErrorfCtx(ctx, "客户公海池 %d 自动回收失败: %v", pid, err)
			continue
		}
		custTotal += n
	}

	// 线索公海池:auto_recycle=1
	leadPoolIDs, err := crrepo.NewLeadPoolRepo().ListAutoRecycleIDs(ctx)
	if err != nil {
		return fmt.Errorf("查询线索公海池失败: %w", err)
	}
	leadTotal := 0
	leadPoolSvc := NewLeadPoolService()
	for _, pid := range leadPoolIDs {
		n, err := leadPoolSvc.ManualRecycle(ctx, pid, 0)
		if err != nil {
			xlogger.ErrorfCtx(ctx, "线索公海池 %d 自动回收失败: %v", pid, err)
			continue
		}
		leadTotal += n
	}

	xlogger.InfofCtx(ctx, "公海自动回收完成:客户回收 %d 条,线索回收 %d 条", custTotal, leadTotal)
	return nil
}

// ── 跟进逾期提醒 ──

type followupReminderJob struct{}

// Execute 扫描 owner 非空且超过阈值未跟进的客户/线索/商机,按负责人聚合后发站内信。
// 总开关 crm.followup.remind_enabled=0 时整体跳过。
func (h *followupReminderJob) Execute(ctx context.Context) error {
	if !cfgBool(ctx, "crm.followup.remind_enabled", true) {
		xlogger.InfofCtx(ctx, "跟进提醒:总开关关闭,跳过")
		return nil
	}
	msgSvc := oasvc.NewMessageService()

	// 按负责人聚合待提醒项:ownerID -> []描述
	bucket := map[uint][]string{}

	// scanStale 扫描某类实体中超阈值未跟进的记录,按负责人聚合到 bucket。
	// 未跟进天数 = now - 基准时间;基准时间取 follow_time,
	// 从未跟进(follow_time IS NULL)时回退到领取/创建时间——
	// 否则 NULL 会被当成"负无穷",昨天才领的新记录也会误报"已 N 天未跟进"。
	scanStale := func(model any, entity, baselineExpr string, days int, extra string, extraArgs []any) {
		cutoff := time.Now().AddDate(0, 0, -days)
		rows, err := crrepo.ScanStaleFollowup(ctx, model, baselineExpr, cutoff, extra, extraArgs)
		if err != nil {
			xlogger.ErrorfCtx(ctx, "查询逾期未跟进%s失败: %v", entity, err)
			return
		}
		for _, r := range rows {
			if r.OwnerID == nil {
				continue
			}
			if r.Followed == nil {
				bucket[*r.OwnerID] = append(bucket[*r.OwnerID],
					fmt.Sprintf("%s「%s」从未跟进(已 %d 天)", entity, r.Name, daysSince(r.Baseline)))
			} else {
				bucket[*r.OwnerID] = append(bucket[*r.OwnerID],
					fmt.Sprintf("%s「%s」已 %d 天未跟进", entity, r.Name, daysSince(r.Baseline)))
			}
		}
	}

	// 客户:私海 + 超阈值未跟进
	if days := cfgInt(ctx, "crm.followup.warn_days_customer", 15); days > 0 {
		scanStale(&crmmodel.CrmCustomer{}, "客户",
			"COALESCE(follow_time, collection_time, created_at)", days,
			"in_pool = ?", []any{crmmodel.InPoolPrivate})
	}

	// 线索:私海 + 超阈值未跟进
	if days := cfgInt(ctx, "crm.followup.warn_days_lead", 7); days > 0 {
		scanStale(&crmmodel.CrmLead{}, "线索",
			"COALESCE(follow_time, collection_time, created_at)", days,
			"in_pool = ?", []any{crmmodel.InPoolPrivate})
	}

	// 商机:owner 非空 + 超阈值未跟进(商机无公海概念)
	if days := cfgInt(ctx, "crm.followup.warn_days_opportunity", 15); days > 0 {
		scanStale(&crmmodel.CrmOpportunity{}, "商机",
			"COALESCE(follow_time, created_at)", days, "", nil)
	}

	// 发送:每负责人一条站内信
	sent := 0
	for ownerID, items := range bucket {
		content := "您有以下待跟进事项:\n" + strings.Join(items, "\n")
		if err := msgSvc.SendSystemMessage(ctx, ownerID, "跟进提醒", content); err != nil {
			xlogger.ErrorfCtx(ctx, "发送跟进提醒给用户 %d 失败: %v", ownerID, err)
			continue
		}
		sent++
	}

	xlogger.InfofCtx(ctx, "跟进提醒完成:扫描 %d 位负责人,发送 %d 条提醒", len(bucket), sent)
	return nil
}

// daysSince 返回从 t 到现在经过的整天数(向下取整);t 为 nil 时返回 0。
func daysSince(t *time.Time) int {
	if t == nil {
		return 0
	}
	return int(time.Since(*t).Hours() / 24)
}
