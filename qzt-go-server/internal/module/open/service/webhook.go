// webhook.go Webhook 端点 CRUD + Publish(outbox 写入)。
package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/url"
	"strings"
	"time"

	openmodel "qzt-go-server/internal/model/open"
	"qzt-go-server/internal/repository"
	openrepo "qzt-go-server/internal/repository/open"
	"qzt-go-server/pkg/xlogger"
)

// WebhookService Webhook 端点管理服务。
type WebhookService struct {
	webhookRepo *openrepo.WebhookRepo
	eventRepo   *openrepo.EventRepo
}

// NewWebhookService 构造。
func NewWebhookService() *WebhookService {
	return &WebhookService{
		webhookRepo: openrepo.NewWebhookRepo(),
		eventRepo:   openrepo.NewEventRepo(),
	}
}

// WebhookPayload 创建/更新请求体。
type WebhookPayload struct {
	Name   string `json:"name" binding:"required,max=128"`
	URL    string `json:"url" binding:"required,url,max=512"`
	Events string `json:"events" binding:"max=255"`
	Status *int8  `json:"status"`
	Remark string `json:"remark" binding:"max=255"`
}

// validatePayload 校验 URL scheme 与事件码(纯校验,可单测)。
func validatePayload(p *WebhookPayload) error {
	u, err := url.Parse(p.URL)
	if err != nil || (u.Scheme != "http" && u.Scheme != "https") || u.Host == "" {
		return fmt.Errorf("URL 必须是合法的 http/https 地址")
	}
	if !ValidEvents(p.Events) {
		return fmt.Errorf("存在未登记的事件码,请从事件目录选择: %s", p.Events)
	}
	return nil
}

// Create 创建 webhook;secret 缺省服务端生成。
// 返回 (webhook, 明文 secret, err)——secret 仅创建响应展示一次。
func (s *WebhookService) Create(ctx context.Context, req *WebhookPayload, userID uint) (*openmodel.OpenWebhook, string, error) {
	if err := validatePayload(req); err != nil {
		return nil, "", err
	}
	secret := generateSecret()
	w := &openmodel.OpenWebhook{
		Name:      req.Name,
		URL:       req.URL,
		Secret:    secret,
		Events:    normalizeEvents(req.Events),
		Status:    openmodel.WebhookStatusEnabled,
		Remark:    req.Remark,
		CreatedBy: userID,
	}
	if req.Status != nil {
		w.Status = *req.Status
	}
	if err := s.webhookRepo.Create(ctx, w); err != nil {
		return nil, "", err
	}
	return w, secret, nil
}

// generateSecret 生成 32 字符 hex 签名密钥。
func generateSecret() string {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		// rand.Read 失败极罕见;退化为时间熵
		return hex.EncodeToString([]byte(time.Now().Format("20060102150405.000000000")))
	}
	return hex.EncodeToString(b)
}

// normalizeEvents 归一化事件串:去空格、去空段。
func normalizeEvents(events string) string {
	parts := strings.Split(events, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			out = append(out, p)
		}
	}
	return strings.Join(out, ",")
}

// List 列出全部 webhook(secret 脱敏)。
func (s *WebhookService) List(ctx context.Context) ([]openmodel.OpenWebhook, error) {
	return s.webhookRepo.List(ctx, &repository.QueryOptions{Order: []string{"id ASC"}})
}

// Get 详情。
func (s *WebhookService) Get(ctx context.Context, id uint) (*openmodel.OpenWebhook, error) {
	w, err := s.webhookRepo.GetByID(ctx, id)
	return w, repository.NotFoundOr(err, "Webhook 不存在")
}

// Update 更新 webhook;URL/事件合法性校验同创建。
func (s *WebhookService) Update(ctx context.Context, id uint, req *WebhookPayload) error {
	if err := validatePayload(req); err != nil {
		return err
	}
	w, err := s.webhookRepo.GetByID(ctx, id)
	if err != nil {
		return repository.NotFoundOr(err, "Webhook 不存在")
	}
	w.Name = req.Name
	w.URL = req.URL
	w.Events = normalizeEvents(req.Events)
	w.Remark = req.Remark
	if req.Status != nil {
		w.Status = *req.Status
	}
	return s.webhookRepo.Update(ctx, w)
}

