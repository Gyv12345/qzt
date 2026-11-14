package cloud

import (
	"context"
	"strings"

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

// ── 管理端例外查询(系统管理-文件存储页) ──
// repository 是全局共享层;以下两个方法为管理员跨用户全量视角的例外查询,
// 不走网盘个人/部门权限过滤,仅由 system/storage_config 服务调用。

// AdminFileRow 管理端文件列表行(联 sys_user 带上传人昵称)。
type AdminFileRow struct {
	cloudmodel.CloudFile
	// 上传人昵称(LEFT JOIN,用户已删除时为空串)
	UploaderName string `gorm:"column:uploader_name" json:"uploader_name"`
}

// ListAdminFiles 分页列出 cloud_file 全量文件(管理员视角,跨用户)。
// keyword 模糊匹配文件名;只列文件(排除文件夹)且状态正常。
func (r *CloudRepo) ListAdminFiles(ctx context.Context, keyword string, page, pageSize int) ([]AdminFileRow, int64, error) {
	db := repository.DBFrom(ctx).Model(&cloudmodel.CloudFile{}).
		Select("cloud_file.*, u.nickname AS uploader_name").
		Joins("LEFT JOIN sys_user u ON u.id = cloud_file.creator_id").
		Where("cloud_file.is_dir = 0 AND cloud_file.status = 1")
	if kw := strings.TrimSpace(keyword); kw != "" {
		db = db.Where("cloud_file.name LIKE ?", "%"+kw+"%")
	}
	var total int64
	if err := db.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var rows []AdminFileRow
	if err := db.Order("cloud_file.id DESC").
		Offset((page - 1) * pageSize).Limit(pageSize).
		Find(&rows).Error; err != nil {
		return nil, 0, err
	}
	return rows, total, nil
}
