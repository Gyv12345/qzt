package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"strings"
	"sync"
	"time"

	geo "qzt-go-server/internal/model/geo"
	"qzt-go-server/internal/pkg/llm"
	georepo "qzt-go-server/internal/repository/geo"
	"qzt-go-server/pkg/xlogger"
	"qzt-go-server/pkg/xtime"
)

// monitor.go GEO 监测执行引擎：一轮 = 启用提示词 × 启用平台的全组合，
// 逐组合向平台 API 提问 → 抓回答 → 按手册三级口径打分（0 未提及/1 提及行简/2 提及且带官网链接）
// → 汇总两指标（AI 推荐率、自有引用命中率）。
//
// 防重入：单进程内检查 running 轮次（多实例部署需再加分布式锁，当前单实例够用）；
// 组合间并发度 monitorConcurrency，避免打爆单平台限流。

// 品牌锚点与自有渠道判定关键词（手册第一节「品牌锚点」与第六节「自有渠道」口径）。
const brandKeyword = "行简"

// 自有渠道域名（官网及其子域；百科/知乎号等账号页无法用域名判定，人工复核）。
var ownDomainKeywords = []string{"devlovecode.com"}

// 竞品名清单（答案分析参考；保持「品牌全称」形态避免误命中普通词）。
var competitorKeywords = []string{
	"悟空CRM", "Zoho", "HubSpot", "Salesforce", "纷享销客", "销售易",
	"简道云", "白码", "钉钉", "企微管家", "泛微", "致远",
}

// answerURLPattern 从回答中提取引用 URL。
var answerURLPattern = regexp.MustCompile(`https?://[^\s，。；、）)」"'<>\]]+`)

// monitorConcurrency 单轮内并发请求数。
const monitorConcurrency = 5

// monitorTimeout 单次提问超时。
const monitorTimeout = 90 * time.Second

var (
	errRunRunning = errors.New("已有监测轮次在执行中,请稍后再试")
	errNoTargets  = errors.New("无启用的提示词或平台,无法启动监测")
)

// MonitorService 监测执行服务。
type MonitorService struct{}

func NewMonitorService() *MonitorService { return &MonitorService{} }

// runStartResult 启动轮次的返回（含本轮规模，便于前端提示）。
type runStartResult struct {
	Run           *geo.GeoRun `json:"run"`
	PromptCount   int         `json:"prompt_count"`
	PlatformCount int         `json:"platform_count"`
}

// ScoreAnswer 对一条回答打分并提取引用（手册三级：0/1/2；纯函数供测试复用）。
func ScoreAnswer(answer string) (score int, mention, hasOwnLink, ownCite bool, urls []string, competitors []string) {
	lower := strings.ToLower(answer)
	mention = strings.Contains(answer, brandKeyword)
	for _, u := range answerURLPattern.FindAllString(answer, -1) {
		urls = append(urls, strings.TrimRight(u, ".,;:"))
	}
	for _, kw := range competitorKeywords {
		if strings.Contains(lower, strings.ToLower(kw)) {
			competitors = append(competitors, kw)
		}
	}
	for _, u := range urls {
		lu := strings.ToLower(u)
		for _, d := range ownDomainKeywords {
			if strings.Contains(lu, d) {
				hasOwnLink = true
				ownCite = true
			}
		}
	}
	switch {
	case mention && hasOwnLink:
		score = 2
	case mention:
		score = 1
	default:
		score = 0
	}
	return score, mention, hasOwnLink, ownCite, urls, competitors
}

// StartRun 创建并异步执行一轮监测。已有执行中轮次时拒绝重复触发。
func (s *MonitorService) StartRun(ctx context.Context, trigger string) (*runStartResult, error) {
	running, err := georepo.NewRunRepo().FindRunning(ctx)
	if err != nil {
		return nil, fmt.Errorf("查询执行中轮次失败: %w", err)
	}
	if running != nil {
		return nil, errRunRunning
	}

	prompts, err := georepo.NewPromptRepo().ListEnabled(ctx)
	if err != nil {
		return nil, fmt.Errorf("加载提示词失败: %w", err)
	}
	platforms, err := georepo.NewPlatformRepo().ListEnabled(ctx)
	if err != nil {
		return nil, fmt.Errorf("加载平台失败: %w", err)
	}
	if len(prompts) == 0 || len(platforms) == 0 {
		return nil, errNoTargets
	}

	run := &geo.GeoRun{
		Trigger:  trigger,
		Status:   "running",
		MaxScore: len(prompts) * len(platforms) * 2,
	}
	if err := georepo.NewRunRepo().Create(ctx, run); err != nil {
		return nil, fmt.Errorf("创建轮次失败: %w", err)
	}

	// 脱离请求上下文执行（轮次生命周期长于 HTTP 请求）
	go s.executeRun(run.ID, prompts, platforms)
	return &runStartResult{Run: run, PromptCount: len(prompts), PlatformCount: len(platforms)}, nil
}

