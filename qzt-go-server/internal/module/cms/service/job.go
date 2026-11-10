package service

import (
	"context"
	"time"

	entsvc "qzt-go-server/internal/module/enterprise/service"
	cmsrepo "qzt-go-server/internal/repository/cms"
	"qzt-go-server/pkg/xlogger"
)

// job.go CMS 定时任务。
//
// bean_class=cms.seo.push,cron 在 docs/sql/seo_push.sql 注册(每天 07:40,
// 早于 GEO 信源产线 08:30,使产线当日的产出顺延进明早的推送窗口)。
// bean_class=cms.scheduling.push,cron 在 docs/sql/cms_scheduling.sql 注册(每分钟,
// 10 分钟容错窗口扫「刚到 publish_at」的文章触发推送;长停机漏扫由每日兜底补)。
// cms/service 包被 handler import,init() 必然执行;sys_job 记录插入后需重启服务。

func init() {
	entsvc.RegisterJobHandler("cms.seo.push", &seoPushJob{})
	entsvc.RegisterJobHandler("cms.scheduling.push", &schedulingPushJob{})
}

// seoPushJob 每日搜索引擎推送兜底(近 7 天发布/更新的文章;24h 内已推的自动跳过)。
type seoPushJob struct{}

// Execute 同步执行(总耗时为两条通道的出站 HTTP,秒级;调度器在协程中执行)。
func (h *seoPushJob) Execute(ctx context.Context) error {
	results, err := NewPushService().PushRecentArticles(ctx)
	if err != nil {
		return err
	}
	for _, r := range results {
		xlogger.InfofCtx(ctx, "cms: 定时SEO推送 channel=%s 总数=%d 成功=%d 跳过=%d 失败=%d %s",
			r.Channel, r.Total, r.Success, r.Skipped, r.Failed, r.Message)
	}
	return nil
}

// schedulingPushJob P19 定时发布到点推送:每分钟扫描「刚到 publish_at」的文章
// (10 分钟容错窗口,容忍调度抖动/短暂停机),逐篇复用发布钩子推百度/IndexNow。
// 推送侧 cms_push_log 的 24h 去重保证窗口重叠时不会重复推同一 URL;
// 服务长时间停机漏扫的文章由每日 07:40 兜底任务(cms.seo.push)补推。
type schedulingPushJob struct{}

func (h *schedulingPushJob) Execute(ctx context.Context) error {
	repo := cmsrepo.NewArticleRepo()
	now := time.Now()
	articles, err := repo.ListDueToPublish(ctx, now.Add(-10*time.Minute), now)
	if err != nil {
		return err
	}
	for i := range articles {
		a := &articles[i]
		TriggerArticlePush(a)
		xlogger.InfofCtx(ctx, "cms: 定时发布到点推送 id=%d slug=%s publish_at=%s",
			a.ID, a.Slug, a.PublishAt.Format("2006-01-02 15:04:05"))
	}
	return nil
}
