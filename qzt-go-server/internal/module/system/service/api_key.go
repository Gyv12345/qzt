package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"

	"qzt-go-server/internal/model"
	"qzt-go-server/internal/repository"
)

// api_key.go API Key 服务(用户自助创建/查看/删除)。
// Key 明文格式: qzt_<32位hex>,仅创建时返回,DB 存 SHA256。

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
}

// CreateKeyResult 创建结果(含明文 Key,仅此一次返回)。
type CreateKeyResult struct {
	ID        uint   `json:"id"`
	Name      string `json:"name"`
	ApiKey    string `json:"api_key"`     // 明文,仅此一次
	KeyPrefix string `json:"key_prefix"`  // 前缀
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
	}, nil
}

// List 列出用户的 API Key(hash 不返回,model 里 json:"-")。
func (s *ApiKeyService) List(ctx context.Context, userID uint) ([]model.SysApiKey, error) {
	return s.repo.ListByUser(ctx, userID)
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
