// Package open 开放集成模块 repository(Webhook 端点 + 投递日志)。
// 嵌入 repository.BaseRepo[T] 获得通用 CRUD;按需补充特定查询。
package open

import (
	"context"

	"gorm.io/gorm"

	openmodel "qzt-go-server/internal/model/open"
	"qzt-go-server/internal/repository"
	"qzt-go-server/pkg/xtime"
)

// repoDB 复用全局事务感知的 DB 句柄(同 marketing 的写法)。
func repoDB(ctx context.Context) *gorm.DB { return repository.DBFrom(ctx) }

// ── Webhook 端点 ──

type WebhookRepo struct {
	repository.BaseRepo[openmodel.OpenWebhook]
}

func NewWebhookRepo() *WebhookRepo { return &WebhookRepo{} }

// ListEnabledSubscribed 列出启用且订阅了指定事件的 webhook(events 空=订阅全部)。
func (r *WebhookRepo) ListEnabledSubscribed(ctx context.Context, eventType string) ([]openmodel.OpenWebhook, error) {
	var list []openmodel.OpenWebhook
	err := repoDB(ctx).
		Where("status = ?", openmodel.WebhookStatusEnabled).
		Where("events = '' OR events IS NULL OR FIND_IN_SET(?, events)", eventType).
		Order("id ASC").
		Find(&list).Error
	return list, err
}

// Update 覆写:白名单列(URL/secret 不允许运行时清空)。
func (r *WebhookRepo) Update(ctx context.Context, m *openmodel.OpenWebhook) error {
	return r.BaseRepo.Update(ctx, m,
		"Name", "URL", "Secret", "Events", "Status", "Remark")
}

// ── 投递日志(outbox) ──

type EventRepo struct {
	repository.BaseRepo[openmodel.OpenWebhookEvent]
}

func NewEventRepo() *EventRepo { return &EventRepo{} }

// ListDue 分页列出待投递且到期的日志(投递器扫描入口)。
func (r *EventRepo) ListDue(ctx context.Context, limit int) ([]openmodel.OpenWebhookEvent, error) {
	var list []openmodel.OpenWebhookEvent
	err := repoDB(ctx).
		Where("status = ? AND (next_retry_at IS NULL OR next_retry_at <= NOW(3))", openmodel.EventStatusPending).
		Order("id ASC").
		Limit(limit).
		Find(&list).Error
	return list, err
}

// Claim 乐观抢占:PENDING→DISPATCHING,按影响行数防双发。
func (r *EventRepo) Claim(ctx context.Context, id uint) (bool, error) {
	res := repoDB(ctx).Model(&openmodel.OpenWebhookEvent{}).
		Where("id = ? AND status = ?", id, openmodel.EventStatusPending).
		Update("status", openmodel.EventStatusDispatching)
	return res.RowsAffected == 1, res.Error
}

// MarkResult 回填投递结果。
func (r *EventRepo) MarkResult(ctx context.Context, id uint, status int8, httpStatus int, errMsg string, nextRetryAt *xtime.DateTime, delivered bool) error {
	updates := map[string]any{
		"status":           status,
		"retry_count":      gorm.Expr("retry_count + 1"),
		"last_http_status": httpStatus,
		"last_error":       errMsg,
	}
	if nextRetryAt != nil {
		updates["next_retry_at"] = nextRetryAt
	}
	if delivered {
		updates["delivered_at"] = xtime.Now()
	}
	return repoDB(ctx).Model(&openmodel.OpenWebhookEvent{}).
		Where("id = ?", id).
		Updates(updates).Error
}

// ResetForRetry 管理端手动重试:置回 PENDING 并清零计数。
func (r *EventRepo) ResetForRetry(ctx context.Context, id uint) error {
	return repoDB(ctx).Model(&openmodel.OpenWebhookEvent{}).
		Where("id = ? AND status IN ?", id, []int8{openmodel.EventStatusFailed, openmodel.EventStatusDead}).
		Updates(map[string]any{
			"status":        openmodel.EventStatusPending,
			"retry_count":   0,
			"next_retry_at": nil,
		}).Error
}

// DeleteExpiredSuccess 硬删 N 天前的成功投递日志(cleanup job 用)。
func (r *EventRepo) DeleteExpiredSuccess(ctx context.Context, keepDays int) error {
	return repoDB(ctx).Unscoped().
		Where("status = ? AND created_at < NOW(3) - INTERVAL ? DAY", openmodel.EventStatusSuccess, keepDays).
		Delete(&openmodel.OpenWebhookEvent{}).Error
}
