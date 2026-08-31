package crm

import (
	"context"

	"gorm.io/gorm"

	crmmodel "qzt-go-server/internal/model/crm"
	"qzt-go-server/internal/pkg/datascope"
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
		Where: map[string]any{"owner_id": ownerID, "in_pool": crmmodel.InPoolPrivate},
	})
}

// CountByNoPrefix 统计 customer_no LIKE 前缀% 且非空的记录数(自动编号规则 KH 推算用)。
func (r *CustomerRepo) CountByNoPrefix(ctx context.Context, prefix string) (int64, error) {
	var n int64
	err := repoDB(ctx).Unscoped().Model(&crmmodel.CrmCustomer{}).
		Where("customer_no LIKE ?", prefix+"%").
		Where("customer_no != ''").
		Count(&n).Error
	return n, err
}

// CountRefsByColumn 统计业务表中指向某 ID 的未删除引用数(删除保护校验用)。
// table/column 来自服务端常量表(customerRefTables/leadRefTables),非客户端输入。
func CountRefsByColumn(ctx context.Context, table, column string, id uint) (int64, error) {
	var n int64
	err := repoDB(ctx).Table(table).
		Where(column+" = ?", id).
		Where("deleted_at IS NULL").
		Count(&n).Error
	return n, err
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

// CountByNoPrefix 统计 contact_no LIKE 前缀% 且非空的记录数(自动编号规则 LXR 推算用)。
func (r *CustomerContactRepo) CountByNoPrefix(ctx context.Context, prefix string) (int64, error) {
	var n int64
	err := repoDB(ctx).Unscoped().Model(&crmmodel.CrmCustomerContact{}).
		Where("contact_no LIKE ?", prefix+"%").
		Where("contact_no != ''").
		Count(&n).Error
	return n, err
}

// ListByCustomer 按客户列联系人。
func (r *CustomerContactRepo) ListByCustomer(ctx context.Context, customerID uint) ([]crmmodel.CrmCustomerContact, error) {
	return r.List(ctx, &repository.QueryOptions{
		Where: map[string]any{"customer_id": customerID},
		Order: []string{"id ASC"},
	})
}

// ContactListRow 联系人列表行(含客户名)。
type ContactListRow struct {
	crmmodel.CrmCustomerContact
	CustomerName string `json:"customer_name"`
}

// PageListAll 全局联系人分页(跨客户,关键词搜姓名/电话/邮箱,带客户名)。
// 叠加数据权限:沿所属客户的负责人过滤;公海客户(owner 为 NULL)的联系人保持可见。
func (r *CustomerContactRepo) PageListAll(ctx context.Context, page, pageSize int, keyword, customerID string) ([]ContactListRow, int64, error) {
	db := repository.DBFrom(ctx).Table("crm_customer_contact AS c").
		Select("c.*, cust.name AS customer_name").
		Joins("LEFT JOIN crm_customer AS cust ON cust.id = c.customer_id").
		Where("c.deleted_at IS NULL")

	if cond := datascope.BuildCond(ctx, "cust.owner_id"); cond != nil {
		db = db.Where("("+cond.Query+" OR cust.owner_id IS NULL)", cond.Args...)
	}

	if keyword != "" {
		like := "%" + keyword + "%"
		db = db.Where("c.name LIKE ? OR c.phone LIKE ? OR c.email LIKE ? OR c.position LIKE ?", like, like, like, like)
	}
	if customerID != "" {
		db = db.Where("c.customer_id = ?", customerID)
	}

	var total int64
	if err := db.Session(&gorm.Session{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var rows []ContactListRow
	if err := db.Order("c.id DESC").
		Offset((page - 1) * pageSize).Limit(pageSize).
		Scan(&rows).Error; err != nil {
		return nil, 0, err
	}
	return rows, total, nil
}

// ── 协作 ──

// ListByIDs 按客户 ID 集合批量查(含已软删,商机等关联展示兜底)。
func (r *CustomerRepo) ListByIDs(ctx context.Context, ids []uint) ([]crmmodel.CrmCustomer, error) {
	if len(ids) == 0 {
		return nil, nil
	}
	var list []crmmodel.CrmCustomer
	if err := repository.DBFrom(ctx).Unscoped().Where("id IN ?", ids).Find(&list).Error; err != nil {
		return nil, err
	}
	return list, nil
}
