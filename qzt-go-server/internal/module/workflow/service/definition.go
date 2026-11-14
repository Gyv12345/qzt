// definition.go 工作流定义 CRUD 服务(P27)。
package service

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/robfig/cron/v3"

	wfmodel "qzt-go-server/internal/model/workflow"
	"qzt-go-server/internal/repository"
	wfrepo "qzt-go-server/internal/repository/workflow"
)

// DefinitionService 工作流定义服务。
type DefinitionService struct {
	defRepo *wfrepo.DefinitionRepo
	runRepo *wfrepo.RunRepo
}

func NewDefinitionService() *DefinitionService {
	return &DefinitionService{defRepo: wfrepo.NewDefinitionRepo(), runRepo: wfrepo.NewRunRepo()}
}

// DefinitionUpsertRequest 新增/编辑请求。
type DefinitionUpsertRequest struct {
	ID            uint   `json:"id"`
	Name          string `json:"name"`
	Description   string `json:"description"`
	TriggerType   string `json:"trigger_type"`
	TriggerConfig string `json:"trigger_config"`
	Graph         string `json:"graph"`
	Enabled       int8   `json:"enabled"`
}

// Create 新增工作流定义(校验触发配置与画布图)。
func (s *DefinitionService) Create(ctx context.Context, userID uint, req *DefinitionUpsertRequest) (*wfmodel.WorkflowDefinition, error) {
	if req.Name == "" {
		return nil, fmt.Errorf("名称不能为空")
	}
	if req.TriggerType == "" {
		req.TriggerType = wfmodel.TriggerManual
	}
	graph, err := ValidateGraph(req.Graph)
	if err != nil {
		return nil, err
	}
	if err := s.validateTrigger(req.TriggerType, req.TriggerConfig); err != nil {
		return nil, fmt.Errorf("触发配置无效: %w", err)
	}
	m := &wfmodel.WorkflowDefinition{
		Name:          truncRunes(req.Name, 100),
		Description:   truncRunes(req.Description, 500),
		TriggerType:   req.TriggerType,
		TriggerConfig: req.TriggerConfig,
		Graph:         mustJSON(graph),
		Enabled:       req.Enabled,
		OwnerID:       &userID,
	}
	if err := s.defRepo.Create(ctx, m); err != nil {
		return nil, err
	}
	if m.Enabled == 1 && m.TriggerType == wfmodel.TriggerCron {
		ReloadCron(m.ID)
	}
	return m, nil
}

// Update 编辑工作流定义(保存后重载调度)。
func (s *DefinitionService) Update(ctx context.Context, req *DefinitionUpsertRequest) error {
	def, err := s.defRepo.GetByID(ctx, req.ID)
	if err != nil {
		return err
	}
	graph, err := ValidateGraph(req.Graph)
	if err != nil {
		return err
	}
	if err := s.validateTrigger(req.TriggerType, req.TriggerConfig); err != nil {
		return fmt.Errorf("触发配置无效: %w", err)
	}
	def.Name = truncRunes(req.Name, 100)
	def.Description = truncRunes(req.Description, 500)
	def.TriggerType = req.TriggerType
	def.TriggerConfig = req.TriggerConfig
	def.Graph = mustJSON(graph)
	def.Enabled = req.Enabled
	if err := s.defRepo.Update(ctx, def); err != nil {
		return err
	}
	ReloadCron(def.ID)
	return nil
}

// Delete 软删除工作流(同时摘除定时调度)。
func (s *DefinitionService) Delete(ctx context.Context, id uint) error {
	def, err := s.defRepo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	if err := s.defRepo.Delete(ctx, id); err != nil {
		return err
	}
	if def.TriggerType == wfmodel.TriggerCron {
		ReloadCron(0)
	}
	return nil
}

// Enable 启停工作流(同步重载调度)。
func (s *DefinitionService) Enable(ctx context.Context, id uint, enabled int8) error {
	def, err := s.defRepo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	def.Enabled = enabled
	if err := s.defRepo.Update(ctx, def); err != nil {
		return err
	}
	if def.TriggerType == wfmodel.TriggerCron {
		ReloadCron(id)
	}
	return nil
}

