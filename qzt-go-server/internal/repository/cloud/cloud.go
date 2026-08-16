package cloud

import (
	"context"

	cloudmodel "qzt-go-server/internal/model/cloud"
	"qzt-go-server/internal/repository"
)

// CloudRepo 网盘 repository。
type CloudRepo struct {
	repository.BaseRepo[cloudmodel.CloudFile]
}

func NewCloudRepo() *CloudRepo { return &CloudRepo{} }

// ListByParent 查某文件夹下的子项(按权限过滤)。
// scope=personal: owner_id = userID
// scope=dept: dept_id = userDeptID
// scope=public: 全部公共
func (r *CloudRepo) ListByParent(ctx context.Context, parentID uint, scope string, userID, deptID uint) ([]cloudmodel.CloudFile, error) {
	var list []cloudmodel.CloudFile
	q := repository.DBFrom(ctx).Where("parent_id = ? AND status = 1", parentID)
	switch scope {
	case cloudmodel.ScopePersonal:
		q = q.Where("scope = ? AND owner_id = ?", scope, userID)
	case cloudmodel.ScopeDept:
		q = q.Where("scope = ? AND dept_id = ?", scope, deptID)
	case cloudmodel.ScopePublic:
		q = q.Where("scope = ?", scope)
	}
	err := q.Order("is_dir DESC, id DESC").Find(&list).Error
	return list, err
}

// CountByOwner 统计用户个人空间已用大小。
func (r *CloudRepo) CountByOwner(ctx context.Context, userID uint) (int64, error) {
	var total int64
	err := repository.DBFrom(ctx).Model(&cloudmodel.CloudFile{}).
		Where("owner_id = ? AND scope = ? AND is_dir = 0 AND status = 1", userID, cloudmodel.ScopePersonal).
		Select("COALESCE(SUM(size), 0)").Scan(&total).Error
	return total, err
}

func (r *CloudRepo) Update(ctx context.Context, m *cloudmodel.CloudFile) error {
	return r.BaseRepo.Update(ctx, m, "ParentID", "Name", "ObjectKey", "URL", "Size", "ContentType", "Scope", "OwnerID", "DeptID", "Status")
}

// ListActiveChildren 查文件夹下未删除(status=1)的子项(递归删除用)。
func (r *CloudRepo) ListActiveChildren(ctx context.Context, parentID uint) ([]cloudmodel.CloudFile, error) {
	var children []cloudmodel.CloudFile
	err := repository.DBFrom(ctx).Where("parent_id = ? AND status = 1", parentID).Find(&children).Error
	return children, err
}
