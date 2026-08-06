package service

// follow.go 跟进记录 Agent:粘贴对话 → LLM 提取 → 生成结构化跟进记录。

import (
	"context"
	"fmt"
	"strings"
	"time"

	aimodel "qzt-go-server/internal/model/ai"
	"qzt-go-server/internal/pkg/llmclient"
	crmsvc "qzt-go-server/internal/module/crm/service"
	"qzt-go-server/pkg/xtime"
)

type FollowService struct {
	agentSvc   *AgentService
	followSvc  *crmsvc.FollowService
}

func NewFollowService() *FollowService {
	return &FollowService{
		agentSvc:  NewAgentService(),
		followSvc: crmsvc.NewFollowService(),
	}
}

type FollowRequest struct {
	Conversation string `json:"conversation" binding:"required"` // 粘贴的对话记录
	TargetType   string `json:"target_type"`                     // customer / opportunity(可选,auto_save 时必填)
	TargetID     uint   `json:"target_id"`
	AutoSave     bool   `json:"auto_save"` // 是否自动写入 follow_up_record
	FollowType   string `json:"follow_type"` // auto_save 时的跟进类型(默认 OTHER)
}

type FollowResult struct {
	Content   string `json:"content"`    // AI 生成的完整分析(含沟通要点/意向/待办/记录)
	Record    string `json:"record"`     // 提取出的【跟进记录】段落(可直接用)
	Saved     bool   `json:"saved"`      // 是否已自动保存
	RecordID  *uint  `json:"record_id"`  // 保存后的记录ID
	Agent     string `json:"agent"`
}

func (s *FollowService) Generate(ctx context.Context, req *FollowRequest) (*FollowResult, error) {
	agent, err := s.agentSvc.GetByScene(ctx, aimodel.SceneFollow)
	if err != nil {
		return nil, fmt.Errorf("未找到启用的跟进记录 Agent")
	}

	userMsg := agent.UserPrompt
	if userMsg == "" {
		userMsg = "请分析以下对话记录并生成跟进记录:\n\n{{conversation}}"
	}
	userMsg = strings.ReplaceAll(userMsg, "{{conversation}}", req.Conversation)

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

	// 提取【跟进记录】段落
	record := extractSection(content, "跟进记录")

	result := &FollowResult{
		Content: content,
		Record:  record,
		Agent:   agent.Name,
	}

	// 自动保存跟进记录
	if req.AutoSave && req.TargetType != "" && req.TargetID > 0 && record != "" {
		followType := req.FollowType
		if followType == "" {
			followType = "OTHER"
		}
		saveReq := &crmsvc.CreateRecordRequest{
			Type:       followType,
			Content:    record,
			FollowTime: xtime.NewDateTime(time.Now()),
		}
		switch req.TargetType {
		case "customer":
			saveReq.CustomerID = &req.TargetID
		case "opportunity":
			saveReq.OpportunityID = &req.TargetID
		case "contact":
			saveReq.ContactID = &req.TargetID
		case "contract":
			saveReq.ContractID = &req.TargetID
		}
		rec, err := s.followSvc.CreateRecord(ctx, saveReq)
		if err == nil {
			result.Saved = true
			result.RecordID = &rec.ID
		}
	}

	return result, nil
}

// extractSection 从 LLM 输出里提取【xxx】标记的段落内容。
func extractSection(text, sectionName string) string {
	lines := strings.Split(text, "\n")
	var result []string
	capturing := false
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if strings.Contains(trimmed, "【"+sectionName+"】") {
			capturing = true
			// 去掉标题行本身,保留后面的内容(如果有)
			rest := strings.SplitN(trimmed, "】", 2)
			if len(rest) > 1 && strings.TrimSpace(rest[1]) != "" {
				result = append(result, strings.TrimSpace(rest[1]))
			}
			continue
		}
		if capturing {
			// 遇到下一个【xxx】标题就停
			if strings.HasPrefix(trimmed, "【") && strings.Contains(trimmed, "】") {
				break
			}
			result = append(result, line)
		}
	}
	out := strings.TrimSpace(strings.Join(result, "\n"))
	return out
}
