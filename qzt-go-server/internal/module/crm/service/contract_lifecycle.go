package service

// contract_lifecycle.go P30-#2 合同生命周期:变更留痕 / 归档 / 统计 / 到期匹配纯函数。
// 变更走事务:快照 before → 写 crm_contract_change → 更新合同 → 字段变更审计。

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/shopspring/decimal"

	"qzt-go-server/internal/model"
	crmmodel "qzt-go-server/internal/model/crm"
	"qzt-go-server/internal/pkg/diff"
	"qzt-go-server/internal/repository"
	crrepo "qzt-go-server/internal/repository/crm"
	"qzt-go-server/pkg/xtime"
)

// 允许提交变更的阶段(仅已签订/执行中)。
var contractChangeableStages = []string{crmmodel.ContractStageSigned, crmmodel.ContractStageExecuting}

// stats 单轮上限/口径常量。
const (
	expiringListLimit = 50 // 临期列表上限
)

// ── 纯函数(便于单测,不触 DB) ──

// validateContractChange 变更请求校验:reason 必填、至少变更一项、阶段合法、金额合法。
func validateContractChange(stage string, req *ContractChangeRequest) error {
	if req == nil {
		return errors.New("变更请求不能为空")
	}
	if req.Reason == "" || strings.TrimSpace(req.Reason) == "" {
		return errors.New("变更原因必填")
	}
	if req.AfterAmount == nil && req.AfterEndDate == nil {
		return errors.New("至少变更一项(金额或结束日期)")
	}
	if req.AfterAmount != nil && req.AfterAmount.LessThanOrEqual(decimal.Zero) {
		return errors.New("变更后金额必须大于 0")
	}
	if !isContractChangeableStage(stage) {
		return errors.New("仅已签订/执行中的合同允许变更")
	}
	return nil
}

// isContractChangeableStage 阶段是否允许变更。
func isContractChangeableStage(stage string) bool {
	for _, s := range contractChangeableStages {
		if s == stage {
			return true
		}
	}
	return false
}

// buildContractChangeRow 由当前合同 + 请求构造变更快照行,
// 并返回应写入合同的新金额与新结束日期(未变更项沿用原值)。
func buildContractChangeRow(c *crmmodel.CrmContract, req *ContractChangeRequest, operatorID uint) (*crmmodel.CrmContractChange, decimal.Decimal, xtime.NullDateTime) {
	newAmount := c.TotalAmount
	if req.AfterAmount != nil {
		newAmount = *req.AfterAmount
	}
	newEndDate := c.EndDate
	if req.AfterEndDate != nil {
		newEndDate = *req.AfterEndDate
	}
	row := &crmmodel.CrmContractChange{
		ContractID:    c.ID,
		BeforeAmount:  c.TotalAmount,
		AfterAmount:   newAmount,
		BeforeEndDate: c.EndDate,
		AfterEndDate:  newEndDate,
		Reason:        req.Reason,
		CreatedBy:     operatorID,
	}
	return row, newAmount, newEndDate
}

// contractChangeFieldDiffs 把金额/结束日期变化映射为字段变更审计记录(纯函数)。
func contractChangeFieldDiffs(beforeAmount, afterAmount decimal.Decimal,
	beforeEndDate, afterEndDate xtime.NullDateTime) []diff.FieldChange {
	changes := make([]diff.FieldChange, 0, 2)
	if !beforeAmount.Equal(afterAmount) {
		changes = append(changes, diff.FieldChange{
			Field: "TotalAmount", FieldLabel: "合同金额",
			OldValue: beforeAmount.StringFixed(2), NewValue: afterAmount.StringFixed(2),
		})
	}
	if !time.Time(beforeEndDate).Equal(time.Time(afterEndDate)) {
		changes = append(changes, diff.FieldChange{
			Field: "EndDate", FieldLabel: "结束日期",
			OldValue: formatNullDate(beforeEndDate), NewValue: formatNullDate(afterEndDate),
		})
	}
	return changes
}

