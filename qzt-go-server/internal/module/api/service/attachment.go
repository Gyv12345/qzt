package service

import (
	"context"
	"errors"
	"strings"

	"qzt-go-server/internal/model"
	"qzt-go-server/internal/pkg/storage"
	"qzt-go-server/internal/repository"
)

// attachment.go 通用附件 service。
// 文件本身的上传/下载由 api.handler.UploadHandler 负责(走 Uploader 双桶),
// 本 service 只负责附件元数据的 CRUD(记录 biz_type+resource_id 与文件的关联)。

// AttachmentService 附件元数据服务。
type AttachmentService struct {
	repo *repository.AttachmentRepo
}

func NewAttachmentService() *AttachmentService {
	return &AttachmentService{repo: repository.NewAttachmentRepo()}
}

// CreateAttachmentRequest 创建附件记录请求。
// 前端先调 /api/upload 或 /api/upload/sts 完成文件上传,拿到 URL/objectKey 后再调本接口落库。
type CreateAttachmentRequest struct {
	BizType     string `json:"biz_type" binding:"required"`
	ResourceID  uint   `json:"resource_id" binding:"required"`
	FileName    string `json:"file_name" binding:"required"`
	ObjectKey   string `json:"object_key"`
	URL         string `json:"url" binding:"required"`
	Size        int64  `json:"size"`
	ContentType string `json:"content_type"`
	Visibility  string `json:"visibility"` // 留空默认 private
}

// List 查询某业务实体的全部附件。
func (s *AttachmentService) List(ctx context.Context, bizType string, resourceID uint) ([]model.SysAttachment, error) {
	if strings.TrimSpace(bizType) == "" || resourceID == 0 {
		return []model.SysAttachment{}, nil
	}
	return s.repo.ListByResource(ctx, bizType, resourceID)
}

// Create 落库一条附件记录。uploaderID 为当前登录用户。
func (s *AttachmentService) Create(ctx context.Context, req *CreateAttachmentRequest, uploaderID uint) (*model.SysAttachment, error) {
	visibility := strings.TrimSpace(req.Visibility)
	if visibility == "" {
		visibility = storage.VisibilityPrivate
	}
	if visibility != storage.VisibilityPublic && visibility != storage.VisibilityPrivate {
		return nil, errors.New("visibility 只能是 public 或 private")
	}

	att := &model.SysAttachment{
		BizType:     strings.ToUpper(strings.TrimSpace(req.BizType)),
		ResourceID:  req.ResourceID,
		FileName:    req.FileName,
		ObjectKey:   req.ObjectKey,
		URL:         req.URL,
		Size:        req.Size,
		ContentType: req.ContentType,
		Visibility:  visibility,
		UploaderID:  uploaderID,
	}
	if att.ObjectKey == "" {
		att.ObjectKey = att.URL // 兜底:公共桶场景 URL 即 objectKey 路径
	}
	if err := s.repo.Create(ctx, att); err != nil {
		return nil, err
	}
	return att, nil
}

// Delete 删除附件记录(仅上传人或超管可删)。
// 注意:本方法只删数据库记录,不删存储层的实际文件(留作后续异步清理)。
func (s *AttachmentService) Delete(ctx context.Context, id, operatorID uint, isSuperAdmin bool) error {
	att, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return notFoundOr(err, "附件不存在")
	}
	if !isSuperAdmin && att.UploaderID != operatorID {
		return errors.New("无权删除他人上传的附件")
	}
	return s.repo.Delete(ctx, id)
}
