package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	crmmodel "qzt-go-server/internal/model/crm"
	"qzt-go-server/internal/repository"
	crrepo "qzt-go-server/internal/repository/crm"
	"qzt-go-server/pkg/xtime"
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
// 新增 SOP 字段均为可选零值,旧配置无需迁移即可继续使用。
type StageDef struct {
	Key             string   `json:"key"`
	Label           string   `json:"label"`
	Color           string   `json:"color"`
	Sort            int      `json:"sort"`
	Probability     int      `json:"probability"`
	Guidance        string   `json:"guidance"`
	RequiredFields  []string `json:"required_fields"`
	RequireFollowup bool     `json:"require_followup"`
	StagnantDays    int      `json:"stagnant_days"`
}

// opportunityRequiredFieldLabels 是允许配置为阶段准入条件的基础字段。
// 自定义字段尚未接入商机 CRUD,不在本批开放。
var opportunityRequiredFieldLabels = map[string]string{
	"expected_amount":     "预期金额",
	"expected_close_date": "预计成交日",
	"owner_id":            "负责人",
	"description":         "需求与商机描述",
}

// GetByBizType 取某业务类型的阶段配置(解析 stages_json 为 StageDef 列表)。
func (s *StageService) GetByBizType(ctx context.Context, bizType string) (*crmmodel.StageConfig, []StageDef, error) {
	cfg, err := s.configRepo.GetByBizType(ctx, bizType)
	if err != nil {
		return nil, nil, repository.NotFoundOr(err, "阶段配置不存在")
	}
	defs, err := parseStages(cfg.StagesJSON)
	if err != nil {
		return nil, nil, fmt.Errorf("解析阶段配置失败: %w", err)
	}
	return cfg, defs, nil
}

// UpdateStages 更新某业务类型的阶段定义。
func (s *StageService) UpdateStages(ctx context.Context, bizType string, defs []StageDef) error {
	if err := validateStageDefs(bizType, defs); err != nil {
		return err
	}
	cfg, err := s.configRepo.GetByBizType(ctx, bizType)
	if err != nil {
		return repository.NotFoundOr(err, "阶段配置不存在")
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
	return s.ChangeStageAt(ctx, bizType, resourceID, fromStage, toStage, operatorID, reason, "", time.Now())
}

// ChangeStageAt 以指定时间记录阶段变化,并保存结构化输单原因快照。
func (s *StageService) ChangeStageAt(ctx context.Context, bizType string, resourceID uint, fromStage, toStage string, operatorID uint, reason, lostReason string, enteredAt time.Time) (int, error) {
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
		LostReason: lostReason,
		CreatedAt:  xtime.NewNullDateTimeFromTime(enteredAt),
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

// FindStageDef 返回指定 key 的阶段定义。
func FindStageDef(defs []StageDef, key string) (StageDef, bool) {
	for _, def := range defs {
		if def.Key == key {
			return def, true
		}
	}
	return StageDef{}, false
}

// validateStageDefs 校验阶段配置。规则只对商机追加,合同沿用原配置能力。
func validateStageDefs(bizType string, defs []StageDef) error {
	if len(defs) == 0 {
		return errors.New("至少保留一个阶段")
	}
	seen := make(map[string]struct{}, len(defs))
	for i, def := range defs {
		def.Key = strings.TrimSpace(def.Key)
		if def.Key == "" {
			return fmt.Errorf("第 %d 个阶段 key 不能为空", i+1)
		}
		if _, exists := seen[def.Key]; exists {
			return fmt.Errorf("阶段 key %q 重复", def.Key)
		}
		seen[def.Key] = struct{}{}
		if strings.TrimSpace(def.Label) == "" {
			return fmt.Errorf("阶段 %q 显示名不能为空", def.Key)
		}
		if def.Probability < 0 || def.Probability > 100 {
			return fmt.Errorf("阶段 %q 概率必须在 0-100 之间", def.Key)
		}
		if def.StagnantDays < 0 || def.StagnantDays > 3650 {
			return fmt.Errorf("阶段 %q 停滞预警天数必须在 0-3650 之间", def.Key)
		}
		if bizType == stageBizOpportunity {
			for _, field := range def.RequiredFields {
				if _, ok := opportunityRequiredFieldLabels[field]; !ok {
					return fmt.Errorf("阶段 %q 包含不支持的必填字段 %q", def.Key, field)
				}
			}
		}
	}
	if bizType == stageBizOpportunity {
		for _, key := range []string{crmmodel.OppStageWon, crmmodel.OppStageLost} {
			if _, ok := FindStageDef(defs, key); !ok {
				return fmt.Errorf("商机阶段必须保留 %s 终态", key)
			}
		}
	}
	return nil
}