// Get 详情。
func (s *DefinitionService) Get(ctx context.Context, id uint) (*wfmodel.WorkflowDefinition, error) {
	return s.defRepo.GetByID(ctx, id)
}

// List 分页列表(关键词/触发类型/启用过滤;enabled<0 表示不过滤)。
func (s *DefinitionService) List(ctx context.Context, page, pageSize int, keyword, triggerType string, enabled int8) ([]wfmodel.WorkflowDefinition, int64, error) {
	q := &repository.QueryOptions{
		Order: []string{"id DESC"},
	}
	if keyword != "" {
		q.Search = map[string]string{"name": keyword}
	}
	if triggerType != "" {
		q.Where = map[string]any{"trigger_type": triggerType}
	}
	if enabled >= 0 {
		if q.Where == nil {
			q.Where = map[string]any{}
		}
		q.Where["enabled"] = enabled
	}
	return s.defRepo.PageList(ctx, page, pageSize, q)
}

// validateTrigger 校验触发配置。
func (s *DefinitionService) validateTrigger(triggerType, cfgJSON string) error {
	switch triggerType {
	case wfmodel.TriggerManual:
		return nil
	case wfmodel.TriggerCron:
		var c struct {
			Cron string `json:"cron"`
		}
		if err := json.Unmarshal([]byte(cfgJSON), &c); err != nil || c.Cron == "" {
			return fmt.Errorf("定时触发需要 cron 表达式(6 段式,含秒)")
		}
		return validateCronSpec(c.Cron)
	case wfmodel.TriggerEvent:
		var c struct {
			Event string `json:"event"`
		}
		if err := json.Unmarshal([]byte(cfgJSON), &c); err != nil || c.Event == "" {
			return fmt.Errorf("事件触发需要 event 名")
		}
		return ValidateEventName(c.Event)
	default:
		return fmt.Errorf("未知触发类型: %s", triggerType)
	}
}

// validateCronSpec 校验 6 段式 cron(秒 分 时 日 月 周)。
func validateCronSpec(spec string) error {
	parser := cron.NewParser(cron.Second | cron.Minute | cron.Hour | cron.Dom | cron.Month | cron.Dow | cron.Descriptor)
	_, err := parser.Parse(spec)
	return err
}

// ── 执行记录服务 ──

// RunService 执行记录服务。
type RunService struct {
	defRepo *wfrepo.DefinitionRepo
	runRepo *wfrepo.RunRepo
}

func NewRunService() *RunService {
	return &RunService{defRepo: wfrepo.NewDefinitionRepo(), runRepo: wfrepo.NewRunRepo()}
}

// ListRuns 执行记录分页。
func (s *RunService) ListRuns(ctx context.Context, page, pageSize int, defID uint, status string) ([]wfmodel.WorkflowRun, int64, error) {
	q := &repository.QueryOptions{Order: []string{"id DESC"}}
	if defID > 0 {
		q.Where = map[string]any{"definition_id": defID}
	}
	if status != "" {
		if q.Where == nil {
			q.Where = map[string]any{}
		}
		q.Where["status"] = status
	}
	return s.runRepo.PageList(ctx, page, pageSize, q)
}

// GetRun 详情。
func (s *RunService) GetRun(ctx context.Context, id uint) (*wfmodel.WorkflowRun, error) {
	return s.runRepo.GetByID(ctx, id)
}

// DeleteRun 软删执行记录。
func (s *RunService) DeleteRun(ctx context.Context, id uint) error {
	return s.runRepo.Delete(ctx, id)
}

// RetryRun 重跑:以原 run 的 payload 新起一次执行(不改原记录,返回新 run)。
func (s *RunService) RetryRun(ctx context.Context, runID uint) (*wfmodel.WorkflowRun, error) {
	run, err := s.runRepo.GetByID(ctx, runID)
	if err != nil {
		return nil, err
	}
	var payload map[string]any
	_ = json.Unmarshal([]byte(run.TriggerPayload), &payload)
	if payload == nil {
		payload = map[string]any{}
	}
	return defaultEngine.RunDefinition(ctx, run.DefinitionID, run.TriggerSource, payload)
}
