// dispatch.go Webhook 投递 job。
package service

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"net/http"
	"time"

	openmodel "qzt-go-server/internal/model/open"
	entsvc "qzt-go-server/internal/module/enterprise/service"
	"qzt-go-server/pkg/xlogger"
	"qzt-go-server/pkg/xtime"
)

// dispatchHTTPClient 投递用 HTTP 客户端(10s 超时)。
var dispatchHTTPClient = &http.Client{Timeout: 10 * time.Second}

// deliverOnce 单次投递(可单测):签名 + POST,返回 (httpStatus, err)。
func deliverOnce(client *http.Client, hook *openmodel.OpenWebhook, payload, eventType string, deliveryID uint) (int, error) {
	ts := fmt.Sprintf("%d", time.Now().Unix())
	sig := SignPayload(hook.Secret, ts, payload)
	req, err := http.NewRequest(http.MethodPost, hook.URL, bytes.NewBufferString(payload))
	if err != nil {
		return 0, fmt.Errorf("构造请求失败: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-QZT-Signature", sig)
	req.Header.Set("X-QZT-Event", eventType)
	req.Header.Set("X-QZT-Timestamp", ts)
	req.Header.Set("X-QZT-Delivery", fmt.Sprintf("%d", deliveryID))
	resp, err := client.Do(req)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
	_ = body
	return resp.StatusCode, nil
}

// webhookCleanupJob 清理 job:open.webhook.cleanup。
type webhookCleanupJob struct {
	svc *WebhookService
}

// Execute 删除 30 天前的成功投递日志(硬删)。
func (j *webhookCleanupJob) Execute(ctx context.Context) error {
	return j.svc.eventRepo.DeleteExpiredSuccess(ctx, 30)
}

// webhookDispatchJob 投递 job:open.webhook.dispatch。
type webhookDispatchJob struct {
	svc *WebhookService
}

// Execute job 入口:扫描到期 PENDING → 逐条抢占 → 签名投递 → 回写结果。
func (j *webhookDispatchJob) Execute(ctx context.Context) error {
	events, err := j.svc.eventRepo.ListDue(ctx, 100)
	if err != nil {
		return err
	}
	for _, ev := range events {
		if err := j.dispatchOne(ctx, &ev); err != nil {
			xlogger.ErrorfCtx(ctx, "webhook 投递单条失败 event_id=%d: %v", ev.ID, err)
		}
	}
	return nil
}

// dispatchOne 投递单条:抢占 → 投递 → 按结果回写(成功/退避重试/死信)。
func (j *webhookDispatchJob) dispatchOne(ctx context.Context, ev *openmodel.OpenWebhookEvent) error {
	ok, err := j.svc.eventRepo.Claim(ctx, ev.ID)
	if err != nil || !ok {
		return err // 已被并发抢占或查询失败
	}
	hook, err := j.svc.webhookRepo.GetByID(ctx, ev.WebhookID)
	if err != nil {
		// webhook 已删:直接死信
		_ = j.svc.eventRepo.MarkResult(ctx, ev.ID, openmodel.EventStatusDead, 0, "webhook 已删除", nil, false)
		return nil
	}
	httpStatus, derr := deliverOnce(dispatchHTTPClient, hook, ev.Payload, ev.EventType, ev.ID)
	if derr == nil && httpStatus >= 200 && httpStatus < 300 {
		return j.svc.eventRepo.MarkResult(ctx, ev.ID, openmodel.EventStatusSuccess, httpStatus, "", nil, true)
	}
	errMsg := fmt.Sprintf("%v", derr)
	if derr == nil {
		errMsg = fmt.Sprintf("HTTP %d", httpStatus)
	}
	// retry_count 含本次:决定退避或死信
	delay := NextRetryDelay(ev.RetryCount + 1)
	if delay <= 0 {
		return j.svc.eventRepo.MarkResult(ctx, ev.ID, openmodel.EventStatusDead, httpStatus, errMsg, nil, false)
	}
	next := xtime.NewDateTime(time.Now().Add(delay))
	return j.svc.eventRepo.MarkResult(ctx, ev.ID, openmodel.EventStatusFailed, httpStatus, errMsg, &next, false)
}

func init() {
	entsvc.RegisterJobHandler("open.webhook.dispatch", &webhookDispatchJob{svc: NewWebhookService()})
	entsvc.RegisterJobHandler("open.webhook.cleanup", &webhookCleanupJob{svc: NewWebhookService()})
}
