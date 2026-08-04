package repository

import (
	"context"

	"qzt-go-server/internal/model"
)

// DictRepo 字典仓储。字典与字典项为一对多，通过 DictID 关联。
type DictRepo struct {
	BaseRepo[model.SysDict]
}

func NewDictRepo() *DictRepo {
	return &DictRepo{}
}

// GetByID 覆盖通用版本，预加载字典项。
func (d *DictRepo) GetByID(ctx context.Context, id uint) (*model.SysDict, error) {
	return d.BaseRepo.GetByID(ctx, id, "Items")
}

// GetByCode 按编码查询单个字典（含字典项），用于业务侧取枚举值。
func (d *DictRepo) GetByCode(ctx context.Context, code string) (*model.SysDict, error) {
	var dict model.SysDict
	if err := dbFrom(ctx).Preload("Items", "status = ?", model.StatusEnabled).
		Where("code = ?", code).First(&dict).Error; err != nil {
		return nil, err
	}
	return &dict, nil
}

// Update 仅更新基础列；字典项由 SetItems 管理。
func (d *DictRepo) Update(ctx context.Context, dict *model.SysDict) error {
	return d.BaseRepo.Update(ctx, dict, "Name", "Code", "Status", "Remark")
}

// Delete 软删除字典并清除其字典项（级联）。
func (d *DictRepo) Delete(ctx context.Context, id uint) error {
	return Transaction(ctx, func(ctx context.Context) error {
		// 先删字典项
		if err := dbFrom(ctx).Where("dict_id = ?", id).Delete(&model.SysDictItem{}).Error; err != nil {
			return err
		}
		return dbFrom(ctx).Delete(&model.SysDict{ID: id}).Error
	})
}

// ListAll 返回全部字典（含字典项），按 sort 排序。
func (d *DictRepo) ListAll(ctx context.Context) ([]model.SysDict, error) {
	var dicts []model.SysDict
	if err := dbFrom(ctx).Preload("Items").Order("sort ASC, id ASC").Find(&dicts).Error; err != nil {
		return nil, err
	}
	return dicts, nil
}

// SetItems 用给定字典项整体替换某字典的项（先删后建，保证一致性）。
func (d *DictRepo) SetItems(ctx context.Context, dictID uint, items []model.SysDictItem) error {
	return Transaction(ctx, func(ctx context.Context) error {
		if err := dbFrom(ctx).Where("dict_id = ?", dictID).Delete(&model.SysDictItem{}).Error; err != nil {
			return err
		}
		if len(items) == 0 {
			return nil
		}
		for i := range items {
			items[i].ID = 0
			items[i].DictID = dictID
		}
		return dbFrom(ctx).Create(&items).Error
	})
}
