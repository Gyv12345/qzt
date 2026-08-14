package repository

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"time"

	"qzt-go-server/internal/model"
)

// api_key.go API Key repository。

type ApiKeyRepo struct {
	BaseRepo[model.SysApiKey]
}

func NewApiKeyRepo() *ApiKeyRepo { return &ApiKeyRepo{} }

// HashKey 对明文 API Key 做 SHA256 hash。
func HashKey(plainKey string) string {
	h := sha256.Sum256([]byte(plainKey))
	return hex.EncodeToString(h[:])
}

// GetByHash 按 hash 查询启用的 API Key(认证中间件用)。
func (r *ApiKeyRepo) GetByHash(ctx context.Context, keyHash string) (*model.SysApiKey, error) {
	var key model.SysApiKey
	err := dbFrom(ctx).Where("key_hash = ? AND status = 1", keyHash).First(&key).Error
	return &key, err
}

// ListByUser 列出用户的所有 API Key。
func (r *ApiKeyRepo) ListByUser(ctx context.Context, userID uint) ([]model.SysApiKey, error) {
	var list []model.SysApiKey
	err := dbFrom(ctx).Where("user_id = ?", userID).Order("id DESC").Find(&list).Error
	return list, err
}

// Update 覆写(更新使用时间/状态/工具集)。
func (r *ApiKeyRepo) Update(ctx context.Context, m *model.SysApiKey) error {
	return r.BaseRepo.Update(ctx, m, "Name", "LastUsedAt", "LastUsedIP", "ExpiresAt", "Status", "Toolsets")
}

// UpdateLastUsed 更新最后使用时间和 IP。
func (r *ApiKeyRepo) UpdateLastUsed(ctx context.Context, id uint, ip string) {
	dbFrom(ctx).Model(&model.SysApiKey{}).Where("id = ?", id).
		Updates(map[string]any{"last_used_at": time.Now(), "last_used_ip": ip})
}
