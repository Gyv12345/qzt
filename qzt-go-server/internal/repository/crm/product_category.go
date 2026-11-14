package crm

import (
	"context"

	crmmodel "qzt-go-server/internal/model/crm"
	"qzt-go-server/internal/repository"
)

// product_category.go 产品分类树 repository。

type ProductCategoryRepo struct {
	repository.BaseRepo[crmmodel.CrmProductCategory]
}

func NewProductCategoryRepo() *ProductCategoryRepo { return &ProductCategoryRepo{} }

// ListAll 全量拉取(模型查询自动过滤软删),按 sort 升序、id 升序稳定排列;
// 组树在服务层内存完成,不递归查库。
func (r *ProductCategoryRepo) ListAll(ctx context.Context) ([]crmmodel.CrmProductCategory, error) {
	return r.List(ctx, &repository.QueryOptions{Order: []string{"sort ASC", "id ASC"}})
}

// HasChild 是否存在未删子节点(删父前守卫)。
func (r *ProductCategoryRepo) HasChild(ctx context.Context, parentID uint) (bool, error) {
	return r.Exists(ctx, &repository.QueryOptions{Where: map[string]any{"parent_id": parentID}})
}

// HardDeleteSoftDeletedByName 硬删同层同名软删旧行。
// (parent_id,name) 唯一索引 + 软删陷阱:同键软删旧行不硬删,重建同名必撞唯一键,
// 照 storefront 的处理,创建/改名前先清。
func (r *ProductCategoryRepo) HardDeleteSoftDeletedByName(ctx context.Context, parentID uint, name string) error {
	return repoDB(ctx).Unscoped().
		Where("deleted_at IS NOT NULL AND parent_id = ? AND name = ?", parentID, name).
		Delete(&crmmodel.CrmProductCategory{}).Error
}
