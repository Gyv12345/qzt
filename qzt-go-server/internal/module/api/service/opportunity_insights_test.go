package service

import (
	"testing"
	"time"

	crmmodel "qzt-go-server/internal/model/crm"
	"qzt-go-server/pkg/xtime"
)

func insightRecord(id, resourceID uint, stage string, at time.Time, lostReason string) crmmodel.StageRecord {
	return crmmodel.StageRecord{
		ID: id, ResourceID: resourceID, BizType: crmmodel.StageBizOpportunity,
		ToStage: stage, LostReason: lostReason, CreatedAt: xtime.NewNullDateTimeFromTime(at),
	}
}

func TestBuildOpportunityInsights(t *testing.T) {
	now := time.Date(2026, 11, 24, 12, 0, 0, 0, time.Local)
	since := now.AddDate(0, 0, -90)
	day := func(offset int) time.Time { return now.AddDate(0, 0, offset) }
	records := []crmmodel.StageRecord{
		insightRecord(1, 1, "PROSPECTING", day(-10), ""),
		insightRecord(2, 1, "ANALYSIS", day(-8), ""),
		insightRecord(3, 1, "PROPOSAL", day(-3), ""),
		insightRecord(4, 1, "LOST", day(-2), "PRICE"),
		insightRecord(5, 2, "PROSPECTING", day(-10), ""),
		insightRecord(6, 2, "ANALYSIS", day(-7), ""),
		insightRecord(7, 3, "ANALYSIS", day(-9), ""),
		insightRecord(8, 3, "PROPOSAL", day(-8), ""),
		{ID: 9, ResourceID: 4, ToStage: "PROSPECTING"},
	}
	ordered := []string{"PROSPECTING", "ANALYSIS", "PROPOSAL", "NEGOTIATION", "WON"}
	got := buildOpportunityInsights(records, ordered, 90, since, now)
	if got.WindowDays != 90 || len(got.Conversion) != 4 {
		t.Fatalf("窗口或转化行数错误: %+v", got)
	}
	if got.Conversion[0].EnteredCount != 2 || got.Conversion[0].ConvertedCount != 2 || got.Conversion[0].Rate != 100 {
		t.Fatalf("初步接触到需求分析转化错误: %+v", got.Conversion[0])
	}
	if got.Conversion[1].EnteredCount != 3 || got.Conversion[1].ConvertedCount != 2 || got.Conversion[1].Rate != 66.7 {
		t.Fatalf("需求分析到方案报价转化错误: %+v", got.Conversion[1])
	}
	if len(got.StageDurations) != 3 {
		t.Fatalf("只有有完整区间的阶段应进入时长样本: %+v", got.StageDurations)
	}
	if got.StageDurations[0].Stage != "PROSPECTING" || got.StageDurations[0].AvgDays != 2.5 || got.StageDurations[0].SampleSize != 2 {
		t.Fatalf("初步接触平均停留错误: %+v", got.StageDurations[0])
	}
	if got.StageDurations[1].Stage != "ANALYSIS" || got.StageDurations[1].AvgDays != 3 || got.StageDurations[1].SampleSize != 2 {
		t.Fatalf("需求分析平均停留错误: %+v", got.StageDurations[1])
	}
	if got.StageDurations[2].Stage != "PROPOSAL" || got.StageDurations[2].AvgDays != 1 || got.StageDurations[2].SampleSize != 1 {
		t.Fatalf("方案报价平均停留错误: %+v", got.StageDurations[2])
	}
	if len(got.LossReasons) != 1 || got.LossReasons[0].Reason != "PRICE" || got.LossReasons[0].Count != 1 {
		t.Fatalf("输单原因分布错误: %+v", got.LossReasons)
	}
}

func TestBuildOpportunityInsightsEmpty(t *testing.T) {
	now := time.Now()
	got := buildOpportunityInsights(nil, []string{"PROSPECTING", "WON"}, 90, now.AddDate(0, 0, -90), now)
	if got.Conversion == nil || got.StageDurations == nil || got.LossReasons == nil {
		t.Fatalf("空结果应输出数组而非null: %+v", got)
	}
	if len(got.Conversion) != 1 || got.Conversion[0].EnteredCount != 0 {
		t.Fatalf("空结果仍应保留配置阶段对: %+v", got.Conversion)
	}
}
