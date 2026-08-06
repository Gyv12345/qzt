package service

// agent.go AI Agent CRUD service。

import (
	"context"
	"errors"
	"strings"

	aimodel "qzt-go-server/internal/model/ai"
	"qzt-go-server/internal/repository"
)

type AgentService struct {
	repo repository.BaseRepo[aimodel.AiAgent]
}

func NewAgentService() *AgentService {
	return &AgentService{}
}

// List 查询 Agent 列表(可按 scene 过滤)。
func (s *AgentService) List(ctx context.Context, scene string) ([]aimodel.AiAgent, error) {
	opts := &repository.QueryOptions{
		Order: []string{"sort ASC", "id ASC"},
	}
	if scene != "" {
		opts.Where = map[string]interface{}{"scene": scene}
	}
	return s.repo.List(ctx, opts)
}

// GetByScene 取指定场景下第一个启用的 Agent。
func (s *AgentService) GetByScene(ctx context.Context, scene string) (*aimodel.AiAgent, error) {
	return s.repo.GetOne(ctx, &repository.QueryOptions{
		Where: map[string]interface{}{"scene": scene, "status": 1},
		Order: []string{"sort ASC"},
	})
}

type CreateAgentRequest struct {
	Name         string   `json:"name" binding:"required"`
	Code         string   `json:"code" binding:"required"`
	Scene        string   `json:"scene" binding:"required"`
	SystemPrompt string   `json:"system_prompt" binding:"required"`
	UserPrompt   string   `json:"user_prompt"`
	Model        *string  `json:"model"`
	Temperature  *float64 `json:"temperature"`
	Status       int8     `json:"status"`
	Sort         int      `json:"sort"`
}

func (s *AgentService) Create(ctx context.Context, req *CreateAgentRequest) (*aimodel.AiAgent, error) {
	code := strings.TrimSpace(req.Code)
	exists, err := s.repo.Exists(ctx, &repository.QueryOptions{
		Conds: []repository.Cond{{Query: "code = ?", Args: []interface{}{code}}},
	})
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, errors.New("Agent 编码已存在")
	}
	status := req.Status
	if status == 0 {
		status = 1 // 默认启用
	}
	agent := &aimodel.AiAgent{
		Name:         req.Name,
		Code:         code,
		Scene:        req.Scene,
		SystemPrompt: req.SystemPrompt,
		UserPrompt:   req.UserPrompt,
		Model:        req.Model,
		Temperature:  req.Temperature,
		Status:       status,
		Sort:         req.Sort,
	}
	if err := s.repo.Create(ctx, agent); err != nil {
		return nil, err
	}
	return agent, nil
}

type UpdateAgentRequest struct {
	Name         string   `json:"name" binding:"required"`
	Scene        string   `json:"scene" binding:"required"`
	SystemPrompt string   `json:"system_prompt" binding:"required"`
	UserPrompt   string   `json:"user_prompt"`
	Model        *string  `json:"model"`
	Temperature  *float64 `json:"temperature"`
	Status       int8     `json:"status"`
	Sort         int      `json:"sort"`
}

func (s *AgentService) Update(ctx context.Context, id uint, req *UpdateAgentRequest) error {
	agent, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return errors.New("Agent 不存在")
	}
	agent.Name = req.Name
	agent.Scene = req.Scene
	agent.SystemPrompt = req.SystemPrompt
	agent.UserPrompt = req.UserPrompt
	agent.Model = req.Model
	agent.Temperature = req.Temperature
	agent.Status = req.Status
	agent.Sort = req.Sort
	return s.repo.Update(ctx, agent)
}

func (s *AgentService) Delete(ctx context.Context, id uint) error {
	return s.repo.Delete(ctx, id)
}