// SetStatus 启停 webhook。
func (s *WebhookService) SetStatus(ctx context.Context, id uint, status int8) error {
	if status != openmodel.WebhookStatusEnabled && status != openmodel.WebhookStatusDisabled {
		return fmt.Errorf("非法状态值")
	}
	w, err := s.webhookRepo.GetByID(ctx, id)
	if err != nil {
		return repository.NotFoundOr(err, "Webhook 不存在")
	}
	w.Status = status
	return s.webhookRepo.Update(ctx, w)
}

// Delete 软删 webhook;投递日志保留可查。
func (s *WebhookService) Delete(ctx context.Context, id uint) error {
	if _, err := s.webhookRepo.GetByID(ctx, id); err != nil {
		return repository.NotFoundOr(err, "Webhook 不存在")
	}
	return s.webhookRepo.Delete(ctx, id)
}

// Publish 业务事件发布入口:为每个订阅了该事件的启用 webhook 落一条 outbox。
// 由 xevent listener 与 PassPostConfig 自定义事件调用;payload 会被 JSON 序列化快照。
// 不返回错误(发布失败仅记日志,不阻断业务主流程)。
func (s *WebhookService) Publish(ctx context.Context, eventType string, payload map[string]any) {
	hooks, err := s.webhookRepo.ListEnabledSubscribed(ctx, eventType)
	if err != nil {
		xlogger.ErrorfCtx(ctx, "webhook Publish 查询订阅失败 event=%s: %v", eventType, err)
		return
	}
	if len(hooks) == 0 {
		return
	}
	body, jerr := json.Marshal(map[string]any{
		"event":       eventType,
		"occurred_at": time.Now().Format(time.RFC3339),
		"data":        payload,
	})
	if jerr != nil {
		xlogger.ErrorfCtx(ctx, "webhook Publish 序列化失败 event=%s: %v", eventType, jerr)
		return
	}
	for _, h := range hooks {
		ev := &openmodel.OpenWebhookEvent{
			WebhookID: h.ID,
			EventType: eventType,
			Payload:   string(body),
			Status:    openmodel.EventStatusPending,
		}
		if err := s.eventRepo.Create(ctx, ev); err != nil {
			xlogger.ErrorfCtx(ctx, "webhook Publish 落库失败 webhook_id=%d event=%s: %v", h.ID, eventType, err)
		}
	}
}

// ListPage 分页查询投递日志(管理端)。
func (s *WebhookService) ListPage(ctx context.Context, webhookID uint, eventType string, status int8, page, pageSize int, start, end string) ([]openmodel.OpenWebhookEvent, int64, error) {
	q := &repository.QueryOptions{Order: []string{"id DESC"}}
	if webhookID > 0 {
		q.Where = map[string]any{"webhook_id": webhookID}
	}
	if eventType != "" {
		if q.Where == nil {
			q.Where = map[string]any{}
		}
		q.Where["event_type"] = eventType
	}
	if status >= 0 {
		if q.Where == nil {
			q.Where = map[string]any{}
		}
		q.Where["status"] = status
	}
	if start != "" {
		q.Conds = append(q.Conds, repository.Cond{Query: "created_at >= ?", Args: []any{start}})
	}
	if end != "" {
		q.Conds = append(q.Conds, repository.Cond{Query: "created_at <= ?", Args: []any{end + " 23:59:59"}})
	}
	return s.eventRepo.PageList(ctx, page, pageSize, q)
}

// RetryEvent 管理端手动重试。
func (s *WebhookService) RetryEvent(ctx context.Context, id uint) error {
	if _, err := s.eventRepo.GetByID(ctx, id); err != nil {
		return repository.NotFoundOr(err, "投递记录不存在")
	}
	return s.eventRepo.ResetForRetry(ctx, id)
}
