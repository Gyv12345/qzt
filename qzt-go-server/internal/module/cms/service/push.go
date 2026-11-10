package service

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"qzt-go-server/config"
	cmsmodel "qzt-go-server/internal/model/cms"
	"qzt-go-server/internal/pkg/searchpush"
	cmsrepo "qzt-go-server/internal/repository/cms"
	"qzt-go-server/pkg/xlogger"
)

// push.go 搜索引擎主动推送(百度主动推送 + IndexNow)。
//
// 只接受自有站点 URL(searchpush.FilterOwnURLs 域名白名单);同一 URL 24h 内
// 已成功推送过则跳过——保护百度每日配额(~10条/日),也避免向 IndexNow 重复灌同批 URL。
// 三个入口共用本服务:文章发布钩子(TriggerArticlePush)、每日 cron 兜底(cms.seo.push)、
// admin 手动推送接口(/cms/push/*)。

// pushDedupWindow 同 URL 同通道的推送去重窗口。
const pushDedupWindow = 24 * time.Hour

// PushService 搜索引擎推送服务。
type PushService struct {
	articleRepo *cmsrepo.ArticleRepo
	logRepo     *cmsrepo.PushLogRepo
}

func NewPushService() *PushService {
	return &PushService{articleRepo: cmsrepo.NewArticleRepo(), logRepo: cmsrepo.NewPushLogRepo()}
}

// PushResult 一次推送操作的汇总。
type PushResult struct {
	Channel string `json:"channel"`
	// 参与本次的 URL 总数
	Total int `json:"total"`
	// 成功条数
	Success int `json:"success"`
	// 跳过条数(24h 内已推送/配额耗尽未推)
	Skipped int `json:"skipped"`
	// 失败条数
	Failed int `json:"failed"`
	// 百度当日剩余配额(仅百度通道有值)
	Remain int `json:"remain"`
	// 补充说明(配额耗尽等)
	Message string `json:"message,omitempty"`
}

// Push 按通道推送 URL 与文章(文章按 slug 拼公开链接)。
// 百度逐条调用、配额耗尽即停;IndexNow 单次批量提交。
func (s *PushService) Push(ctx context.Context, channel string, urls []string, articleIDs []uint) (*PushResult, error) {
	seo := config.Get().SEO
	if seo.Site == "" {
		return nil, errors.New("未配置站点域名(config seo.site)")
	}
	// 文章 ID 解析为公开链接(无 slug 的跳过——公开链接会 404,推了无意义)
	for _, id := range articleIDs {
		a, err := s.articleRepo.GetByID(ctx, id)
		if err != nil {
			return nil, fmt.Errorf("文章不存在 id=%d", id)
		}
		if a.Slug != "" {
			urls = append(urls, articlePublicURL(seo.Site, a.Slug))
		}
	}

	res := &PushResult{Channel: channel, Total: len(urls)}
	filtered := searchpush.FilterOwnURLs(urls, seo.Site)
	if len(filtered) == 0 {
		res.Message = "无有效的自有站点URL(外站/内网地址已被过滤)"
		return res, nil
	}

	client := searchpush.NewClient(searchpush.Config{
		Site:        seo.Site,
		BaiduToken:  seo.BaiduToken,
		IndexNowKey: seo.IndexNowKey,
	})
	batchID := fmt.Sprintf("%d", time.Now().UnixNano())

	switch channel {
	case cmsmodel.PushChannelBaidu:
		return s.pushBaidu(ctx, client, filtered, batchID, res)
	case cmsmodel.PushChannelIndexNow:
		return s.pushIndexNow(ctx, client, filtered, batchID, res)
	default:
		return nil, fmt.Errorf("未知推送通道: %s", channel)
	}
}

// pushBaidu 百度逐条推送。配额耗尽(over quota)即停止,剩余 URL 记 skipped。
func (s *PushService) pushBaidu(ctx context.Context, client *searchpush.Client, urls []string, batchID string, res *PushResult) (*PushResult, error) {
	for _, u := range urls {
		if pushed, _ := s.logRepo.PushedRecently(ctx, cmsmodel.PushChannelBaidu, u, pushDedupWindow); pushed {
			res.Skipped++
			s.writeLog(ctx, batchID, cmsmodel.PushChannelBaidu, u, cmsmodel.PushStatusSkipped, 0, "", "24h内已推送")
			continue
		}
		r, err := client.PushBaidu(ctx, u)
		if err != nil {
			if errors.Is(err, searchpush.ErrBaiduNotConfigured) {
				return nil, err
			}
			res.Failed++
			s.writeLog(ctx, batchID, cmsmodel.PushChannelBaidu, u, cmsmodel.PushStatusFailed, 0, "", err.Error())
			continue
		}
		if r.OK() {
			res.Success++
			res.Remain = r.Remain
			s.writeLog(ctx, batchID, cmsmodel.PushChannelBaidu, u, cmsmodel.PushStatusSuccess, http.StatusOK, fmt.Sprintf(`{"success":%d,"remain":%d}`, r.Success, r.Remain), "")
			continue
		}
		res.Failed++
		s.writeLog(ctx, batchID, cmsmodel.PushChannelBaidu, u, cmsmodel.PushStatusFailed, http.StatusOK, "error:"+fmt.Sprint(r.Error), r.Message)
		if r.OverQuota() {
			res.Skipped += len(urls) - res.Success - res.Skipped - res.Failed
			res.Message = "百度每日配额已用尽,剩余URL明日再推"
			break
		}
	}
	return res, nil
}

