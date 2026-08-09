package service

import (
	"context"
	"errors"

	kbmodel "qzt-go-server/internal/model/kb"
	kbrepo "qzt-go-server/internal/repository/kb"
)

// ── 分类服务 ──

type CategoryService struct {
	repo *kbrepo.CategoryRepo
}

func NewCategoryService() *CategoryService { return &CategoryService{repo: kbrepo.NewCategoryRepo()} }

type CreateCategoryRequest struct {
	ParentID uint   `json:"parent_id"`
	Name     string `json:"name" binding:"required"`
	Sort     int    `json:"sort"`
}

func (s *CategoryService) Create(ctx context.Context, req *CreateCategoryRequest, userID uint) (*kbmodel.KbCategory, error) {
	cat := &kbmodel.KbCategory{
		ParentID:  req.ParentID,
		Name:      req.Name,
		Sort:      req.Sort,
		Status:    1,
		CreatorID: userID,
	}
	if err := s.repo.Create(ctx, cat); err != nil {
		return nil, err
	}
	return cat, nil
}

func (s *CategoryService) ListAll(ctx context.Context) ([]kbmodel.KbCategory, error) {
	return s.repo.ListAll(ctx)
}

func (s *CategoryService) Update(ctx context.Context, id uint, req *CreateCategoryRequest) error {
	cat, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return errors.New("分类不存在")
	}
	cat.ParentID = req.ParentID
	cat.Name = req.Name
	cat.Sort = req.Sort
	return s.repo.Update(ctx, cat)
}

func (s *CategoryService) Delete(ctx context.Context, id uint) error {
	return s.repo.Delete(ctx, id)
}

// ── 文档服务 ──

type DocumentService struct {
	repo      *kbrepo.DocumentRepo
	verRepo   *kbrepo.VersionRepo
}

func NewDocumentService() *DocumentService {
	return &DocumentService{repo: kbrepo.NewDocumentRepo(), verRepo: kbrepo.NewVersionRepo()}
}

type CreateDocumentRequest struct {
	CategoryID uint   `json:"category_id"`
	Title      string `json:"title" binding:"required"`
	Content    string `json:"content"`
	Status     string `json:"status"`
}

func (s *DocumentService) Create(ctx context.Context, req *CreateDocumentRequest, userID uint) (*kbmodel.KbDocument, error) {
	if req.Status == "" {
		req.Status = "draft"
	}
	doc := &kbmodel.KbDocument{
		CategoryID: req.CategoryID,
		Title:      req.Title,
		Content:    req.Content,
		Status:     req.Status,
		CreatorID:  userID,
	}
	if err := s.repo.Create(ctx, doc); err != nil {
		return nil, err
	}
	// 创建初始版本
	SaveSnapshot(ctx, doc.ID, userID, req.Content)
	return doc, nil
}

func (s *DocumentService) List(ctx context.Context, page, pageSize int, categoryID uint, keyword, status string) ([]kbmodel.KbDocument, int64, error) {
	return s.repo.PageList(ctx, page, pageSize, categoryID, keyword, status)
}

func (s *DocumentService) GetByID(ctx context.Context, id uint) (*kbmodel.KbDocument, error) {
	doc, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, errors.New("文档不存在")
	}
	return doc, nil
}

type UpdateDocumentRequest struct {
	CategoryID uint   `json:"category_id"`
	Title      string `json:"title"`
	Content    string `json:"content"`
	Status     string `json:"status"`
}

func (s *DocumentService) Update(ctx context.Context, id uint, req *UpdateDocumentRequest, editorID uint) error {
	doc, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return errors.New("文档不存在")
	}
	doc.CategoryID = req.CategoryID
	doc.Title = req.Title
	doc.Content = req.Content
	doc.LastEditorID = &editorID
	if req.Status != "" {
		doc.Status = req.Status
	}
	if err := s.repo.Update(ctx, doc); err != nil {
		return err
	}
	// 内容变更则创建版本
	if req.Content != "" {
		SaveSnapshot(ctx, id, editorID, req.Content)
	}
	return nil
}

func (s *DocumentService) Delete(ctx context.Context, id uint) error {
	return s.repo.Delete(ctx, id)
}

// ── 版本服务 ──

type VersionService struct {
	verRepo *kbrepo.VersionRepo
}

func NewVersionService() *VersionService { return &VersionService{verRepo: kbrepo.NewVersionRepo()} }

func (s *VersionService) ListVersions(ctx context.Context, docID uint, page, pageSize int) ([]kbmodel.KbVersion, int64, error) {
	return s.verRepo.ListByDoc(ctx, docID, page, pageSize)
}

func (s *VersionService) GetVersion(ctx context.Context, id uint) (*kbmodel.KbVersion, error) {
	v, err := s.verRepo.GetByID(ctx, id)
	if err != nil {
		return nil, errors.New("版本不存在")
	}
	return v, nil
}

// Restore 回滚到指定版本。
func (s *VersionService) Restore(ctx context.Context, docID, versionID, editorID uint) error {
	v, err := s.verRepo.GetByID(ctx, versionID)
	if err != nil {
		return errors.New("版本不存在")
	}
	// 更新文档内容
	return SaveSnapshot(ctx, docID, editorID, v.Content)
}
