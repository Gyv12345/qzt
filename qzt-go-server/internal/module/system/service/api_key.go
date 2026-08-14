package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"time"

	"qzt-go-server/internal/model"
	"qzt-go-server/internal/repository"
	"qzt-go-server/pkg/xtime"
)

// api_key.go API Key 服务(用户自助创建/查看/更新/删除)。
// Key 明文格式: qzt_<32位hex>,仅创建时返回,DB 存 SHA256。
// toolsets 为 MCP 工具集(逗号分隔存储,空=不限制);key 合法性由 handler
// 校验(handler 可 import internal/mcp 的目录,service 层 import 会成环)。

// ApiKeyService API Key 服务。
type ApiKeyService struct {
	repo *repository.ApiKeyRepo
}

func NewApiKeyService() *ApiKeyService {
	return &ApiKeyService{repo: repository.NewApiKeyRepo()}
}

// CreateKeyRequest 创建 API Key 请求。
type CreateKeyRequest struct {
	Name string `json:"name" binding:"required"`
	// 可用工具集(空=不限制,暴露全部 MCP 工具)
	Toolsets []string `json:"toolsets"`
}

// UpdateKeyRequest 更新 API Key 请求(均可选,只更新传入字段)。
type UpdateKeyRequest struct {
	Name     *string   `json:"name"`
	Toolsets *[]string `json:"toolsets"`
}

// ApiKeyItem 列表项(hash 不返回;toolsets 解析为数组,空数组=不限制)。
type ApiKeyItem struct {
	ID         uint      `json:"id"`
	Name       string    `json:"name"`
	KeyPrefix  string    `json:"key_prefix"`
	Toolsets   []string  `json:"toolsets"`
	LastUsedAt string    `json:"last_used_at"`
	LastUsedIP string    `json:"last_used_ip"`
	ExpiresAt  string    `json:"expires_at"`
	Status     int8      `json:"status"`
	CreatedAt  string    `json:"created_at"`
}

// CreateKeyResult 创建结果(含明文 Key,仅此一次返回)。
type CreateKeyResult struct {
	ID        uint     `json:"id"`
	Name      string   `json:"name"`
	ApiKey    string   `json:"api_key"`     // 明文,仅此一次
	KeyPrefix string   `json:"key_prefix"`  // 前缀
	Toolsets  []string `json:"toolsets"`
}

// Create 为用户创建 API Key。
func (s *ApiKeyService) Create(ctx context.Context, userID uint, req *CreateKeyRequest) (*CreateKeyResult, error) {
	// 生成明文 Key: qzt_<32位hex>
	raw := make([]byte, 16)
	if _, err := rand.Read(raw); err != nil {
		return nil, fmt.Errorf("生成随机数失败: %w", err)
	}
	plainKey := model.ApiKeyPrefix + hex.EncodeToString(raw)
	keyHash := repository.HashKey(plainKey)

	apiKey := &model.SysApiKey{
		UserID:    userID,
		Name:      req.Name,
		KeyPrefix: model.ApiKeyPrefix,
		KeyHash:   keyHash,
		Toolsets:  strings.Join(req.Toolsets, ","),
		Status:    model.ApiKeyStatusEnabled,
	}
	if err := s.repo.Create(ctx, apiKey); err != nil {
		return nil, err
	}

	return &CreateKeyResult{
		ID:        apiKey.ID,
		Name:      req.Name,
		ApiKey:    plainKey,
		KeyPrefix: model.ApiKeyPrefix,
		Toolsets:  splitToolsets(apiKey.Toolsets),
	}, nil
}

// List 列出用户的 API Key(hash 不返回)。
func (s *ApiKeyService) List(ctx context.Context, userID uint) ([]ApiKeyItem, error) {
	keys, err := s.repo.ListByUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	out := make([]ApiKeyItem, 0, len(keys))
	for _, k := range keys {
		out = append(out, ApiKeyItem{
			ID:         k.ID,
			Name:       k.Name,
			KeyPrefix:  k.KeyPrefix,
			Toolsets:   splitToolsets(k.Toolsets),
			LastUsedAt: dateTimeString(k.LastUsedAt),
			LastUsedIP: k.LastUsedIP,
			ExpiresAt:  dateTimeString(k.ExpiresAt),
			Status:     k.Status,
			CreatedAt:  k.CreatedAt.Time().Format("2006-01-02 15:04:05"),
		})
	}
	return out, nil
}

// Update 更新 API Key 名称/工具集(校验 owner)。
func (s *ApiKeyService) Update(ctx context.Context, id, userID uint, req *UpdateKeyRequest) error {
	key, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return errors.New("API Key 不存在")
	}
	if key.UserID != userID {
		return errors.New("无权操作")
	}
	if req.Name != nil {
		key.Name = *req.Name
	}
	if req.Toolsets != nil {
		key.Toolsets = strings.Join(*req.Toolsets, ",")
	}
	return s.repo.Update(ctx, key)
}

// Delete 删除 API Key(校验 owner)。
func (s *ApiKeyService) Delete(ctx context.Context, id, userID uint) error {
	key, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return errors.New("API Key 不存在")
	}
	if key.UserID != userID {
		return errors.New("无权操作")
	}
	return s.repo.Delete(ctx, id)
}

// Disable 禁用 API Key。
func (s *ApiKeyService) Disable(ctx context.Context, id, userID uint) error {
	key, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return errors.New("API Key 不存在")
	}
	if key.UserID != userID {
		return errors.New("无权操作")
	}
	key.Status = model.ApiKeyStatusDisabled
	return s.repo.Update(ctx, key)
}

// splitToolsets 逗号分隔存储值 → 数组(空串返回 nil)。
func splitToolsets(s string) []string {
	if s == "" {
		return nil
	}
	return strings.Split(s, ",")
}

// dateTimeString NullDateTime → 字符串(零值返回空串)。
func dateTimeString(t xtime.NullDateTime) string {
	if time.Time(t).IsZero() {
		return ""
	}
	return time.Time(t).Format("2006-01-02 15:04:05")
}
