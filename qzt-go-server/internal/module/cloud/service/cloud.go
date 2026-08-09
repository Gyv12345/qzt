package service

import (
	"context"
	"errors"

	cloudmodel "qzt-go-server/internal/model/cloud"
	cloudrepo "qzt-go-server/internal/repository/cloud"
	"qzt-go-server/internal/repository"
)

// CloudService 网盘服务。
type CloudService struct {
	repo *cloudrepo.CloudRepo
}

func NewCloudService() *CloudService { return &CloudService{repo: cloudrepo.NewCloudRepo()} }

// List 列出文件夹内容。
func (s *CloudService) List(ctx context.Context, parentID uint, scope string, userID, deptID uint) ([]cloudmodel.CloudFile, error) {
	return s.repo.ListByParent(ctx, parentID, scope, userID, deptID)
}

type CreateFolderRequest struct {
	ParentID uint   `json:"parent_id"`
	Name     string `json:"name" binding:"required"`
	Scope    string `json:"scope"`
}

// CreateFolder 创建文件夹。
func (s *CloudService) CreateFolder(ctx context.Context, req *CreateFolderRequest, userID uint, deptID uint) (*cloudmodel.CloudFile, error) {
	if req.Scope == "" {
		req.Scope = cloudmodel.ScopePersonal
	}
	folder := &cloudmodel.CloudFile{
		ParentID:  req.ParentID,
		Name:      req.Name,
		IsDir:     1,
		Scope:     req.Scope,
		CreatorID: userID,
		Status:    1,
	}
	switch req.Scope {
	case cloudmodel.ScopePersonal:
		folder.OwnerID = &userID
	case cloudmodel.ScopeDept:
		folder.DeptID = &deptID
	}
	if err := s.repo.Create(ctx, folder); err != nil {
		return nil, err
	}
	return folder, nil
}

type CreateFileRequest struct {
	ParentID    uint   `json:"parent_id"`
	Name        string `json:"name" binding:"required"`
	ObjectKey   string `json:"object_key"`
	URL         string `json:"url"`
	Size        int64  `json:"size"`
	ContentType string `json:"content_type"`
	Scope       string `json:"scope"`
}

// CreateFile 创建文件记录(上传走已有 /api/upload,这里只存元数据)。
func (s *CloudService) CreateFile(ctx context.Context, req *CreateFileRequest, userID uint, deptID uint) (*cloudmodel.CloudFile, error) {
	if req.Scope == "" {
		req.Scope = cloudmodel.ScopePersonal
	}
	file := &cloudmodel.CloudFile{
		ParentID:    req.ParentID,
		Name:        req.Name,
		IsDir:       0,
		ObjectKey:   req.ObjectKey,
		URL:         req.URL,
		Size:        req.Size,
		ContentType: req.ContentType,
		Scope:       req.Scope,
		CreatorID:   userID,
		Status:      1,
	}
	switch req.Scope {
	case cloudmodel.ScopePersonal:
		file.OwnerID = &userID
	case cloudmodel.ScopeDept:
		file.DeptID = &deptID
	}
	if err := s.repo.Create(ctx, file); err != nil {
		return nil, err
	}
	return file, nil
}

type UpdateFileRequest struct {
	Name     string `json:"name"`
	ParentID uint   `json:"parent_id"`
}

// Update 重命名/移动文件。
func (s *CloudService) Update(ctx context.Context, id uint, req *UpdateFileRequest, userID uint) error {
	file, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return errors.New("文件不存在")
	}
	// 权限校验:个人空间只能操作自己的,公共/部门需要是创建者
	if file.Scope == cloudmodel.ScopePersonal && file.OwnerID != nil && *file.OwnerID != userID {
		return errors.New("无权操作他人文件")
	}
	if req.Name != "" {
		file.Name = req.Name
	}
	if req.ParentID > 0 {
		file.ParentID = req.ParentID
	}
	return s.repo.Update(ctx, file)
}

// Delete 删除文件(软删除)。
func (s *CloudService) Delete(ctx context.Context, id uint, userID uint) error {
	file, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return errors.New("文件不存在")
	}
	if file.Scope == cloudmodel.ScopePersonal && file.OwnerID != nil && *file.OwnerID != userID {
		return errors.New("无权删除他人文件")
	}
	// 文件夹:递归删除子项
	if file.IsDir == 1 {
		s.deleteRecursive(ctx, id)
	}
	return s.repo.Delete(ctx, id)
}

// deleteRecursive 递归软删除文件夹下所有子项。
func (s *CloudService) deleteRecursive(ctx context.Context, parentID uint) {
	var children []cloudmodel.CloudFile
	repository.DBFrom(ctx).Where("parent_id = ? AND status = 1", parentID).Find(&children)
	for _, child := range children {
		if child.IsDir == 1 {
			s.deleteRecursive(ctx, child.ID)
		}
		s.repo.Delete(ctx, child.ID)
	}
}

// GetUsage 获取用户个人空间已用大小。
func (s *CloudService) GetUsage(ctx context.Context, userID uint) (int64, error) {
	return s.repo.CountByOwner(ctx, userID)
}
