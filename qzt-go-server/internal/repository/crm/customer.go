package crm

import (
	"context"

	crmmodel "qzt-go-server/internal/model/crm"
	"qzt-go-server/internal/repository"
)

// customer.go 客户/联系人/协作 repository。
// 嵌入 repository.BaseRepo[T] 获得通用 CRUD;按需覆写带预加载/特定查询的方法。

// ── 客户 ──

type CustomerRepo struct {
	repository.BaseRepo[crmmodel.CrmCustomer]
}

func NewCustomerRepo() *CustomerRepo { return &CustomerRepo{} }

// GetByID 覆写:无需预加载(关联用独立查询)。
func (r *CustomerRepo) GetByID(ctx context.Context, id uint) (*crmmodel.CrmCustomer, error) {
	return r.BaseRepo.GetByID(ctx, id)
}

// Update 仅更新基础列;owner/follower 等由专门方法管理。
func (r *CustomerRepo) Update(ctx context.Context, m *crmmodel.CrmCustomer) error {
	return r.BaseRepo.Update(ctx, m,
		"Name", "CustomerNo", "Level", "Source", "Status", "Industry",
		"OwnerID", "FollowerID", "FollowTime", "InPool", "PoolID", "CollectionTime", "PoolReason")
}

// CountByOwner 统计某用户私海客户数(容量校验用)。
func (r *CustomerRepo) CountByOwner(ctx context.Context, ownerID uint) (int64, error) {
	return r.Count(ctx, &repository.QueryOptions{
		Where: map[string]interface{}{"owner_id": ownerID, "in_pool": crmmodel.InPoolPrivate},
	})
}

// ── 联系人 ──

type CustomerContactRepo struct {
	repository.BaseRepo[crmmodel.CrmCustomerContact]
}

func NewCustomerContactRepo() *CustomerContactRepo { return &CustomerContactRepo{} }

func (r *CustomerContactRepo) Update(ctx context.Context, m *crmmodel.CrmCustomerContact) error {
	return r.BaseRepo.Update(ctx, m,
		"Name", "ContactNo", "Phone", "Email", "Position", "Department", "IsKeyDecisionMaker", "Status", "Remark")
}

// ListByCustomer 按客户列联系人。
func (r *CustomerContactRepo) ListByCustomer(ctx context.Context, customerID uint) ([]crmmodel.CrmCustomerContact, error) {
	return r.List(ctx, &repository.QueryOptions{
		Where: map[string]interface{}{"customer_id": customerID},
		Order: []string{"id ASC"},
	})
}

// ── 协作 ──

type CustomerCollaborationRepo struct {
	repository.BaseRepo[crmmodel.CrmCustomerCollaboration]
}

func NewCustomerCollaborationRepo() *CustomerCollaborationRepo { return &CustomerCollaborationRepo{} }

func (r *CustomerCollaborationRepo) Update(ctx context.Context, m *crmmodel.CrmCustomerCollaboration) error {
	return r.BaseRepo.Update(ctx, m, "CollaborationType")
}

// ListByCustomer 按客户列协作成员。
func (r *CustomerCollaborationRepo) ListByCustomer(ctx context.Context, customerID uint) ([]crmmodel.CrmCustomerCollaboration, error) {
	return r.List(ctx, &repository.QueryOptions{
		Where: map[string]interface{}{"customer_id": customerID},
		Order: []string{"id ASC"},
	})
}

// IsCollaborator 判断用户是否为某客户的协作成员。
func (r *CustomerCollaborationRepo) IsCollaborator(ctx context.Context, customerID, userID uint) (bool, error) {
	return r.Exists(ctx, &repository.QueryOptions{
		Where: map[string]interface{}{"customer_id": customerID, "user_id": userID},
	})
}