// formatNullDate NullDateTime → "2006-01-02",零值输出空串(审计展示用)。
func formatNullDate(d xtime.NullDateTime) string {
	if d.IsZero() {
		return ""
	}
	return time.Time(d).Format("2006-01-02")
}

// CanonicalContractStages stats by_stage 的固定顺序(含零条数阶段,前端图表稳定)。
var CanonicalContractStages = []string{
	crmmodel.ContractStageDraft, crmmodel.ContractStageApproval, crmmodel.ContractStageSigned,
	crmmodel.ContractStageExecuting, crmmodel.ContractStageCompleted, crmmodel.ContractStageTerminated,
}

// StageStat 阶段统计项。
type StageStat struct {
	Stage  string          `json:"stage"`
	Count  int64           `json:"count"`
	Amount decimal.Decimal `json:"amount"`
}

// normalizeStageStats 聚合纯函数:把 GROUP BY 得到的阶段行整理为固定顺序全量列表,
// 缺失阶段补零、多余未知阶段丢弃,保证 by_stage 输出稳定。
func normalizeStageStats(rows []crrepo.StageStatRow) []StageStat {
	byStage := make(map[string]crrepo.StageStatRow, len(rows))
	for _, r := range rows {
		byStage[r.Stage] = r
	}
	out := make([]StageStat, 0, len(CanonicalContractStages))
	for _, stage := range CanonicalContractStages {
		r, ok := byStage[stage]
		if !ok {
			out = append(out, StageStat{Stage: stage, Count: 0, Amount: decimal.Zero})
			continue
		}
		out = append(out, StageStat{Stage: stage, Count: r.Count, Amount: r.Amount})
	}
	return out
}

// truncateDate 截断到当日 0 点(纯函数)。
func truncateDate(t time.Time) time.Time {
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, t.Location())
}

// expireTargetDate 到期提醒目标日:今天 + remindDays(截断到日)。remindDays<=0 时返回今天。
func expireTargetDate(today time.Time, remindDays int) time.Time {
	if remindDays <= 0 {
		remindDays = 0
	}
	return truncateDate(today).AddDate(0, 0, remindDays)
}

// daysLeft 剩余天数 = endDate - today(按日历日截断,不足一天算 0)。
func daysLeft(today, endDate time.Time) int {
	diffDays := truncateDate(endDate).Sub(truncateDate(today))
	if diffDays <= 0 {
		return 0
	}
	return int(diffDays.Hours() / 24)
}

// monthRange 本月区间 [月初0点, 月末23:59:59](纯函数)。
func monthRange(now time.Time) (time.Time, time.Time) {
	start := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	next := start.AddDate(0, 1, 0)
	return start, next.Add(-time.Second)
}

// ── ContractService 扩展方法 ──

// ContractChangeRequest 提交合同变更请求(after_amount/after_end_date 至少一项)。
type ContractChangeRequest struct {
	AfterAmount  *decimal.Decimal    `json:"after_amount"`
	AfterEndDate *xtime.NullDateTime `json:"after_end_date"`
	// 变更原因(必填)
	Reason string `json:"reason" binding:"required"`
}

// Change 提交合同变更(金额/结束日期)。事务内:快照 before → 写变更记录 → 更新合同 → 审计。
// 仅合同负责人或超管;仅 SIGNED/EXECUTING 阶段。
func (s *ContractService) Change(ctx context.Context, id uint, req *ContractChangeRequest, operatorID uint, isSuperAdmin bool) error {
	c, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return repository.NotFoundOr(err, "合同不存在")
	}
	// 仅合同负责人或超管(比数据权限更严,契约口径)
	if c.OwnerID == nil || *c.OwnerID != operatorID {
		if !isSuperAdmin {
			return errors.New("仅合同负责人可提交变更")
		}
	}
	if err := validateContractChange(c.Stage, req); err != nil {
		return err
	}
	row, newAmount, newEndDate := buildContractChangeRow(c, req, operatorID)

	return repository.Transaction(ctx, func(ctx context.Context) error {
		if err := s.changeRepo.Create(ctx, row); err != nil {
			return err
		}
		c.TotalAmount = newAmount
		c.EndDate = newEndDate
		if err := s.repo.Update(ctx, c); err != nil {
			return err
		}
		// 字段变更审计(附属信息,失败不阻断)
		recordChanges(ctx, model.BizTypeContract, id, operatorID,
			contractChangeFieldDiffs(row.BeforeAmount, row.AfterAmount, row.BeforeEndDate, row.AfterEndDate))
		return nil
	})
}

