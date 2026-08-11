package repository

// homepage_config.go CMS 首页板块配置 repository。
// module 表 3 行固定数据(产品/合作伙伴/团队);feature 表存精选条目。

import (
	"context"

	"qzt-go-server/internal/model"
)

// ── 板块开关 ──

type HomepageModuleRepo struct {
	BaseRepo[model.CmsHomepageModule]
}

func NewHomepageModuleRepo() *HomepageModuleRepo { return &HomepageModuleRepo{} }

// ListAll 返回全部板块(按 sort 排序)。
func (r *HomepageModuleRepo) ListAll(ctx context.Context) ([]model.CmsHomepageModule, error) {
	return r.List(ctx, &QueryOptions{Order: []string{"sort ASC", "id ASC"}})
}

// GetByModule 按模块标识查板块。
func (r *HomepageModuleRepo) GetByModule(ctx context.Context, module string) (*model.CmsHomepageModule, error) {
	return r.GetOne(ctx, &QueryOptions{Where: map[string]interface{}{"module": module}})
}

// SetEnabled 更新板块开关。
func (r *HomepageModuleRepo) SetEnabled(ctx context.Context, module string, enabled bool) error {
	db := dbFrom(ctx).Model(&model.CmsHomepageModule{}).Where("module = ?", module)
	return db.Update("enabled", enabled).Error
}

// ── 精选条目 ──

type HomepageFeatureRepo struct {
	BaseRepo[model.CmsHomepageFeature]
}

func NewHomepageFeatureRepo() *HomepageFeatureRepo { return &HomepageFeatureRepo{} }

// ListByModule 按模块查精选条目(按 sort 排序)。
func (r *HomepageFeatureRepo) ListByModule(ctx context.Context, module string) ([]model.CmsHomepageFeature, error) {
	return r.List(ctx, &QueryOptions{
		Where: map[string]interface{}{"module": module},
		Order: []string{"sort ASC", "id ASC"},
	})
}

// Sync 全量替换某模块的精选条目(事务内先删后插)。
func (r *HomepageFeatureRepo) Sync(ctx context.Context, module string, itemIDs []uint) error {
	db := dbFrom(ctx)
	// 先硬删除该模块全部精选(不用软删除, 否则唯一索引(module,item_id)冲突)
	if err := db.Unscoped().Where("module = ?", module).Delete(&model.CmsHomepageFeature{}).Error; err != nil {
		return err
	}
	// 再批量插入
	for i, itemID := range itemIDs {
		f := &model.CmsHomepageFeature{Module: module, ItemID: itemID, Sort: i}
		if err := db.Create(f).Error; err != nil {
			return err
		}
	}
	return nil
}
