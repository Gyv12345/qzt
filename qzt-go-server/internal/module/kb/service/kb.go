package service

import (
	"context"
	"errors"

	kbmodel "qzt-go-server/internal/model/kb"
	kbrepo "qzt-go-server/internal/repository/kb"
	"qzt-go-server/pkg/xlogger"
)

// ── 分类服务 ──

type CategoryService struct {
	repo *kbrepo.CategoryRepo
}

func NewCategoryService() *CategoryService { return &CategoryService{repo: kbrepo.NewCategoryRepo()} }

// CreateKbCategoryRequest 创建/更新知识库分类请求。
// 注:不能用 CreateCategoryRequest——与 cms/service 的包名+类型名完全相同,
// swag 按「包名.类型名」注册会冲突,导致 cms 的注解解析失败。
type CreateKbCategoryRequest struct {
	ParentID uint   `json:"parent_id"`
	Name     string `json:"name" binding:"required"`
	Sort     int    `json:"sort"`
}

func (s *CategoryService) Create(ctx context.Context, req *CreateKbCategoryRequest, userID uint) (*kbmodel.KbCategory, error) {
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

func (s *CategoryService) Update(ctx context.Context, id uint, req *CreateKbCategoryRequest) error {
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
	ragSvc    *RAGService
}

func NewDocumentService() *DocumentService {
	return &DocumentService{
		repo:    kbrepo.NewDocumentRepo(),
		verRepo: kbrepo.NewVersionRepo(),
		ragSvc:  NewRAGService(),
	}
}

// syncRAG 文档内容变更后的 RAG 同步（P17）：失败只记日志，不阻断文档保存。
func (s *DocumentService) syncRAG(ctx context.Context, docID, userID uint) {
	if err := s.ragSvc.SyncDocument(ctx, docID, userID); err != nil {
		xlogger.ErrorfCtx(ctx, "kb rag: sync document %d failed: %v", docID, err)
	}
}

// ReindexDocument 强制重建文档向量切片（P17，重建索引按钮）。
func (s *DocumentService) ReindexDocument(ctx context.Context, docID, userID uint) (int, error) {
	return s.ragSvc.ReindexDocument(ctx, docID, userID)
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
	// P17：切片+向量化（失败不阻断保存）
	s.syncRAG(ctx, doc.ID, userID)
	return doc, nil
}

func (s *DocumentService) List(ctx context.Context, page, pageSize int, categoryID uint, keyword, status string) ([]kbmodel.KbDocument, int64, error) {
	list, total, err := s.repo.PageList(ctx, page, pageSize, categoryID, keyword, status)
	if err != nil {
		return nil, 0, err
	}
	// P17：填充切片数（一条 GROUP BY，失败不影响列表）
	docIDs := make([]uint, 0, len(list))
	for _, d := range list {
		docIDs = append(docIDs, d.ID)
	}
	if counts, err := s.ragSvc.chunkRepo.CountByDocs(ctx, docIDs); err == nil {
		for i := range list {
			list[i].ChunkCount = int(counts[list[i].ID])
		}
	}
	return list, total, nil
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
		// P17：内容变更同步切片（失败不阻断保存）
		s.syncRAG(ctx, id, editorID)
	}
	return nil
}

func (s *DocumentService) Delete(ctx context.Context, id uint) error {
	if err := s.repo.Delete(ctx, id); err != nil {
		return err
	}
	// P17：文档删除清切片（硬删）
	return s.ragSvc.chunkRepo.DeleteByDoc(ctx, id)
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
	if err := SaveSnapshot(ctx, docID, editorID, v.Content); err != nil {
		return err
	}
	// P17：回滚后内容变更，同步切片（失败不阻断回滚）
	if err := NewRAGService().SyncDocument(ctx, docID, editorID); err != nil {
		xlogger.ErrorfCtx(ctx, "kb rag: sync document %d after restore failed: %v", docID, err)
	}
	return nil
}
