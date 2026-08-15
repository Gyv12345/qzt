package repository

import (
	"context"

	"qzt-go-server/internal/model"
)

// attachment.go 通用附件 repository。
// 通过 biz_type + resource_id 查询某业务实体的全部附件。

type AttachmentRepo struct {
	BaseRepo[model.SysAttachment]
}

func NewAttachmentRepo() *AttachmentRepo { return &AttachmentRepo{} }

// ListByResource 查询某业务实体(biz_type+resource_id)的全部附件,按创建时间倒序。
func (r *AttachmentRepo) ListByResource(ctx context.Context, bizType string, resourceID uint) ([]model.SysAttachment, error) {
	var list []model.SysAttachment
	err := dbFrom(ctx).
		Where("biz_type = ? AND resource_id = ?", bizType, resourceID).
		Order("id DESC").
		Find(&list).Error
	if list == nil {
		list = make([]model.SysAttachment, 0)
	}
	return list, err
}

// GetByObjectKey 按 objectKey 反查附件记录(私有文件签名下载前的归属校验用)。
func (r *AttachmentRepo) GetByObjectKey(ctx context.Context, objectKey string) (*model.SysAttachment, error) {
	var att model.SysAttachment
	if err := dbFrom(ctx).Where("object_key = ?", objectKey).First(&att).Error; err != nil {
		return nil, err
	}
	return &att, nil
}
