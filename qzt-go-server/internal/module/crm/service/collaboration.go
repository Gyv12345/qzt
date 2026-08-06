package service

import (
	"context"
	"errors"

	crmmodel "qzt-go-server/internal/model/crm"
	"qzt-go-server/internal/repository"
	crrepo "qzt-go-server/internal/repository/crm"
)

// collaboration.go 客户团队协作服务。

type CollaborationService struct {
	repo *crrepo.CustomerCollaborationRepo
}

func NewCollaborationService() *CollaborationService {
	return &CollaborationService{repo: crrepo.NewCustomerCollaborationRepo()}
}

// CollaborationMember 协作成员(含用户名)。
type CollaborationMember struct {
	crmmodel.CrmCustomerCollaboration
	Nickname string `json:"nickname"`
	Username string `json:"username"`
}

// userBrief 用户简表(批量查名用)。
type userBrief struct {
	ID       uint   `gorm:"column:id"`
	Nickname string `gorm:"column:nickname"`
	Username string `gorm:"column:username"`
}

// List 列出客户的协作成员(含用户名)。
func (s *CollaborationService) List(ctx context.Context, customerID uint) ([]CollaborationMember, error) {
	items, err := s.repo.ListByCustomer(ctx, customerID)
	if err != nil {
		return nil, err
	}
	members := make([]CollaborationMember, 0, len(items))
	if len(items) == 0 {
		return members, nil
	}

	// 收集 userID 批量查用户名。
	userIDs := make([]uint, 0, len(items))
	for _, it := range items {
		userIDs = append(userIDs, it.UserID)
	}
	userMap := make(map[uint]userBrief, len(userIDs))
	var users []userBrief
	if err := repository.DBFrom(ctx).Table("sys_user").
		Select("id, nickname, username").
		Where("id IN ?", userIDs).
		Scan(&users).Error; err != nil {
		return nil, err
	}
	for _, u := range users {
		userMap[u.ID] = u
	}

	for _, it := range items {
		m := CollaborationMember{CrmCustomerCollaboration: it}
		if u, ok := userMap[it.UserID]; ok {
			m.Nickname = u.Nickname
			m.Username = u.Username
		}
		members = append(members, m)
	}
	return members, nil
}

// AddCollaboratorRequest 添加协作成员请求。
type AddCollaboratorRequest struct {
	UserID            uint   `json:"user_id" binding:"required"`
	CollaborationType string `json:"collaboration_type" binding:"required"` // READ_ONLY / COLLABORATION
}

// Add 添加协作成员。
func (s *CollaborationService) Add(ctx context.Context, customerID uint, req *AddCollaboratorRequest) error {
	if req.CollaborationType != crmmodel.CollaborationReadOnly && req.CollaborationType != crmmodel.CollaborationCollaboration {
		return errors.New("协作类型非法")
	}
	exists, err := s.repo.IsCollaborator(ctx, customerID, req.UserID)
	if err != nil {
		return err
	}
	if exists {
		return errors.New("该用户已是协作成员")
	}
	c := &crmmodel.CrmCustomerCollaboration{
		CustomerID:        customerID,
		UserID:            req.UserID,
		CollaborationType: req.CollaborationType,
	}
	return s.repo.Create(ctx, c)
}

// UpdateCollaboratorRequest 更新协作成员请求。
type UpdateCollaboratorRequest struct {
	CollaborationType string `json:"collaboration_type" binding:"required"`
}

// Update 更新协作成员权限。
func (s *CollaborationService) Update(ctx context.Context, id uint, req *UpdateCollaboratorRequest) error {
	if req.CollaborationType != crmmodel.CollaborationReadOnly && req.CollaborationType != crmmodel.CollaborationCollaboration {
		return errors.New("协作类型非法")
	}
	c, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return notFoundOr(err, "协作成员不存在")
	}
	c.CollaborationType = req.CollaborationType
	return s.repo.Update(ctx, c)
}

// Delete 移除协作成员。
func (s *CollaborationService) Delete(ctx context.Context, id uint) error {
	return s.repo.Delete(ctx, id)
}
