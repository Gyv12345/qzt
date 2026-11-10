package service

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"sync"
	"time"

	"qzt-go-server/config"
	"qzt-go-server/internal/app"
	geo "qzt-go-server/internal/model/geo"
	"qzt-go-server/internal/pkg/videogen"
	georepo "qzt-go-server/internal/repository/geo"
	"qzt-go-server/pkg/xlogger"
)

// pipeline.go 每日信源产线编排：选题 → AI 图文 → AI 视频 → 投递。
//
// 每步独立容错：一步失败记录错误继续下一步（图文产线不因视频失败中断）。
// 防重入：进程级 TryLock（单实例部署；多实例需换分布式锁，与监测引擎同口径）。

// pipelineMu 产线防重入锁。
var pipelineMu sync.Mutex

// topicCooldownDays 选题冷却：同一选题 N 天内不重复产母稿。
const topicCooldownDays = 60

// videoPollMax 视频生成任务轮询上限（8s × 40 ≈ 5.3 分钟）。
const videoPollMax = 40

// PipelineResult 一轮产线的执行摘要。
type PipelineResult struct {
	TopicsGenerated int    `json:"topics_generated"`
	ArticleID       uint   `json:"article_id"`
	ArticleTitle    string `json:"article_title"`
	ArticlePushed   bool   `json:"article_pushed"`
	VideoID         uint   `json:"video_id"`
	VideoRendered   bool   `json:"video_rendered"`
	Notes           string `json:"notes"`
}

// RunPipeline 跑一轮产线（定时任务 geo.source.run 与 admin「立即跑一轮」共用）。
func (s *SourceService) RunPipeline(ctx context.Context, trigger string) (*PipelineResult, error) {
	if !pipelineMu.TryLock() {
		return nil, errors.New("信源产线执行中，请稍后再试")
	}
	defer pipelineMu.Unlock()

	res := &PipelineResult{}
	notes := make([]string, 0)

	// Step1 选题：AI 从监测结果发现新机会（LLM 未配置时跳过，不阻塞产稿）
	if n, err := s.GenerateTopics(ctx, trigger); err != nil {
		notes = append(notes, "选题: "+err.Error())
	} else {
		res.TopicsGenerated = n
	}

	// Step2 图文：写稿 + 自动推草稿箱
	topic, err := s.pickTopic(ctx)
	if err != nil {
		notes = append(notes, "选题领取: "+err.Error())
		xlogger.ErrorfCtx(ctx, "geo/产线: %v", err)
		res.Notes = strings.Join(notes, "；")
		return res, nil
	}
	article, err := s.produceArticle(ctx, topic, trigger)
	if err != nil {
		notes = append(notes, "图文: "+err.Error())
		xlogger.ErrorfCtx(ctx, "geo/产线: 图文产稿失败: %v", err)
	} else {
		res.ArticleID = article.ID
		res.ArticleTitle = article.Title
		if config.Get().Geo.AutoPush {
			if _, err := s.PushToDraft(ctx, article.ID); err != nil {
				notes = append(notes, "推草稿箱: "+err.Error())
				xlogger.ErrorfCtx(ctx, "geo/产线: 推送草稿箱失败 source=%d: %v", article.ID, err)
			} else {
				res.ArticlePushed = true
			}
		}
	}

	// Step3 视频：口播脚本 + AI 文生视频 + 转存 OSS +（可选）抖音直发
	videoCfg := config.Get().VideoGen
	if videogen.Enabled(videoCfg) {
		video, err := s.produceVideo(ctx, topic, trigger)
		if err != nil {
			notes = append(notes, "视频: "+err.Error())
			xlogger.ErrorfCtx(ctx, "geo/产线: 视频产稿失败: %v", err)
		} else {
			res.VideoID = video.ID
			res.VideoRendered = video.VideoURL != ""
			// 出片且已绑定抖音账号 → 直发（best-effort）
			if video.VideoURL != "" {
				if accounts, aerr := georepo.NewPlatformAccountRepo().ListEnabled(ctx, "douyin"); aerr == nil && len(accounts) > 0 {
					if _, perr := s.PushVideoToDouyin(ctx, video.ID, 0); perr != nil {
						notes = append(notes, "抖音直发: "+perr.Error())
						xlogger.ErrorfCtx(ctx, "geo/产线: 抖音直发失败 source=%d: %v", video.ID, perr)
					}
				}
			}
		}
	} else {
		notes = append(notes, "视频: 未配置 VIDEOGEN_API_KEY，本步跳过")
	}

	res.Notes = strings.Join(notes, "；")
	xlogger.InfofCtx(ctx, "geo/产线: 完成 trigger=%s 选题+%d 图文=%d(推送=%v) 视频=%d(出片=%v)",
		trigger, res.TopicsGenerated, res.ArticleID, res.ArticlePushed, res.VideoID, res.VideoRendered)
	return res, nil
}

