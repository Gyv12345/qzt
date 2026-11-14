package repository

import (
	"context"

	"qzt-go-server/internal/model"
)

// ai_model.go AI 模型档案 repository(sys_ai_model,P30 AI 模型控制台)。
// 配置类表,读多写少;默认档案切换的「清全表 is_default → 置该行」在 service 层用
// repository.Transaction 保证原子性,此处只提供单行/单表操作。

// AIModelRepo AI 模型档案 repository。
type AIModelRepo struct {
	BaseRepo[model.AIModel]
}

func NewAIModelRepo() *AIModelRepo { return &AIModelRepo{} }

// GetDefault 取当前生效档案(is_default=1);无生效档案返回 gorm.ErrRecordNotFound。
func (r *AIModelRepo) GetDefault(ctx context.Context) (*model.AIModel, error) {
	return r.GetOne(ctx, &QueryOptions{Where: map[string]any{"is_default": 1}})
}

// ClearDefault 事务内清空全表生效标记(调用方需在 repository.Transaction 中执行)。
func (r *AIModelRepo) ClearDefault(ctx context.Context) error {
	return DBFrom(ctx).Model(&model.AIModel{}).Where("is_default = 1").Update("is_default", 0).Error
}

// SetDefault 事务内置指定档案为生效(调用方需在 repository.Transaction 中执行)。
func (r *AIModelRepo) SetDefault(ctx context.Context, id uint) error {
	return DBFrom(ctx).Model(&model.AIModel{}).Where("id = ?", id).Update("is_default", 1).Error
}

// CountAll 统计档案条数(含已软删除,Unscoped)。判断全空表用于 env 播种幂等判断。
func (r *AIModelRepo) CountAll(ctx context.Context) (int64, error) {
	var total int64
	err := DBFrom(ctx).Unscoped().Model(&model.AIModel{}).Count(&total).Error
	return total, err
}
