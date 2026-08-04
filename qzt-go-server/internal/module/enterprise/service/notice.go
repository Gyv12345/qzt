package service

import (
	"context"
	"errors"

	"gorm.io/gorm"

	entmodel "qzt-go-server/internal/model/enterprise"
	entrepo "qzt-go-server/internal/repository/enterprise"
)

// notice.go 公告服务。
// 草稿/发布/撤回,已发布列表(首页公告流)。

// NoticeService 公告服务。
type NoticeService struct {
	repo *entrepo.NoticeRepo
}

func NewNoticeService() *NoticeService { return &NoticeService{repo: entrepo.NewNoticeRepo()} }

// CreateNoticeRequest 创建公告请求。
type CreateNoticeRequest struct {
	Title   string `json:"title" binding:"required"`
	Content string `json:"content"`
	Type    int8   `json:"type"`
}

// Create 创建公告(默认草稿)。
func (s *NoticeService) Create(ctx context.Context, req *CreateNoticeRequest) (*entmodel.SysNotice, error) {
	noticeType := req.Type
	if noticeType == 0 {
		noticeType = entmodel.NoticeTypeNotice
	}
	n := &entmodel.SysNotice{
		Title:   req.Title,
		Content: req.Content,
		Type:    noticeType,
		Status:  entmodel.NoticeStatusDraft,
	}
	if err := s.repo.Create(ctx, n); err != nil {
		return nil, err
	}
	return n, nil
}

// GetByID 公告详情。
func (s *NoticeService) GetByID(ctx context.Context, id uint) (*entmodel.SysNotice, error) {
	n, err := s.repo.GetByID(ctx, id)
	return n, notFoundOr(err, "公告不存在")
}

// UpdateNoticeRequest 更新公告请求。
type UpdateNoticeRequest struct {
	Title   string `json:"title" binding:"required"`
	Content string `json:"content"`
	Type    int8   `json:"type"`
}

// Update 更新公告(仅草稿可改)。
func (s *NoticeService) Update(ctx context.Context, id uint, req *UpdateNoticeRequest) error {
	n, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return notFoundOr(err, "公告不存在")
	}
	n.Title = req.Title
	n.Content = req.Content
	if req.Type > 0 {
		n.Type = req.Type
	}
	return s.repo.Update(ctx, n)
}

// Delete 删除公告。
func (s *NoticeService) Delete(ctx context.Context, id uint) error {
	if _, err := s.repo.GetByID(ctx, id); err != nil {
		return notFoundOr(err, "公告不存在")
	}
	return s.repo.Delete(ctx, id)
}

// Publish 发布公告。
func (s *NoticeService) Publish(ctx context.Context, id uint) error {
	n, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return notFoundOr(err, "公告不存在")
	}
	if n.Status == entmodel.NoticeStatusPublish {
		return errors.New("公告已发布")
	}
	return s.repo.Publish(ctx, id)
}

// Withdraw 撤回公告。
func (s *NoticeService) Withdraw(ctx context.Context, id uint) error {
	n, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return notFoundOr(err, "公告不存在")
	}
	if n.Status == entmodel.NoticeStatusDraft {
		return errors.New("公告已是草稿状态")
	}
	return s.repo.Withdraw(ctx, id)
}

// List 分页查询公告(管理端)。
func (s *NoticeService) List(ctx context.Context, page, pageSize int, title string, noticeType, status int8) ([]entmodel.SysNotice, int64, error) {
	return s.repo.PageList(ctx, page, pageSize, title, noticeType, status)
}

// FindPublished 已发布列表(首页公告流)。
func (s *NoticeService) FindPublished(ctx context.Context, noticeType int8, limit int) ([]entmodel.SysNotice, error) {
	return s.repo.FindPublished(ctx, noticeType, limit)
}

// notFoundOr 把 gorm.ErrRecordNotFound 翻译为友好消息。
func notFoundOr(err error, notFoundMsg string) error {
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return errors.New(notFoundMsg)
	}
	return err
}