// PickTopic 领取选题：指定 ID 时校验存在性，否则自动领取（产线与手动产稿共用）。
func (s *SourceService) PickTopic(ctx context.Context, topicID uint) (*geo.GeoTopic, error) {
	if topicID > 0 {
		topic, err := georepo.NewTopicRepo().GetByID(ctx, topicID)
		if err != nil {
			return nil, errors.New("选题不存在")
		}
		return topic, nil
	}
	return s.pickTopic(ctx)
}

// ProduceArticleForTopic 为指定选题产一篇图文母稿（手动产稿入口）。
func (s *SourceService) ProduceArticleForTopic(ctx context.Context, topic *geo.GeoTopic, trigger string) (*geo.GeoSource, error) {
	return s.produceArticle(ctx, topic, trigger)
}

// pickTopic 领取本次产稿选题：优先已批准队列（先批先产），池空则回落矩阵
// （启用提示词中挑近 60 天未产过母稿的、sort 最靠前的一个，落库为 matrix 选题）。
func (s *SourceService) pickTopic(ctx context.Context) (*geo.GeoTopic, error) {
	topicRepo := georepo.NewTopicRepo()

	if approved, err := topicRepo.ListApproved(ctx, 1); err == nil && len(approved) > 0 {
		return &approved[0], nil
	}

	// 矩阵回落：排除近冷却期内已产母稿的选题
	prompts, err := georepo.NewPromptRepo().ListEnabled(ctx)
	if err != nil {
		return nil, err
	}
	if len(prompts) == 0 {
		return nil, errors.New("无可用选题：选题池为空且监测矩阵未启用任何提示词")
	}
	cooldownSince := time.Now().AddDate(0, 0, -topicCooldownDays)
	recent, err := georepo.NewSourceRepo().RecentMotherTopicIDs(ctx, cooldownSince)
	if err != nil {
		return nil, err
	}
	for _, p := range prompts {
		if _, written := recent[p.ID]; written {
			continue
		}
		// 矩阵题落库成选题，产线各环节口径统一（origin=matrix，直接进入队列）
		m := &geo.GeoTopic{Question: p.Question, Origin: "matrix", Status: "approved", PromptID: p.ID}
		if err := topicRepo.Create(ctx, m); err != nil {
			return nil, err
		}
		return m, nil
	}
	return nil, fmt.Errorf("无可用选题：矩阵 %d 题在近 %d 天内均已产稿", len(prompts), topicCooldownDays)
}

// produceArticle 为选题产一篇图文母稿（公众号）。
func (s *SourceService) produceArticle(ctx context.Context, topic *geo.GeoTopic, trigger string) (*geo.GeoSource, error) {
	client, err := writerLLMClient(ctx)
	if err != nil {
		return nil, err
	}
	draft, err := writeArticle(ctx, client, topic.Question, genreForTopic(topic.ID))
	if err != nil {
		return nil, err
	}
	src := &geo.GeoSource{
		TopicID:     topic.ID,
		ContentType: "article",
		Platform:    "wechat_mp",
		Genre:       genreForTopic(topic.ID),
		Title:       draft.Title,
		Digest:      draft.Digest,
		ContentMd:   draft.ContentMd,
		Status:      "generated",
		Trigger:     trigger,
	}
	if err := georepo.NewSourceRepo().Create(ctx, src); err != nil {
		return nil, fmt.Errorf("稿件入库失败: %w", err)
	}
	// P18 质检门禁：生成后自动质检（不达标推送入口会拦截）；跳过（LLM 不可用）静默
	if _, qcErr := s.RunQC(ctx, src.ID); qcErr != nil && !errors.Is(qcErr, ErrQCSkipped) {
		xlogger.ErrorfCtx(ctx, "geo/产线: 稿件质检失败 source=%d: %v", src.ID, qcErr)
	}
	s.markTopicUsed(ctx, topic.ID)
	return src, nil
}

