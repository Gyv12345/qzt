package service

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"qzt-go-server/config"
	geo "qzt-go-server/internal/model/geo"
	"qzt-go-server/internal/repository"
	georepo "qzt-go-server/internal/repository/geo"

	"qzt-go-server/pkg/xlogger"
)

// topic.go 选题池：CRUD + AI 生成选题（读最近监测结果找「AI 答不好/竞品在场
// 行简缺席」的问题，回流成待产稿选题）。

// TopicPayload 选题新增/编辑入参。
type TopicPayload struct {
	Question string `json:"question"`
	Reason   string `json:"reason"`
}

// ListTopics 选题分页（status/origin 可选筛选）。
func (s *SourceService) ListTopics(ctx context.Context, page, pageSize int, status, origin string) ([]geo.GeoTopic, int64, error) {
	return georepo.NewTopicRepo().PageList(ctx, page, pageSize, status, origin)
}

// CreateTopic 手工新增选题（origin=manual，默认待审批）。
func (s *SourceService) CreateTopic(ctx context.Context, p *TopicPayload) (*geo.GeoTopic, error) {
	question := strings.TrimSpace(p.Question)
	if question == "" {
		return nil, errors.New("选题问题不能为空")
	}
	m := &geo.GeoTopic{Question: question, Origin: "manual", Reason: strings.TrimSpace(p.Reason)}
	if err := georepo.NewTopicRepo().Create(ctx, m); err != nil {
		return nil, fmt.Errorf("新增选题失败: %w", err)
	}
	return m, nil
}

// UpdateTopic 编辑选题问题与依据。
func (s *SourceService) UpdateTopic(ctx context.Context, id uint, p *TopicPayload) error {
	question := strings.TrimSpace(p.Question)
	if question == "" {
		return errors.New("选题问题不能为空")
	}
	m, err := georepo.NewTopicRepo().GetByID(ctx, id)
	if err != nil {
		return errors.New("选题不存在")
	}
	m.Question = question
	m.Reason = strings.TrimSpace(p.Reason)
	return georepo.NewTopicRepo().Update(ctx, m)
}

// ReviewTopic 审批选题：approve=true 进入产稿队列，否则驳回。
func (s *SourceService) ReviewTopic(ctx context.Context, id uint, approve bool) error {
	m, err := georepo.NewTopicRepo().GetByID(ctx, id)
	if err != nil {
		return errors.New("选题不存在")
	}
	if approve {
		m.Status = "approved"
	} else {
		m.Status = "rejected"
	}
	return georepo.NewTopicRepo().Update(ctx, m)
}

// DeleteTopic 删除选题。
func (s *SourceService) DeleteTopic(ctx context.Context, id uint) error {
	return georepo.NewTopicRepo().Delete(ctx, id)
}

// topicsPerCall 每次 AI 生成的选题数上限（每日产线一次调用）。
const topicsPerCall = 2

// GenerateTopics AI 生成选题：LLM 读既有矩阵 + 最近监测结果，产出新选题入池。
// 返回实际入库条数。
func (s *SourceService) GenerateTopics(ctx context.Context, trigger string) (int, error) {
	client, err := writerLLMClient(ctx)
	if err != nil {
		return 0, err
	}

	// 既有问题集合：矩阵 + 待审批/已批准选题（防重复）
	prompts, err := georepo.NewPromptRepo().List(ctx, nil)
	if err != nil {
		return 0, err
	}
	matrix := make([]string, 0, len(prompts))
	existing := make(map[string]struct{}, len(prompts)*2)
	promptText := make(map[uint]string, len(prompts))
	for _, p := range prompts {
		matrix = append(matrix, p.Question)
		existing[p.Question] = struct{}{}
		promptText[p.ID] = p.Question
	}
	openTopics, err := georepo.NewTopicRepo().List(ctx, &repository.QueryOptions{
		Conds: []repository.Cond{{Query: "status IN ?", Args: []any{[]string{"pending", "approved"}}}},
	})
	if err != nil {
		return 0, err
	}
	for _, t := range openTopics {
		existing[t.Question] = struct{}{}
	}

	// 最近一轮监测结果摘要（无监测数据时也可基于矩阵生成）
	resultLines := make([]string, 0, 16)
	var runID uint
	if runs, err := georepo.NewRunRepo().Latest(ctx, 1); err == nil && len(runs) > 0 {
		runID = runs[0].ID
		if results, err := georepo.NewResultRepo().ListByRun(ctx, runID); err == nil {
			for _, r := range results {
				q := promptText[r.PromptID]
				if q == "" {
					continue
				}
				resultLines = append(resultLines, fmt.Sprintf("%s｜得分%d｜竞品:%s｜引用:%s",
					q, r.Score, r.Competitors, truncateRunes(r.CitedURLs, 200)))
			}
		}
	}

	cands, err := generateTopicsOnce(ctx, client, matrix, resultLines, topicsPerCall)
	if err != nil {
		return 0, err
	}

	status := "pending"
	if config.Get().Geo.TopicAutoApprove {
		status = "approved"
	}
	inserted := 0
	for _, c := range cands {
		if _, dup := existing[c.Question]; dup {
			continue
		}
		m := &geo.GeoTopic{
			Question:    c.Question,
			Origin:      "ai",
			Status:      status,
			Reason:      strings.TrimSpace(c.Reason),
			SourceRunID: runID,
			PromptID:    c.PromptID,
		}
		if err := georepo.NewTopicRepo().Create(ctx, m); err != nil {
			xlogger.ErrorfCtx(ctx, "geo: 选题入库失败 %q: %v", c.Question, err)
			continue
		}
		existing[c.Question] = struct{}{}
		inserted++
	}
	return inserted, nil
}
