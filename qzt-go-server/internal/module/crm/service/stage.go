package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	crmmodel "qzt-go-server/internal/model/crm"
	crrepo "qzt-go-server/internal/repository/crm"
)

// stage.go 阶段配置 + 阶段变更服务(商机/合同通用)。

// StageService 阶段配置服务。
type StageService struct {
	configRepo *crrepo.StageConfigRepo
	recordRepo *crrepo.StageRecordRepo
}

func NewStageService() *StageService {
	return &StageService{configRepo: crrepo.NewStageConfigRepo(), recordRepo: crrepo.NewStageRecordRepo()}
}

// StageDef 单个阶段定义(stage_config.stages_json 数组的一项)。
type StageDef struct {
	Key        string `json:"key"`
	Label      string `json:"label"`
	Color      string `json:"color"`
	Sort       int    `json:"sort"`
	Probability int   `json:"probability"`
}

// GetByBizType 取某业务类型的阶段配置(解析 stages_json 为 StageDef 列表)。
func (s *StageService) GetByBizType(ctx context.Context, bizType string) (*crmmodel.StageConfig, []StageDef, error) {
	cfg, err := s.configRepo.GetByBizType(ctx, bizType)
	if err != nil {
		return nil, nil, notFoundOr(err, "阶段配置不存在")
	}
	defs, err := parseStages(cfg.StagesJSON)
	if err != nil {
		return nil, nil, fmt.Errorf("解析阶段配置失败: %w", err)
	}
	return cfg, defs, nil
}

// UpdateStages 更新某业务类型的阶段定义。
func (s *StageService) UpdateStages(ctx context.Context, bizType string, defs []StageDef) error {
	cfg, err := s.configRepo.GetByBizType(ctx, bizType)
	if err != nil {
		return notFoundOr(err, "阶段配置不存在")
	}
	data, err := json.Marshal(defs)
	if err != nil {
		return fmt.Errorf("序列化阶段失败: %w", err)
	}
	cfg.StagesJSON = string(data)
	return s.configRepo.Update(ctx, cfg)
}

// ValidateStage 校验 stageKey 是否存在于配置中,返回对应的概率(用于同步)。
func (s *StageService) ValidateStage(ctx context.Context, bizType, stageKey string) (int, error) {
	_, defs, err := s.GetByBizType(ctx, bizType)
	if err != nil {
		return 0, err
	}
	for _, d := range defs {
		if d.Key == stageKey {
			return d.Probability, nil
		}
	}
	return 0, fmt.Errorf("阶段 %q 不存在于配置中", stageKey)
}

// ChangeStage 变更资源阶段:写一条 stage_record(追加),返回新阶段对应的概率。
// 调用方负责在事务内更新实体 stage 字段。
func (s *StageService) ChangeStage(ctx context.Context, bizType string, resourceID uint, fromStage, toStage string, operatorID uint, reason string) (int, error) {
	prob, err := s.ValidateStage(ctx, bizType, toStage)
	if err != nil {
		return 0, err
	}
	rec := &crmmodel.StageRecord{
		BizType:    bizType,
		ResourceID: resourceID,
		FromStage:  fromStage,
		ToStage:    toStage,
		OperatorID: operatorID,
		Reason:     reason,
	}
	if err := s.recordRepo.Create(ctx, rec); err != nil {
		return 0, err
	}
	return prob, nil
}

// ListStageHistory 列出资源的阶段变更历史。
func (s *StageService) ListStageHistory(ctx context.Context, bizType string, resourceID uint) ([]crmmodel.StageRecord, error) {
	return s.recordRepo.ListByResource(ctx, bizType, resourceID)
}

// parseStages 解析 stages_json。
func parseStages(jsonStr string) ([]StageDef, error) {
	if jsonStr == "" {
		return nil, errors.New("stages_json 为空")
	}
	var defs []StageDef
	if err := json.Unmarshal([]byte(jsonStr), &defs); err != nil {
		return nil, err
	}
	return defs, nil
}
