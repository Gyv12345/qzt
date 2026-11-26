package service

import (
	"context"
	"encoding/json"
	"math"
	"sort"
	"time"

	crmmodel "qzt-go-server/internal/model/crm"
	"qzt-go-server/internal/pkg/datascope"
)

// OpportunityConversion 相邻阶段到达转化率。
type OpportunityConversion struct {
	FromStage      string  `json:"from_stage"`
	ToStage        string  `json:"to_stage"`
	EnteredCount   int     `json:"entered_count"`
	ConvertedCount int     `json:"converted_count"`
	Rate           float64 `json:"rate"`
}

// OpportunityStageDuration 已完成阶段停留的平均天数与样本数。
type OpportunityStageDuration struct {
	Stage      string  `json:"stage"`
	AvgDays    float64 `json:"avg_days"`
	SampleSize int     `json:"sample_size"`
}

// OpportunityLossReason 输单原因事件分布。
type OpportunityLossReason struct {
	Reason string `json:"reason"`
	Count  int    `json:"count"`
}

// OpportunityInsights 商机销售过程洞察。
type OpportunityInsights struct {
	WindowDays     int                        `json:"window_days"`
	Conversion     []OpportunityConversion    `json:"conversion"`
	StageDurations []OpportunityStageDuration `json:"stage_durations"`
	LossReasons    []OpportunityLossReason    `json:"loss_reasons"`
}

// OpportunityInsights 计算指定窗口内的真实阶段历史指标。
func (s *DashboardService) OpportunityInsights(ctx context.Context, days int) (*OpportunityInsights, error) {
	if days <= 0 {
		days = 90
	}
	if days > 365 {
		days = 365
	}
	now := time.Now()
	since := now.AddDate(0, 0, -days)
	stagesJSON, records, err := s.repo.OpportunityInsightSource(ctx, since, datascope.BuildCond(ctx, "o.owner_id"))
	if err != nil {
		return nil, err
	}
	var stages []struct {
		Key  string `json:"key"`
		Sort int    `json:"sort"`
	}
	if err := json.Unmarshal([]byte(stagesJSON), &stages); err != nil {
		return nil, err
	}
	ordered := make([]string, 0, len(stages))
	sort.SliceStable(stages, func(i, j int) bool { return stages[i].Sort < stages[j].Sort })
	for _, stage := range stages {
		if stage.Key != crmmodel.OppStageLost {
			ordered = append(ordered, stage.Key)
		}
	}
	return buildOpportunityInsights(records, ordered, days, since, now), nil
}

// buildOpportunityInsights 纯函数计算,旧历史无 created_at 时不会进入样本。
func buildOpportunityInsights(records []crmmodel.StageRecord, orderedStages []string, windowDays int, since, now time.Time) *OpportunityInsights {
	byOpportunity := make(map[uint][]crmmodel.StageRecord)
	for _, record := range records {
		if record.CreatedAt.IsZero() {
			continue
		}
		byOpportunity[record.ResourceID] = append(byOpportunity[record.ResourceID], record)
	}

	firstEntry := make(map[uint]map[string]time.Time)
	durationTotals := make(map[string]float64)
	durationCounts := make(map[string]int)
	lossCounts := make(map[string]int)
	for resourceID, history := range byOpportunity {
		sort.SliceStable(history, func(i, j int) bool {
			left, right := time.Time(history[i].CreatedAt), time.Time(history[j].CreatedAt)
			if left.Equal(right) {
				return history[i].ID < history[j].ID
			}
			return left.Before(right)
		})
		entries := make(map[string]time.Time)
		for i, record := range history {
			enteredAt := time.Time(record.CreatedAt)
			if _, exists := entries[record.ToStage]; !exists {
				entries[record.ToStage] = enteredAt
			}
			if !enteredAt.Before(since) && !enteredAt.After(now) {
				if record.ToStage == crmmodel.OppStageLost {
					reason := record.LostReason
					if reason == "" {
						reason = "UNSPECIFIED"
					}
					lossCounts[reason]++
				}
				if i+1 < len(history) && !history[i+1].CreatedAt.IsZero() {
					next := time.Time(history[i+1].CreatedAt)
					days := next.Sub(enteredAt).Hours() / 24
					if days >= 0 {
						durationTotals[record.ToStage] += days
						durationCounts[record.ToStage]++
					}
				}
			}
		}
		firstEntry[resourceID] = entries
	}

	conversion := make([]OpportunityConversion, 0, len(orderedStages))
	for i := 0; i+1 < len(orderedStages); i++ {
		from, to := orderedStages[i], orderedStages[i+1]
		item := OpportunityConversion{FromStage: from, ToStage: to}
		for _, entries := range firstEntry {
			enteredAt, ok := entries[from]
			if !ok || enteredAt.Before(since) || enteredAt.After(now) {
				continue
			}
			item.EnteredCount++
			if convertedAt, ok := entries[to]; ok && convertedAt.After(enteredAt) {
				item.ConvertedCount++
			}
		}
		if item.EnteredCount > 0 {
			item.Rate = math.Round(float64(item.ConvertedCount)/float64(item.EnteredCount)*1000) / 10
		}
		conversion = append(conversion, item)
	}

	durations := make([]OpportunityStageDuration, 0, len(durationCounts))
	for _, stage := range orderedStages {
		count := durationCounts[stage]
		if count == 0 {
			continue
		}
		avg := math.Round(durationTotals[stage]/float64(count)*10) / 10
		durations = append(durations, OpportunityStageDuration{Stage: stage, AvgDays: avg, SampleSize: count})
	}
	losses := make([]OpportunityLossReason, 0, len(lossCounts))
	for reason, count := range lossCounts {
		losses = append(losses, OpportunityLossReason{Reason: reason, Count: count})
	}
	sort.Slice(losses, func(i, j int) bool {
		if losses[i].Count == losses[j].Count {
			return losses[i].Reason < losses[j].Reason
		}
		return losses[i].Count > losses[j].Count
	})
	return &OpportunityInsights{WindowDays: windowDays, Conversion: conversion, StageDurations: durations, LossReasons: losses}
}