// ListChanges 变更记录列表(倒序,带操作人姓名)。
func (s *ContractService) ListChanges(ctx context.Context, id uint) ([]crrepo.ContractChangeView, error) {
	if _, err := s.repo.GetByID(ctx, id); err != nil {
		return nil, repository.NotFoundOr(err, "合同不存在")
	}
	return s.changeRepo.ListByContract(ctx, id)
}

// Archive 归档(仅 COMPLETED/TERMINATED),置 archived_at/archived_by。
func (s *ContractService) Archive(ctx context.Context, id, operatorID uint) error {
	c, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return repository.NotFoundOr(err, "合同不存在")
	}
	if c.Stage != crmmodel.ContractStageCompleted && c.Stage != crmmodel.ContractStageTerminated {
		return errors.New("仅已完成/已终止的合同可归档")
	}
	return s.repo.Archive(ctx, id, operatorID, xtime.Now())
}

// Unarchive 取消归档(清空归档字段)。
func (s *ContractService) Unarchive(ctx context.Context, id uint) error {
	c, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return repository.NotFoundOr(err, "合同不存在")
	}
	_ = c // 存在性校验;清空归档字段不区分阶段(归档态才需要,幂等)
	return s.repo.Unarchive(ctx, id)
}

// ContractStats 合同统计响应。
type ContractStats struct {
	// 未归档 EXECUTING+SIGNED+COMPLETED 金额合计
	TotalAmount decimal.Decimal `json:"total_amount"`
	// 分阶段统计(固定顺序,含零条数阶段)
	ByStage []StageStat `json:"by_stage"`
	// 本月签订金额
	SignedMonthAmount decimal.Decimal      `json:"signed_month_amount"`
	Expiring          []crrepo.ExpiringRow `json:"expiring"`
}

// Stats 合同统计:总金额/分阶段/本月签订/临期列表(≤50,按 end_date 升序)。
// 临期窗口阈值读 sys_config contract.expire_remind_days(默认 30,热生效)。
func (s *ContractService) Stats(ctx context.Context) (*ContractStats, error) {
	now := time.Now()
	remindDays := cfgInt(ctx, ContractExpireRemindDaysKey, defaultExpireRemindDays)
	if remindDays < 0 {
		remindDays = 0
	}
	total, err := s.repo.StatsTotalAmount(ctx)
	if err != nil {
		return nil, err
	}
	stageRows, err := s.repo.StatsByStage(ctx)
	if err != nil {
		return nil, err
	}
	monthStart, monthEnd := monthRange(now)
	signedMonth, err := s.repo.SignedMonthAmount(ctx, monthStart, monthEnd)
	if err != nil {
		return nil, err
	}
	today := truncateDate(now)
	horizon := expireTargetDate(today, remindDays)
	expiring, err := s.repo.ListExpiring(ctx, today, horizon, expiringListLimit)
	if err != nil {
		return nil, err
	}
	// 填充剩余天数(展示口径,仓库层不掺展示计算)
	for i := range expiring {
		if !expiring[i].EndDate.IsZero() {
			expiring[i].DaysLeft = daysLeft(now, time.Time(expiring[i].EndDate))
		}
	}
	return &ContractStats{
		TotalAmount:       total,
		ByStage:           normalizeStageStats(stageRows),
		SignedMonthAmount: signedMonth,
		Expiring:          expiring,
	}, nil
}