// executeRun 执行一轮：并发抓取全组合，逐条打分入库，完成后汇总统计。
func (s *MonitorService) executeRun(runID uint, prompts []geo.GeoPrompt, platforms []geo.GeoPlatform) {
	ctx := context.Background()
	runRepo := georepo.NewRunRepo()
	resultRepo := georepo.NewResultRepo()

	type job struct {
		prompt   geo.GeoPrompt
		platform geo.GeoPlatform
	}
	jobs := make(chan job)
	resultCh := make(chan geo.GeoResult, len(prompts)*len(platforms))

	var wg sync.WaitGroup
	for range monitorConcurrency {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for j := range jobs {
				resultCh <- s.askOnce(ctx, runID, j.prompt, j.platform)
			}
		}()
	}
	for _, p := range prompts {
		for _, plat := range platforms {
			jobs <- job{prompt: p, platform: plat}
		}
	}
	close(jobs)
	wg.Wait()
	close(resultCh)

	results := make([]geo.GeoResult, 0, len(resultCh))
	for r := range resultCh {
		results = append(results, r)
	}

	// 逐条落库（失败条也落，供人工复核失败原因）
	var errCount, mentioned, withLink, totalScore, urlCount, ownCiteCount int
	for i := range results {
		r := results[i]
		if err := resultRepo.Create(ctx, &r); err != nil {
			xlogger.ErrorfCtx(ctx, "geo: 保存监测结果失败 run=%d prompt=%d platform=%d: %v",
				runID, r.PromptID, r.PlatformID, err)
		}
		if r.Status != "ok" {
			errCount++
			continue
		}
		totalScore += r.Score
		if r.MentionBrand {
			mentioned++
		}
		if r.HasOwnLink {
			withLink++
		}
		if len(parseURLs(r.CitedURLs)) > 0 {
			urlCount++
			if r.OwnCite {
				ownCiteCount++
			}
		}
	}

	run, err := runRepo.GetByID(ctx, runID)
	if err != nil {
		xlogger.ErrorfCtx(ctx, "geo: 加载轮次失败 run=%d: %v", runID, err)
		return
	}
	run.TotalResults = len(results)
	run.ErrorCount = errCount
	run.MentionedCount = mentioned
	run.WithLinkCount = withLink
	run.TotalScore = totalScore
	if run.MaxScore > 0 {
		run.RecommendRate = float64(totalScore) / float64(run.MaxScore)
	}
	if urlCount > 0 {
		run.OwnCiteRate = float64(ownCiteCount) / float64(urlCount)
	}
	if errCount == len(results) {
		run.Status = "failed"
		run.ErrorMsg = "全部组合调用失败(检查平台 API Key/网络)"
	} else {
		run.Status = "done"
	}
	finished := xtime.Now()
	run.FinishedAt = &finished
	if err := runRepo.Update(ctx, run); err != nil {
		xlogger.ErrorfCtx(ctx, "geo: 更新轮次统计失败 run=%d: %v", runID, err)
	}
	xlogger.InfofCtx(ctx, "geo: 监测轮次完成 run=%d 结果=%d 失败=%d 得分=%d/%d 推荐率=%.2f 自有引用率=%.2f",
		runID, len(results), errCount, totalScore, run.MaxScore, run.RecommendRate, run.OwnCiteRate)
}

// askOnce 向单个平台提问一次并返回打分后的结果条目（不落库）。
func (s *MonitorService) askOnce(ctx context.Context, runID uint, prompt geo.GeoPrompt, platform geo.GeoPlatform) geo.GeoResult {
	result := geo.GeoResult{
		RunID:      runID,
		PromptID:   prompt.ID,
		PlatformID: platform.ID,
		Status:     "ok",
	}

	start := time.Now()
	resp, err := s.clientFor(platform).Chat(ctx, llm.ChatRequest{
		Messages: []llm.Message{{Role: "user", Content: prompt.Question}},
		Feature:  "geo.monitor",
	})
	result.LatencyMs = time.Since(start).Milliseconds()
	if err != nil {
		result.Status = "error"
		result.ErrorMsg = truncateMsg(err.Error(), 490)
		return result
	}

	result.Answer = resp.Content
	score, mention, hasOwnLink, ownCite, urls, competitors := ScoreAnswer(resp.Content)
	result.Score = score
	result.MentionBrand = mention
	result.HasOwnLink = hasOwnLink
	result.OwnCite = ownCite
	if len(urls) > 0 {
		if b, err := json.Marshal(urls); err == nil {
			result.CitedURLs = string(b)
		}
	}
	result.Competitors = strings.Join(competitors, ",")
	return result
}

// clientFor 为平台构造独立 LLM 客户端（base_url/key/model 均来自平台配置；
// key 未配置时 Chat 返回 ErrNotConfigured，结果条目按失败落库）。
func (s *MonitorService) clientFor(platform geo.GeoPlatform) *llm.Client {
	return llm.NewClient(llm.Options{
		BaseURL:    platform.BaseURL,
		APIKey:     platform.APIKey,
		Model:      platform.Model,
		Timeout:    monitorTimeout,
		MaxRetries: 1,
	})
}

func truncateMsg(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n]
}

// parseURLs 还原结果里的引用 URL（统计用；格式异常按空处理）。
func parseURLs(raw string) []string {
	if raw == "" {
		return nil
	}
	var urls []string
	_ = json.Unmarshal([]byte(raw), &urls)
	return urls
}
