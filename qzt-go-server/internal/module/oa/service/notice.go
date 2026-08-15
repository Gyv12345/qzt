package service

import (
	"context"
	"errors"

	oamodel "qzt-go-server/internal/model/oa"
	"qzt-go-server/internal/repository"
	oarepo "qzt-go-server/internal/repository/oa"
)

// notice.go OA 公告服务(从 enterprise 迁移)。

type NoticeService struct {
	repo *oarepo.NoticeRepo
}

func NewNoticeService() *NoticeService { return &NoticeService{repo: oarepo.NewNoticeRepo()} }

type CreateNoticeRequest struct {
	Title   string `json:"title" binding:"required"`
	Content string `json:"content"`
	Type    int8   `json:"type"`
}

func (s *NoticeService) Create(ctx context.Context, req *CreateNoticeRequest) (*oamodel.OaNotice, error) {
	noticeType := req.Type
	if noticeType == 0 {
		noticeType = oamodel.NoticeTypeNotice
	}
	n := &oamodel.OaNotice{
		Title:   req.Title,
		Content: req.Content,
		Type:    noticeType,
		Status:  oamodel.NoticeStatusDraft,
	}
	if err := s.repo.Create(ctx, n); err != nil {
		return nil, err
	}
	return n, nil
}

func (s *NoticeService) GetByID(ctx context.Context, id uint) (*oamodel.OaNotice, error) {
	n, err := s.repo.GetByID(ctx, id)
	return n, repository.NotFoundOr(err, "公告不存在")
}

type UpdateNoticeRequest struct {
	Title   string `json:"title" binding:"required"`
	Content string `json:"content"`
	Type    int8   `json:"type"`
}

func (s *NoticeService) Update(ctx context.Context, id uint, req *UpdateNoticeRequest) error {
	n, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return repository.NotFoundOr(err, "公告不存在")
	}
	n.Title = req.Title
	n.Content = req.Content
	if req.Type > 0 {
		n.Type = req.Type
	}
	return s.repo.Update(ctx, n)
}

func (s *NoticeService) Delete(ctx context.Context, id uint) error {
	if _, err := s.repo.GetByID(ctx, id); err != nil {
		return repository.NotFoundOr(err, "公告不存在")
	}
	return s.repo.Delete(ctx, id)
}

func (s *NoticeService) Publish(ctx context.Context, id uint) error {
	n, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return repository.NotFoundOr(err, "公告不存在")
	}
	if n.Status == oamodel.NoticeStatusPublish {
		return errors.New("公告已发布")
	}
	return s.repo.Publish(ctx, id)
}

func (s *NoticeService) Withdraw(ctx context.Context, id uint) error {
	n, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return repository.NotFoundOr(err, "公告不存在")
	}
	if n.Status == oamodel.NoticeStatusDraft {
		return errors.New("公告已是草稿状态")
	}
	return s.repo.Withdraw(ctx, id)
}

func (s *NoticeService) List(ctx context.Context, page, pageSize int, title string, noticeType, status int8) ([]oamodel.OaNotice, int64, error) {
	return s.repo.PageList(ctx, page, pageSize, title, noticeType, status)
}

func (s *NoticeService) FindPublished(ctx context.Context, noticeType int8, limit int) ([]oamodel.OaNotice, error) {
	return s.repo.FindPublished(ctx, noticeType, limit)
}
