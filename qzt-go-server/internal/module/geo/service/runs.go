package service

import (
	"context"
	"errors"
	"fmt"

	geo "qzt-go-server/internal/model/geo"
	georepo "qzt-go-server/internal/repository/geo"

	"gorm.io/gorm"
)

// runs.go 轮次与结果的查询（读路径）。

// ListRuns 轮次分页（新轮次在前）。
func (s *MonitorService) ListRuns(ctx context.Context, page, pageSize int) ([]geo.GeoRun, int64, error) {
	return georepo.NewRunRepo().PageList(ctx, page, pageSize)
}

// GetRun 轮次详情。
func (s *MonitorService) GetRun(ctx context.Context, id uint) (*geo.GeoRun, error) {
	run, err := georepo.NewRunRepo().GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("轮次不存在")
		}
		return nil, err
	}
	return run, nil
}

// ListResults 一轮的全部结果明细。
func (s *MonitorService) ListResults(ctx context.Context, runID uint) ([]geo.GeoResult, error) {
	return georepo.NewResultRepo().ListByRun(ctx, runID)
}

// Trend 最近 N 个已完成轮次的指标序列（周环比由前端按相邻轮次计算）。
func (s *MonitorService) Trend(ctx context.Context, limit int) ([]geo.GeoRun, error) {
	if limit <= 0 || limit > 52 {
		limit = 12
	}
	return georepo.NewRunRepo().Latest(ctx, limit)
}

// NameMaps 提示词/平台的 id→名称映射（结果明细与导出时拼接人读字段）。
func (s *MonitorService) NameMaps(ctx context.Context) (prompts, platforms map[uint]string, err error) {
	promptList, err := georepo.NewPromptRepo().List(ctx, nil)
	if err != nil {
		return nil, nil, err
	}
	platformList, err := georepo.NewPlatformRepo().List(ctx, nil)
	if err != nil {
		return nil, nil, err
	}
	prompts = make(map[uint]string, len(promptList))
	for _, p := range promptList {
		prompts[p.ID] = p.Question
	}
	platforms = make(map[uint]string, len(platformList))
	for _, p := range platformList {
		platforms[p.ID] = p.Name
	}
	return prompts, platforms, nil
}
