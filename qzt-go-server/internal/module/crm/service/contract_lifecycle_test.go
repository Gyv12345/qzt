package service

import (
	"testing"
	"time"

	"github.com/shopspring/decimal"

	crmmodel "qzt-go-server/internal/model/crm"
	crrepo "qzt-go-server/internal/repository/crm"
	"qzt-go-server/pkg/xtime"
)

// contract_lifecycle_test.go P30-#2 合同生命周期纯函数单测:
// 变更校验 / 变更快照与审计 diff / stats 聚合 / 到期日期匹配。

func mustDecimal(t *testing.T, s string) decimal.Decimal {
	t.Helper()
	d, err := decimal.NewFromString(s)
	if err != nil {
		t.Fatalf("构造 decimal 失败: %v", err)
	}
	return d
}

// TestValidateContractChange 变更校验:reason 空/无变化项/阶段不合法/金额非正 拒绝;合法通过。
func TestValidateContractChange(t *testing.T) {
	amount := mustDecimal(t, "100.00")
	endDate := xtime.NewNullDateTimeFromTime(time.Date(2026, 12, 31, 0, 0, 0, 0, time.Local))

	cases := []struct {
		name    string
		stage   string
		req     *ContractChangeRequest
		wantErr string
	}{
		{"nil请求拒绝", crmmodel.ContractStageSigned, nil, "变更请求不能为空"},
		{"reason为空拒绝", crmmodel.ContractStageSigned,
			&ContractChangeRequest{AfterAmount: &amount}, "变更原因必填"},
		{"reason纯空白拒绝", crmmodel.ContractStageSigned,
			&ContractChangeRequest{AfterAmount: &amount, Reason: "  "}, "变更原因必填"},
		{"无变化项拒绝", crmmodel.ContractStageSigned,
			&ContractChangeRequest{Reason: "调价"}, "至少变更一项(金额或结束日期)"},
		{"阶段草稿拒绝", crmmodel.ContractStageDraft,
			&ContractChangeRequest{AfterAmount: &amount, Reason: "调价"}, "仅已签订/执行中的合同允许变更"},
		{"阶段已完成拒绝", crmmodel.ContractStageCompleted,
			&ContractChangeRequest{AfterAmount: &amount, Reason: "调价"}, "仅已签订/执行中的合同允许变更"},
		{"金额非正拒绝", crmmodel.ContractStageSigned,
			&ContractChangeRequest{AfterAmount: &decimal.Zero, Reason: "调价"}, "变更后金额必须大于 0"},
		{"合法金额变更通过", crmmodel.ContractStageSigned,
			&ContractChangeRequest{AfterAmount: &amount, Reason: "调价"}, ""},
		{"合法结束日期变更通过", crmmodel.ContractStageExecuting,
			&ContractChangeRequest{AfterEndDate: &endDate, Reason: "延期"}, ""},
		{"双项变更通过", crmmodel.ContractStageExecuting,
			&ContractChangeRequest{AfterAmount: &amount, AfterEndDate: &endDate, Reason: "续签"}, ""},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			err := validateContractChange(tc.stage, tc.req)
			if tc.wantErr == "" {
				if err != nil {
					t.Fatalf("期望通过,实际报错: %v", err)
				}
				return
			}
			if err == nil || err.Error() != tc.wantErr {
				t.Fatalf("期望错误 %q,实际 %v", tc.wantErr, err)
			}
		})
	}
}