// pushIndexNow 单次批量提交,提交结果(状态码)记到每条 URL 上。
func (s *PushService) pushIndexNow(ctx context.Context, client *searchpush.Client, urls []string, batchID string, res *PushResult) (*PushResult, error) {
	var toPush []string
	for _, u := range urls {
		pushed, _ := s.logRepo.PushedRecently(ctx, cmsmodel.PushChannelIndexNow, u, pushDedupWindow)
		if pushed {
			res.Skipped++
			s.writeLog(ctx, batchID, cmsmodel.PushChannelIndexNow, u, cmsmodel.PushStatusSkipped, 0, "", "24h内已推送")
			continue
		}
		toPush = append(toPush, u)
	}
	if len(toPush) == 0 {
		return res, nil
	}

	code, body, err := client.PushIndexNow(ctx, toPush)
	if err != nil {
		if errors.Is(err, searchpush.ErrIndexNowNotConfigured) {
			return nil, err
		}
		return res, err
	}
	// 200/202 均为提交成功(202=key 待验证,提交已被接受)
	status := cmsmodel.PushStatusFailed
	reason := fmt.Sprintf("http=%d %s", code, body)
	if code == 200 || code == 202 {
		status = cmsmodel.PushStatusSuccess
		reason = ""
		res.Success = len(toPush)
	} else {
		res.Failed = len(toPush)
		res.Message = reason
	}
	for _, u := range toPush {
		s.writeLog(ctx, batchID, cmsmodel.PushChannelIndexNow, u, status, code, body, reason)
	}
	return res, nil
}

// PushRecentArticles 每日兜底:近 7 天发布/更新的文章推送两个通道。
// 百度按 DailyQuota(默认 10)截断;IndexNow 无配额但同样只取前 50 条防失控。
func (s *PushService) PushRecentArticles(ctx context.Context) ([]*PushResult, error) {
	seo := config.Get().SEO
	if seo.Site == "" {
		return nil, errors.New("未配置站点域名(config seo.site)")
	}
	articles, err := s.articleRepo.ListRecentlyUpdatedPublished(ctx, time.Now().Add(-7*24*time.Hour), 50)
	if err != nil {
		return nil, err
	}
	quota := seo.DailyQuota
	if quota <= 0 {
		quota = 10
	}
	if len(articles) > quota {
		articles = articles[:quota]
	}

	var results []*PushResult
	channels := []string{cmsmodel.PushChannelBaidu, cmsmodel.PushChannelIndexNow}
	for _, ch := range channels {
		urls := make([]string, 0, len(articles))
		for _, a := range articles {
			urls = append(urls, articlePublicURL(seo.Site, a.Slug))
		}
		res, err := s.Push(ctx, ch, urls, nil)
		if err != nil {
			results = append(results, &PushResult{Channel: ch, Total: len(urls), Message: err.Error()})
			continue
		}
		results = append(results, res)
	}
	return results, nil
}

// ListLogs 推送日志分页。
func (s *PushService) ListLogs(ctx context.Context, page, pageSize int, channel string) ([]cmsmodel.CmsPushLog, int64, error) {
	return s.logRepo.List(ctx, page, pageSize, channel)
}

// TriggerArticlePush 文章发布钩子:创建/更新为已发布后异步推送两个通道。
// 仅对「当前公开可见」的文章推送(P19:未到定时发布时间/已过期不推——到点由
// cms.scheduling.push 定时任务补推)。best-effort,失败只记日志,不阻塞文章保存;
// 未配置推送时静默返回。
func TriggerArticlePush(a *cmsmodel.CmsArticle) {
	seo := config.Get().SEO
	if seo.Site == "" || a.Slug == "" || !articleVisibleNow(a, time.Now()) {
		return
	}
	u := articlePublicURL(seo.Site, a.Slug)
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
		defer cancel()
		svc := NewPushService()
		for _, ch := range []string{cmsmodel.PushChannelBaidu, cmsmodel.PushChannelIndexNow} {
			res, err := svc.Push(ctx, ch, []string{u}, nil)
			if err != nil {
				xlogger.ErrorfCtx(ctx, "cms: 文章发布推送失败 channel=%s url=%s: %v", ch, u, err)
				continue
			}
			xlogger.InfofCtx(ctx, "cms: 文章发布推送 channel=%s url=%s 成功=%d 跳过=%d 失败=%d %s",
				ch, u, res.Success, res.Skipped, res.Failed, res.Message)
		}
	}()
}

// articlePublicURL 拼文章公开链接,与 qzt-go-cms 的 /news/[slug] 路由一致。
func articlePublicURL(site, slug string) string {
	return strings.TrimRight(site, "/") + "/news/" + slug
}

// writeLog 落推送日志(best-effort,失败只打日志,不影响推送主流程)。
func (s *PushService) writeLog(ctx context.Context, batchID, channel, url, status string, httpCode int, respBody, reason string) {
	row := &cmsmodel.CmsPushLog{
		Channel:  channel,
		URL:      url,
		RefType:  "cms_article",
		Status:   status,
		HTTPCode: httpCode,
		RespBody: respBody,
		Error:    reason,
		BatchID:  batchID,
	}
	if err := s.logRepo.Create(ctx, row); err != nil {
		xlogger.ErrorfCtx(ctx, "cms: 推送日志写入失败 channel=%s url=%s: %v", channel, url, err)
	}
}
