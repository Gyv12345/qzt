package repository

// homepage_config.go CMS 首页板块配置 repository。
// module 表 3 行固定数据(产品/合作伙伴/团队);feature 表存精选条目。

import (
	"context"

	"qzt-go-server/internal/model"
)

// ── 板块开关 ──

type HomepageModuleRepo struct {
	BaseRepo[model.CmsHomepageModule]
}

func NewHomepageModuleRepo() *HomepageModuleRepo { return &HomepageModuleRepo{} }

// ListAll 返回全部板块(按 sort 排序)。
func (r *HomepageModuleRepo) ListAll(ctx context.Context) ([]model.CmsHomepageModule, error) {
	return r.List(ctx, &QueryOptions{Order: []string{"sort ASC", "id ASC"}})
}

// SetEnabled 更新板块开关。
func (r *HomepageModuleRepo) SetEnabled(ctx context.Context, module string, enabled bool) error {
	db := dbFrom(ctx).Model(&model.CmsHomepageModule{}).Where("module = ?", module)
	return db.Update("enabled", enabled).Error
}

// ── 精选条目 ──

type HomepageFeatureRepo struct {
	BaseRepo[model.CmsHomepageFeature]
}

func NewHomepageFeatureRepo() *HomepageFeatureRepo { return &HomepageFeatureRepo{} }

// ListByModule 按模块查精选条目(按 sort 排序)。
func (r *HomepageFeatureRepo) ListByModule(ctx context.Context, module string) ([]model.CmsHomepageFeature, error) {
	return r.List(ctx, &QueryOptions{
		Where: map[string]any{"module": module},
		Order: []string{"sort ASC", "id ASC"},
	})
}

// Sync 全量替换某模块的精选条目(事务内先删后插)。
func (r *HomepageFeatureRepo) Sync(ctx context.Context, module string, itemIDs []uint) error {
	db := dbFrom(ctx)
	// 先硬删除该模块全部精选(不用软删除, 否则唯一索引(module,item_id)冲突)
	if err := db.Unscoped().Where("module = ?", module).Delete(&model.CmsHomepageFeature{}).Error; err != nil {
		return err
	}
	// 再批量插入
	for i, itemID := range itemIDs {
		f := &model.CmsHomepageFeature{Module: module, ItemID: itemID, Sort: i}
		if err := db.Create(f).Error; err != nil {
			return err
		}
	}
	return nil
}

// ── 精选条目关联的业务表查询(product/partner/team 三类) ──
// 首页配置横跨 crm_product/crm_customer/sys_user,统一收口在本文件;
// 行结构在此定义,条目映射/按精选顺序重排留在 service 层。

// HomepageProductRow 产品行。
type HomepageProductRow struct {
	ID          uint
	Name        string
	ImageURL    string
	Description string
	Category    string
}

// HomepagePartnerRow 合作伙伴行(crm_customer)。
type HomepagePartnerRow struct {
	ID       uint
	Name     string
	Level    string
	Industry string
	Source   string
}

// HomepageTeamRow 团队成员行(sys_user)。
type HomepageTeamRow struct {
	ID       uint
	Nickname string
	Avatar   string
}

// HomepageItemRepo 首页精选条目的业务表查询。
type HomepageItemRepo struct{}

func NewHomepageItemRepo() *HomepageItemRepo { return &HomepageItemRepo{} }

// GetProductInfo 取产品名称 + 分类(单条,admin 表格展示用)。
func (r *HomepageItemRepo) GetProductInfo(ctx context.Context, id uint) (HomepageProductRow, error) {
	var row HomepageProductRow
	err := dbFrom(ctx).Table("crm_product").Select("name, category").Where("id = ?", id).Scan(&row).Error
	return row, err
}

// GetPartnerInfo 取客户名称 + 等级(单条,admin 表格展示用)。
func (r *HomepageItemRepo) GetPartnerInfo(ctx context.Context, id uint) (HomepagePartnerRow, error) {
	var row HomepagePartnerRow
	err := dbFrom(ctx).Table("crm_customer").Select("name, level").Where("id = ?", id).Scan(&row).Error
	return row, err
}

// GetTeamUserName 取用户昵称 + 用户名(单条,admin 表格展示用;昵称为空回退用户名)。
func (r *HomepageItemRepo) GetTeamUserName(ctx context.Context, id uint) (string, error) {
	var u struct {
		Nickname string
		Username string
	}
	err := dbFrom(ctx).Table("sys_user").Select("nickname, username").Where("id = ?", id).Scan(&u).Error
	if u.Nickname != "" {
		return u.Nickname, err
	}
	return u.Username, err
}

// ListProductsByIDs 按指定 ID 取上架产品。
func (r *HomepageItemRepo) ListProductsByIDs(ctx context.Context, ids []uint) ([]HomepageProductRow, error) {
	var rows []HomepageProductRow
	err := dbFrom(ctx).Table("crm_product").
		Select("id, name, image_url, description, category").
		Where("id IN ? AND status = 1", ids).
		Scan(&rows).Error
	return rows, err
}

// ListPartnersByIDs 按指定 ID 取上架客户(合作伙伴)。
func (r *HomepageItemRepo) ListPartnersByIDs(ctx context.Context, ids []uint) ([]HomepagePartnerRow, error) {
	var rows []HomepagePartnerRow
	err := dbFrom(ctx).Table("crm_customer").
		Select("id, name, level, industry, source").
		Where("id IN ? AND status = 1", ids).
		Scan(&rows).Error
	return rows, err
}

// ListTeamByIDs 按指定 ID 取启用用户(团队成员)。
func (r *HomepageItemRepo) ListTeamByIDs(ctx context.Context, ids []uint) ([]HomepageTeamRow, error) {
	var rows []HomepageTeamRow
	err := dbFrom(ctx).Table("sys_user").
		Select("id, nickname, avatar").
		Where("id IN ? AND status = 1", ids).
		Scan(&rows).Error
	return rows, err
}

// UserRoleNames 批量查用户角色名(user_id → "角色A、角色B",团队职位拼接用)。
func (r *HomepageItemRepo) UserRoleNames(ctx context.Context, userIDs []uint) (map[uint]string, error) {
	type userRole struct {
		UserID   uint
		RoleName string
	}
	var roleNames []userRole
	if len(userIDs) > 0 {
		if err := dbFrom(ctx).Table("sys_user_role ur").
			Select("ur.sys_user_id as user_id, r.name as role_name").
			Joins("JOIN sys_role r ON r.id = ur.sys_role_id AND r.deleted_at IS NULL").
			Where("ur.sys_user_id IN ?", userIDs).
			Scan(&roleNames).Error; err != nil {
			return nil, err
		}
	}
	positionMap := make(map[uint]string)
	for _, ur := range roleNames {
		if ur.RoleName == "" {
			continue
		}
		if positionMap[ur.UserID] != "" {
			positionMap[ur.UserID] += "、"
		}
		positionMap[ur.UserID] += ur.RoleName
	}
	return positionMap, nil
}
