package service

// script.go 回访话术 Agent:根据线索/客户信息生成回访话术。

import (
	"context"
	"fmt"
	"strings"

	aimodel "qzt-go-server/internal/model/ai"
	"qzt-go-server/internal/pkg/llmclient"
	crmsvc "qzt-go-server/internal/module/crm/service"
)

type ScriptService struct {
	agentSvc *AgentService
	leadSvc  *crmsvc.LeadService
	custSvc  *crmsvc.CustomerService
}

func NewScriptService() *ScriptService {
	return &ScriptService{
		agentSvc: NewAgentService(),
		leadSvc:  crmsvc.NewLeadService(),
		custSvc:  crmsvc.NewCustomerService(),
	}
}

type ScriptRequest struct {
	TargetType string `json:"target_type" binding:"required"` // lead / customer
	TargetID   uint   `json:"target_id" binding:"required"`
	AgentID    *uint  `json:"agent_id"` // 可选,指定 Agent
}

type ScriptResult struct {
	Content string `json:"content"`
	Agent   string `json:"agent"` // 使用的 Agent 名称
}

// Generate 取目标信息 → 组装 prompt → 调 LLM → 返回话术。
func (s *ScriptService) Generate(ctx context.Context, req *ScriptRequest) (*ScriptResult, error) {
	// 1. 取 Agent
	var agent *aimodel.AiAgent
	var err error
	if req.AgentID != nil {
		agentSvc := NewAgentService()
		agentRepo := &agentSvc.repo
		agent, err = agentRepo.GetByID(ctx, *req.AgentID)
		if err != nil {
			return nil, fmt.Errorf("指定的 Agent 不存在")
		}
	} else {
		agent, err = s.agentSvc.GetByScene(ctx, aimodel.SceneScript)
		if err != nil {
			return nil, fmt.Errorf("未找到启用的回访话术 Agent,请在 Agent 管理中配置")
		}
	}

	// 2. 取目标信息
	info, err := s.getTargetInfo(ctx, req.TargetType, req.TargetID)
	if err != nil {
		return nil, err
	}

	// 3. 组装用户消息(替换模板变量)
	userMsg := agent.UserPrompt
	if userMsg == "" {
		userMsg = defaultScriptUserPrompt
	}
	for k, v := range info {
		userMsg = strings.ReplaceAll(userMsg, "{{"+k+"}}", v)
	}

	// 4. 调 LLM
	messages := []llmclient.Message{
		{Role: "system", Content: agent.SystemPrompt},
		{Role: "user", Content: userMsg},
	}
	opts := llmclient.Options{}
	if agent.Model != nil {
		opts.Model = *agent.Model
	}
	if agent.Temperature != nil {
		opts.Temperature = *agent.Temperature
	}
	content, err := llmclient.ChatComplete(ctx, messages, opts)
	if err != nil {
		return nil, err
	}

	return &ScriptResult{Content: content, Agent: agent.Name}, nil
}

// getTargetInfo 取线索/客户信息,返回变量 map。
func (s *ScriptService) getTargetInfo(ctx context.Context, target_type string, id uint) (map[string]string, error) {
	info := map[string]string{
		"name": "", "contact_name": "", "phone": "", "company": "",
		"level": "", "source": "", "industry": "",
	}
	switch target_type {
	case "lead":
		lead, _, err := s.leadSvc.GetByID(ctx, id)
		if err != nil {
			return nil, fmt.Errorf("线索不存在")
		}
		info["name"] = lead.Name
		info["contact_name"] = lead.ContactName
		info["phone"] = lead.Phone
		info["company"] = lead.Company
		info["level"] = lead.Level
		info["source"] = lead.Source
		info["industry"] = lead.Industry
	case "customer":
		cust, _, err := s.custSvc.GetByID(ctx, id)
		if err != nil {
			return nil, fmt.Errorf("客户不存在")
		}
		info["name"] = cust.Name
		info["company"] = cust.Name
		info["level"] = cust.Level
		info["source"] = cust.Source
		info["industry"] = cust.Industry
	default:
		return nil, fmt.Errorf("target_type 必须是 lead 或 customer")
	}
	return info, nil
}

const defaultScriptUserPrompt = `客户/线索信息:
名称: {{name}}
联系人: {{contact_name}}
电话: {{phone}}
公司: {{company}}
级别: {{level}}
来源: {{source}}
行业: {{industry}}

请基于以上信息生成 3 条回访话术。`