// produceVideo 为选题产口播脚本 + AI 视频成片（转存公共存储）。
func (s *SourceService) produceVideo(ctx context.Context, topic *geo.GeoTopic, trigger string) (*geo.GeoSource, error) {
	client, err := writerLLMClient(ctx)
	if err != nil {
		return nil, err
	}
	scriptMd, err := writeVideoScript(ctx, client, topic.Question)
	if err != nil {
		return nil, err
	}
	script := &geo.GeoSource{
		TopicID:     topic.ID,
		ContentType: "video_script",
		Platform:    "douyin",
		Title:       "口播脚本 - " + topic.Question,
		ContentMd:   scriptMd,
		Status:      "generated",
		Trigger:     trigger,
	}
	if err := georepo.NewSourceRepo().Create(ctx, script); err != nil {
		return nil, fmt.Errorf("脚本入库失败: %w", err)
	}
	// P18 质检门禁：口播脚本同样质检（广告法风险对短视频同样适用）
	if _, qcErr := s.RunQC(ctx, script.ID); qcErr != nil && !errors.Is(qcErr, ErrQCSkipped) {
		xlogger.ErrorfCtx(ctx, "geo/产线: 脚本质检失败 source=%d: %v", script.ID, qcErr)
	}

	// 文生视频（异步任务轮询）
	provider := videogen.NewProvider(config.Get().VideoGen)
	if provider == nil {
		return script, nil
	}
	taskID, err := provider.Submit(ctx, videogen.GenerateRequest{Prompt: ExtractVideoPrompt(scriptMd)})
	if err != nil {
		s.markFailed(ctx, script, err)
		return script, err
	}
	script.VideoTaskID = taskID
	_ = georepo.NewSourceRepo().Update(ctx, script, "video_task_id")

	var videoURL string
	var lastErr string
	for i := 0; i < videoPollMax; i++ {
		select {
		case <-ctx.Done():
			return script, ctx.Err()
		case <-time.After(videogen.DefaultPollInterval):
		}
		st, err := provider.Poll(ctx, taskID)
		if err != nil {
			lastErr = err.Error()
			continue
		}
		if st.Done() {
			if st.Status == "succeeded" {
				videoURL = st.VideoURL
			} else {
				lastErr = st.Error
			}
			break
		}
	}
	if videoURL == "" {
		err := fmt.Errorf("视频生成未完成(任务 %s): %s", taskID, defaultStr(lastErr, "超时"))
		s.markFailed(ctx, script, err)
		return script, err
	}

	// 转存公共存储（供应商临时 URL 有时效，落自有 OSS/本地公共桶拿稳定直链）
	data, err := downloadAsset(ctx, videoURL, maxVideoBytes)
	if err != nil {
		s.markFailed(ctx, script, err)
		return script, err
	}
	uploaded, err := app.GetUploader().SaveBytes("geo_video.mp4", data, "video/mp4", "geo")
	if err != nil {
		s.markFailed(ctx, script, fmt.Errorf("视频转存失败: %w", err))
		return script, err
	}
	script.VideoURL = uploaded.URL
	script.Status = "generated"
	script.Error = ""
	if err := georepo.NewSourceRepo().Update(ctx, script, "video_url", "status", "error"); err != nil {
		return nil, err
	}
	xlogger.InfofCtx(ctx, "geo/产线: 视频出片完成 source=%d task=%s url=%s", script.ID, taskID, uploaded.URL)
	return script, nil
}

// markTopicUsed 选题产稿后标记 used。
func (s *SourceService) markTopicUsed(ctx context.Context, id uint) {
	topic, err := georepo.NewTopicRepo().GetByID(ctx, id)
	if err != nil {
		return
	}
	topic.Status = "used"
	_ = georepo.NewTopicRepo().Update(ctx, topic, "status")
}

// defaultStr 空串取默认值。
func defaultStr(s, def string) string {
	if s == "" {
		return def
	}
	return s
}
