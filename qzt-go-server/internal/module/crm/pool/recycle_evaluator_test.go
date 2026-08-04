package pool

import (
	"testing"
	"time"
)

// fakeRecyclable 测试用的 Recyclable 实现。
type fakeRecyclable struct {
	lastFollow *time.Time
	storage    *time.Time
}

func (f fakeRecyclable) GetLastFollowTime() *time.Time { return f.lastFollow }
func (f fakeRecyclable) GetStorageTime() *time.Time    { return f.storage }

func ptr(t time.Time) *time.Time { return &t }

func TestShouldRecycle_EmptyConditions(t *testing.T) {
	now := time.Date(2026, 8, 3, 12, 0, 0, 0, time.Local)
	target := fakeRecyclable{lastFollow: ptr(now.AddDate(0, 0, -60))}
	if ShouldRecycle("AND", "", target, now) {
		t.Error("空 conditions 应不回收")
	}
	if ShouldRecycle("AND", "[]", target, now) {
		t.Error("空数组应不回收")
	}
}

func TestShouldRecycle_InvalidJSON(t *testing.T) {
	now := time.Date(2026, 8, 3, 12, 0, 0, 0, time.Local)
	target := fakeRecyclable{lastFollow: ptr(now.AddDate(0, 0, -60))}
	if ShouldRecycle("AND", "not-json", target, now) {
		t.Error("非法 JSON 应不回收")
	}
}

func TestShouldRecycle_DynamicAnd(t *testing.T) {
	now := time.Date(2026, 8, 3, 12, 0, 0, 0, time.Local)
	// 30 天未跟进即回收
	conds := `[{"timeField":"LAST_FOLLOW_TIME","operator":"DYNAMIC","value":"30"}]`

	// 60 天前跟进 → 应回收
	old := fakeRecyclable{lastFollow: ptr(now.AddDate(0, 0, -60))}
	if !ShouldRecycle("AND", conds, old, now) {
		t.Error("60天未跟进应回收")
	}

	// 5 天前跟进 → 不应回收
	recent := fakeRecyclable{lastFollow: ptr(now.AddDate(0, 0, -5))}
	if ShouldRecycle("AND", conds, recent, now) {
		t.Error("5天前跟进不应回收")
	}
}

func TestShouldRecycle_NullFollowTime(t *testing.T) {
	now := time.Date(2026, 8, 3, 12, 0, 0, 0, time.Local)
	conds := `[{"timeField":"LAST_FOLLOW_TIME","operator":"DYNAMIC","value":"30"}]`

	// 从未跟进,nullSatisfied=false(默认) → 不回收
	never := fakeRecyclable{lastFollow: nil}
	if ShouldRecycle("AND", conds, never, now) {
		t.Error("从未跟进且 nullSatisfied=false 应不回收")
	}

	// nullSatisfied=true → 回收
	condsNull := `[{"timeField":"LAST_FOLLOW_TIME","operator":"DYNAMIC","value":"30","nullSatisfied":true}]`
	if !ShouldRecycle("AND", condsNull, never, now) {
		t.Error("从未跟进且 nullSatisfied=true 应回收")
	}
}

func TestShouldRecycle_FixedRange(t *testing.T) {
	now := time.Date(2026, 8, 3, 12, 0, 0, 0, time.Local)
	// 跟进时间在 2026-01-01 ~ 2026-06-30 区间内即回收
	conds := `[{"timeField":"STORAGE_TIME","operator":"FIXED","value":"2026-01-01,2026-06-30"}]`

	// 领取于 2026-03-15 → 在区间内 → 回收
	inRange := fakeRecyclable{storage: ptr(time.Date(2026, 3, 15, 10, 0, 0, 0, time.Local))}
	if !ShouldRecycle("AND", conds, inRange, now) {
		t.Error("区间内应回收")
	}

	// 领取于 2026-07-15 → 区间外 → 不回收
	outRange := fakeRecyclable{storage: ptr(time.Date(2026, 7, 15, 10, 0, 0, 0, time.Local))}
	if ShouldRecycle("AND", conds, outRange, now) {
		t.Error("区间外不应回收")
	}
}

func TestShouldRecycle_OrCombine(t *testing.T) {
	now := time.Date(2026, 8, 3, 12, 0, 0, 0, time.Local)
	// OR:30天未跟进 或 领取于特定区间
	conds := `[
		{"timeField":"LAST_FOLLOW_TIME","operator":"DYNAMIC","value":"30"},
		{"timeField":"STORAGE_TIME","operator":"FIXED","value":"2026-01-01,2026-06-30"}
	]`
	// 跟进很近(5天前),但领取在区间内 → OR 任一满足 → 回收
	target := fakeRecyclable{
		lastFollow: ptr(now.AddDate(0, 0, -5)),
		storage:    ptr(time.Date(2026, 3, 15, 10, 0, 0, 0, time.Local)),
	}
	if !ShouldRecycle("OR", conds, target, now) {
		t.Error("OR 任一满足应回收")
	}
}

func TestShouldRecycle_AndAllMatch(t *testing.T) {
	now := time.Date(2026, 8, 3, 12, 0, 0, 0, time.Local)
	// AND:60天未跟进 且 领取于区间内
	conds := `[
		{"timeField":"LAST_FOLLOW_TIME","operator":"DYNAMIC","value":"60"},
		{"timeField":"STORAGE_TIME","operator":"FIXED","value":"2026-01-01,2026-06-30"}
	]`
	// 两个都满足 → 回收
	allMatch := fakeRecyclable{
		lastFollow: ptr(now.AddDate(0, 0, -90)),
		storage:    ptr(time.Date(2026, 3, 15, 10, 0, 0, 0, time.Local)),
	}
	if !ShouldRecycle("AND", conds, allMatch, now) {
		t.Error("AND 全部满足应回收")
	}

	// 只满足一个 → 不回收
	oneMatch := fakeRecyclable{
		lastFollow: ptr(now.AddDate(0, 0, -90)),
		storage:    ptr(time.Date(2026, 7, 15, 10, 0, 0, 0, time.Local)),
	}
	if ShouldRecycle("AND", conds, oneMatch, now) {
		t.Error("AND 只满足一个不应回收")
	}
}
