package cloud

import (
	"context"

	"gorm.io/gorm"

	cloudmodel "qzt-go-server/internal/model/cloud"
	"qzt-go-server/internal/repository"
	"qzt-go-server/pkg/xtime"
)

// CloudShareRepo 网盘分享 repository。
type CloudShareRepo struct {
	repository.BaseRepo[cloudmodel.CloudShare]
}

func NewCloudShareRepo() *CloudShareRepo { return &CloudShareRepo{} }

// ShareListItem 分享列表行(联 cloud_file 取文件名/大小)。
type ShareListItem struct {
	ID            uint           `json:"id"`
	FileID        uint           `json:"file_id"`
	FileName      string         `json:"file_name"`
	FileSize      int64          `json:"file_size"`
	Token         string         `json:"token"`
	ExtractCode   string         `json:"extract_code"`
	ExpireAt      xtime.DateTime `json:"expire_at"`
	Disabled      int8           `json:"disabled"`
	DownloadCount int            `json:"download_count"`
	CreatedAt     xtime.DateTime `json:"created_at"`
}

// GetByToken 按令牌查询分享(未删除)。
func (r *CloudShareRepo) GetByToken(ctx context.Context, token string) (*cloudmodel.CloudShare, error) {
	var share cloudmodel.CloudShare
	err := repository.DBFrom(ctx).Where("token = ?", token).First(&share).Error
	if err != nil {
		return nil, err
	}
	return &share, nil
}

// CountActiveByOwner 统计用户未取消的活跃分享数(上限校验用)。
func (r *CloudShareRepo) CountActiveByOwner(ctx context.Context, ownerID uint) (int64, error) {
	var total int64
	err := repository.DBFrom(ctx).Model(&cloudmodel.CloudShare{}).
		Where("owner_id = ? AND disabled = 0", ownerID).
		Count(&total).Error
	return total, err
}

// ListByOwner 我创建的分享分页(联 cloud_file 取文件名/大小)。
func (r *CloudShareRepo) ListByOwner(ctx context.Context, ownerID uint, page, pageSize int) ([]ShareListItem, int64, error) {
	var total int64
	if err := repository.DBFrom(ctx).Model(&cloudmodel.CloudShare{}).
		Where("owner_id = ?", ownerID).
		Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var list []ShareListItem
	offset := (page - 1) * pageSize
	err := repository.DBFrom(ctx).
		Table("cloud_share AS s").
		Joins("JOIN cloud_file AS f ON f.id = s.file_id AND f.deleted_at IS NULL").
		Where("s.owner_id = ? AND s.deleted_at IS NULL", ownerID).
		Select("s.id, s.file_id, f.name AS file_name, f.size AS file_size, s.token, s.extract_code, s.expire_at, s.disabled, s.download_count, s.created_at").
		Order("s.id DESC").
		Offset(offset).Limit(pageSize).
		Scan(&list).Error
	return list, total, err
}

// Cancel 取消分享(置 disabled=1,不物理删除)。
func (r *CloudShareRepo) Cancel(ctx context.Context, id uint) error {
	return repository.DBFrom(ctx).Model(&cloudmodel.CloudShare{}).
		Where("id = ?", id).
		Update("disabled", 1).Error
}

// IncrDownload 下载次数 +1(不触发 updated_at 语义变更)。
func (r *CloudShareRepo) IncrDownload(ctx context.Context, id uint) error {
	return repository.DBFrom(ctx).Model(&cloudmodel.CloudShare{}).
		Where("id = ?", id).
		UpdateColumn("download_count", gorm.Expr("download_count + 1")).Error
}