// TestBuildContractChangeRow 变更快照:before 取合同当前值,after 按请求取,未变项沿用。
func TestBuildContractChangeRow(t *testing.T) {
	oldDate := time.Date(2026, 6, 30, 0, 0, 0, 0, time.Local)
	newDate := time.Date(2027, 6, 30, 0, 0, 0, 0, time.Local)
	c := &crmmodel.CrmContract{
		ID: 7, TotalAmount: mustDecimal(t, "50000.00"),
		EndDate: xtime.NewNullDateTimeFromTime(oldDate),
	}
	newAmount := mustDecimal(t, "60000.00")
	newEndDate := xtime.NewNullDateTimeFromTime(newDate)

	t.Run("仅金额", func(t *testing.T) {
		row, gotAmount, gotEnd := buildContractChangeRow(c,
			&ContractChangeRequest{AfterAmount: &newAmount, Reason: "调价"}, 3)
		if row.BeforeAmount.Cmp(c.TotalAmount) != 0 || row.AfterAmount.Cmp(newAmount) != 0 {
			t.Fatalf("金额快照不符: before=%s after=%s", row.BeforeAmount, row.AfterAmount)
		}
		if row.ContractID != 7 || row.CreatedBy != 3 || row.Reason != "调价" {
			t.Fatalf("行元数据不符: %+v", row)
		}
		if gotAmount.Cmp(newAmount) != 0 {
			t.Fatalf("新金额应取请求值,实际 %s", gotAmount)
		}
		if !time.Time(gotEnd).Equal(time.Time(c.EndDate)) {
			t.Fatalf("未变更的结束日期应沿用原值")
		}
	})

	t.Run("仅结束日期", func(t *testing.T) {
		row, gotAmount, gotEnd := buildContractChangeRow(c,
			&ContractChangeRequest{AfterEndDate: &newEndDate, Reason: "延期"}, 3)
		if row.BeforeAmount.Cmp(c.TotalAmount) != 0 || row.AfterAmount.Cmp(c.TotalAmount) != 0 {
			t.Fatalf("金额未变更时快照应相等")
		}
		if !time.Time(row.BeforeEndDate).Equal(oldDate) || !time.Time(row.AfterEndDate).Equal(newDate) {
			t.Fatalf("结束日期快照不符: before=%v after=%v", row.BeforeEndDate, row.AfterEndDate)
		}
		if !time.Time(gotEnd).Equal(newDate) {
			t.Fatalf("新结束日期应取请求值")
		}
		if gotAmount.Cmp(c.TotalAmount) != 0 {
			t.Fatalf("未变更的金额应沿用原值")
		}
	})
}

// TestContractChangeFieldDiffs 审计 diff:仅实际变化的字段进变更日志。
func TestContractChangeFieldDiffs(t *testing.T) {
	oldAmount := mustDecimal(t, "100.00")
	oldDate := xtime.NewNullDateTimeFromTime(time.Date(2026, 6, 30, 0, 0, 0, 0, time.Local))

	t.Run("无变化为空", func(t *testing.T) {
		if got := contractChangeFieldDiffs(oldAmount, oldAmount, oldDate, oldDate); len(got) != 0 {
			t.Fatalf("无变化应得空 diff,实际 %d 条", len(got))
		}
	})
	t.Run("金额变化", func(t *testing.T) {
		got := contractChangeFieldDiffs(oldAmount, mustDecimal(t, "120.00"), oldDate, oldDate)
		if len(got) != 1 || got[0].Field != "TotalAmount" || got[0].FieldLabel != "合同金额" {
			t.Fatalf("金额 diff 不符: %+v", got)
		}
		if got[0].OldValue != "100.00" || got[0].NewValue != "120.00" {
			t.Fatalf("金额 diff 值不符: %+v", got[0])
		}
	})
	t.Run("结束日期变化", func(t *testing.T) {
		newDate := xtime.NewNullDateTimeFromTime(time.Date(2027, 6, 30, 0, 0, 0, 0, time.Local))
		got := contractChangeFieldDiffs(oldAmount, oldAmount, oldDate, newDate)
		if len(got) != 1 || got[0].Field != "EndDate" {
			t.Fatalf("结束日期 diff 不符: %+v", got)
		}
	})
	t.Run("双变化两条", func(t *testing.T) {
		newDate := xtime.NewNullDateTimeFromTime(time.Date(2027, 6, 30, 0, 0, 0, 0, time.Local))
		got := contractChangeFieldDiffs(oldAmount, mustDecimal(t, "120.00"), oldDate, newDate)
		if len(got) != 2 {
			t.Fatalf("双变化应得 2 条,实际 %d 条", len(got))
		}
	})
}

