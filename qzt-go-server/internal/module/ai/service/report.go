package service

// report.go 日报周报 Agent:查时间范围内的线索/跟进数据 → LLM 汇总。

import (
	"context"
	"fmt"
	"strings"
	"time"

	aimodel "qzt-go-server/internal/model/ai"
	"qzt-go-server/internal/pkg/llmclient"
	"qzt-go-server/internal/repository"
)

type ReportService struct {
	agentSvc *AgentService
}

func NewReportService() *ReportService {
	return &ReportService{agentSvc: NewAgentService()}
}

type ReportRequest struct {
	Period    string `json:"period" binding:"required"` // day / week / month
	StartDate string `json:"start_date"`                // 可选 yyyy-MM-dd
	EndDate   string `json:"end_date"`                  // 可选 yyyy-MM-dd
}

type ReportResult struct {
	Content string `json:"content"`
	Period  string `json:"period"`
	Agent   string `json:"agent"`
}

func (s *ReportService) Generate(ctx context.Context, req *ReportRequest, ownerID uint) (*ReportResult, error) {
	agent, err := s.agentSvc.GetByScene(ctx, aimodel.SceneReport)
	if err != nil {
		return nil, fmt.Errorf("未找到启用的日报周报 Agent")
	}

	// 确定时间范围
	now := time.Now()
	var start, end time.Time
	if req.StartDate != "" && req.EndDate != "" {
		start, _ = time.ParseInLocation("2006-01-02", req.StartDate, time.Local)
		end, _ = time.ParseInLocation("2006-01-02", req.EndDate, time.Local)
		end = end.Add(24*time.Hour - time.Second)
	} else {
		switch req.Period {
		case "week":
			start = now.AddDate(0, 0, -int(now.Weekday()))
			end = now
		case "month":
			start = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.Local)
			end = now
		default: // day
			start = time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.Local)
			end = now
		}
	}

	// 查数据:该用户的线索 + 跟进记录
	data := s.collectData(ctx, ownerID, start, end)

	periodLabel := map[string]string{"day": "今日", "week": "本周", "month": "本月"}[req.Period]
	if periodLabel == "" {
		periodLabel = fmt.Sprintf("%s ~ %s", start.Format("01-02"), end.Format("01-02"))
	}

	userMsg := agent.UserPrompt
	if userMsg == "" {
		userMsg = "报告周期: {{period}}\n\n工作数据:\n{{data}}\n\n请生成工作总结报告。"
	}
	userMsg = strings.ReplaceAll(userMsg, "{{period}}", periodLabel)
	userMsg = strings.ReplaceAll(userMsg, "{{data}}", data)

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

	return &ReportResult{Content: content, Period: periodLabel, Agent: agent.Name}, nil
}

// collectData 查询指定用户在时间范围内的线索和跟进数据,拼成文本。
func (s *ReportService) collectData(ctx context.Context, ownerID uint, start, end time.Time) string {
	db := repository.DBFrom(ctx)
	var sb strings.Builder

	// 线索统计
	var leadCount int64
	db.Table("crm_lead").Where("owner_id = ? AND deleted_at IS NULL AND created_at BETWEEN ? AND ?", ownerID, start, end).Count(&leadCount)
	sb.WriteString(fmt.Sprintf("新增线索: %d 条\n", leadCount))

	if leadCount > 0 {
		type leadRow struct{ Name string }
		var leads []leadRow
		db.Table("crm_lead").Select("name").
			Where("owner_id = ? AND deleted_at IS NULL AND created_at BETWEEN ? AND ?", ownerID, start, end).
			Order("created_at DESC").Limit(20).Scan(&leads)
		for i, l := range leads {
			sb.WriteString(fmt.Sprintf("  %d. %s\n", i+1, l.Name))
		}
	}

	// 客户统计
	var custCount int64
	db.Table("crm_customer").Where("owner_id = ? AND deleted_at IS NULL AND created_at BETWEEN ? AND ?", ownerID, start, end).Count(&custCount)
	sb.WriteString(fmt.Sprintf("新增客户: %d 条\n", custCount))

	// 跟进记录统计
	var followCount int64
	db.Table("follow_up_record").Where("owner_id = ? AND deleted_at IS NULL AND follow_time BETWEEN ? AND ?", ownerID, start, end).Count(&followCount)
	sb.WriteString(fmt.Sprintf("跟进记录: %d 条\n", followCount))

	if followCount > 0 {
		type followRow struct {
			Content   string
			FollowTime time.Time
		}
		var follows []followRow
		db.Table("follow_up_record").Select("content, follow_time").
			Where("owner_id = ? AND deleted_at IS NULL AND follow_time BETWEEN ? AND ?", ownerID, start, end).
			Order("follow_time DESC").Limit(20).Scan(&follows)
		for i, f := range follows {
			content := f.Content
			if len(content) > 80 {
				content = content[:80] + "..."
			}
			sb.WriteString(fmt.Sprintf("  %d. [%s] %s\n", i+1, f.FollowTime.Format("01-02 15:04"), content))
		}
	}

	// 商机统计
	var oppCount int64
	db.Table("crm_opportunity").Where("owner_id = ? AND deleted_at IS NULL AND created_at BETWEEN ? AND ?", ownerID, start, end).Count(&oppCount)
	sb.WriteString(fmt.Sprintf("新增商机: %d 条\n", oppCount))

	return sb.String()
}