// TestNormalizeStageStats stats 聚合:固定阶段顺序 + 零补齐 + 未知阶段丢弃。
func TestNormalizeStageStats(t *testing.T) {
	rows := []crrepo.StageStatRow{
		{Stage: crmmodel.ContractStageExecuting, Count: 2, Amount: mustDecimal(t, "300.00")},
		{Stage: crmmodel.ContractStageDraft, Count: 1, Amount: mustDecimal(t, "100.00")},
		{Stage: "UNKNOWN_STAGE", Count: 9, Amount: mustDecimal(t, "999.00")}, // 应被丢弃
	}
	got := normalizeStageStats(rows)
	if len(got) != len(CanonicalContractStages) {
		t.Fatalf("应输出固定 %d 个阶段,实际 %d 个", len(CanonicalContractStages), len(got))
	}
	if got[0].Stage != crmmodel.ContractStageDraft || got[0].Count != 1 || got[0].Amount.Cmp(mustDecimal(t, "100.00")) != 0 {
		t.Fatalf("DRAFT 统计不符: %+v", got[0])
	}
	// APPROVAL 无数据 → 补零
	if got[1].Stage != crmmodel.ContractStageApproval || got[1].Count != 0 || !got[1].Amount.IsZero() {
		t.Fatalf("APPROVAL 应补零: %+v", got[1])
	}
	// EXECUTING 聚合保留
	if got[3].Stage != crmmodel.ContractStageExecuting || got[3].Count != 2 {
		t.Fatalf("EXECUTING 统计不符: %+v", got[3])
	}
	// 顺序固定且不出现未知阶段
	for i, s := range got {
		if s.Stage != CanonicalContractStages[i] {
			t.Fatalf("阶段顺序错乱: 位置 %d 期望 %s 实际 %s", i, CanonicalContractStages[i], s.Stage)
		}
	}
	if s := normalizeStageStats(nil); len(s) != len(CanonicalContractStages) {
		t.Fatalf("空输入也应输出固定阶段列表")
	}
}

// TestExpireTargetDate 到期匹配目标日:今天 + N 天,截断到日;负数回落今天。
func TestExpireTargetDate(t *testing.T) {
	today := time.Date(2026, 11, 14, 9, 30, 0, 0, time.Local)
	if got := expireTargetDate(today, 30); !got.Equal(time.Date(2026, 12, 14, 0, 0, 0, 0, time.Local)) {
		t.Fatalf("今天+30 应为 2026-12-14,实际 %v", got)
	}
	if got := expireTargetDate(today, 0); !got.Equal(time.Date(2026, 11, 14, 0, 0, 0, 0, time.Local)) {
		t.Fatalf("0 天应回落今天,实际 %v", got)
	}
	if got := expireTargetDate(today, -5); !got.Equal(time.Date(2026, 11, 14, 0, 0, 0, 0, time.Local)) {
		t.Fatalf("负数应回落今天,实际 %v", got)
	}
	// 跨年
	if got := expireTargetDate(today, 60); !got.Equal(time.Date(2027, 1, 13, 0, 0, 0, 0, time.Local)) {
		t.Fatalf("今天+60 跨年应为 2027-01-13,实际 %v", got)
	}
}

// TestDaysLeft 剩余天数按日历日截断。
func TestDaysLeft(t *testing.T) {
	today := time.Date(2026, 11, 14, 9, 0, 0, 0, time.Local)
	cases := []struct {
		name string
		end  time.Time
		want int
	}{
		{"当天到期", time.Date(2026, 11, 14, 23, 0, 0, 0, time.Local), 0},
		{"已过期", time.Date(2026, 11, 10, 0, 0, 0, 0, time.Local), 0},
		{"次日", time.Date(2026, 11, 15, 0, 0, 0, 0, time.Local), 1},
		{"30天", time.Date(2026, 12, 14, 0, 0, 0, 0, time.Local), 30},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := daysLeft(today, tc.end); got != tc.want {
				t.Fatalf("期望 %d,实际 %d", tc.want, got)
			}
		})
	}
}

// TestMonthRange 本月区间端点。
func TestMonthRange(t *testing.T) {
	now := time.Date(2026, 11, 14, 15, 0, 0, 0, time.Local)
	start, end := monthRange(now)
	if !start.Equal(time.Date(2026, 11, 1, 0, 0, 0, 0, time.Local)) {
		t.Fatalf("月初不符: %v", start)
	}
	if !end.Equal(time.Date(2026, 11, 30, 23, 59, 59, 0, time.Local)) {
		t.Fatalf("月末不符: %v", end)
	}
}
