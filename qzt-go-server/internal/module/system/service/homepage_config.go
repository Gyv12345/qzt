package service

// homepage_config.go CMS 首页板块配置服务。
// 管理板块开关 + 精选条目;PublicHomepage 供 CMS 官网公开读取。

import (
	"context"
	"fmt"

	"gorm.io/gorm"

	"qzt-go-server/internal/model"
	"qzt-go-server/internal/repository"
)

// ── 请求/响应 DTO ──

// ToggleModuleRequest 板块开关请求。
type ToggleModuleRequest struct {
	Module  string `json:"module" binding:"required"`
	Enabled bool   `json:"enabled"`
}

// SyncFeaturesRequest 精选同步请求(全量替换)。
type SyncFeaturesRequest struct {
	Module  string `json:"module" binding:"required"`
	ItemIDs []uint `json:"item_ids"`
}

// HomepageFeatureDTO 精选条目(带业务名称, admin 展示用)。
type HomepageFeatureDTO struct {
	ID       uint   `json:"id"`
	Module   string `json:"module"`
	ItemID   uint   `json:"item_id"`
	Sort     int    `json:"sort"`
	ItemName string `json:"item_name"`
	SubInfo  string `json:"sub_info"`
}

// HomepageModuleDTO 板块配置(admin 返回)。
type HomepageModuleDTO struct {
	ID         uint                  `json:"id"`
	Module     string                `json:"module"`
	ModuleName string                `json:"module_name"`
	Enabled    bool                  `json:"enabled"`
	Sort       int                   `json:"sort"`
	Features   []HomepageFeatureDTO  `json:"features"`
}

// HomepageSectionItem CMS 公开返回的单条条目。
type HomepageSectionItem struct {
	ID          uint   `json:"id"`
	Name        string `json:"name"`
	ImageURL    string `json:"image_url,omitempty"`
	Description string `json:"description,omitempty"`
	Category    string `json:"category,omitempty"`
	Level       string `json:"level,omitempty"`
	Industry    string `json:"industry,omitempty"`
	Source      string `json:"source,omitempty"`
	Avatar      string `json:"avatar,omitempty"`
	Position    string `json:"position,omitempty"`
}

// HomepageSection CMS 公开返回的板块。
type HomepageSection struct {
	Enabled bool                  `json:"enabled"`
	Items   []HomepageSectionItem `json:"items"`
}

// ── 服务 ──

type HomepageConfigService struct {
	moduleRepo  *repository.HomepageModuleRepo
	featureRepo *repository.HomepageFeatureRepo
}

func NewHomepageConfigService() *HomepageConfigService {
	return &HomepageConfigService{
		moduleRepo:  repository.NewHomepageModuleRepo(),
		featureRepo: repository.NewHomepageFeatureRepo(),
	}
}

var validModules = map[string]bool{"product": true, "partner": true, "team": true}

func (s *HomepageConfigService) validateModule(module string) error {
	if !validModules[module] {
		return fmt.Errorf("无效的模块标识: %s", module)
	}
	return nil
}

// GetConfig 返回完整配置(admin 用, 含精选条目 + 业务名称)。
func (s *HomepageConfigService) GetConfig(ctx context.Context) ([]HomepageModuleDTO, error) {
	modules, err := s.moduleRepo.ListAll(ctx)
	if err != nil {
		return nil, err
	}
	result := make([]HomepageModuleDTO, 0, len(modules))
	for _, m := range modules {
		features, _ := s.featureRepo.ListByModule(ctx, m.Module)
		dtos := make([]HomepageFeatureDTO, 0, len(features))
		for _, f := range features {
			name, sub := s.fetchItemInfo(ctx, m.Module, f.ItemID)
			dtos = append(dtos, HomepageFeatureDTO{
				ID: f.ID, Module: f.Module, ItemID: f.ItemID, Sort: f.Sort,
				ItemName: name, SubInfo: sub,
			})
		}
		result = append(result, HomepageModuleDTO{
			ID: m.ID, Module: m.Module, ModuleName: m.ModuleName,
			Enabled: m.Enabled, Sort: m.Sort, Features: dtos,
		})
	}
	return result, nil
}

// ToggleModule 更新板块开关。
func (s *HomepageConfigService) ToggleModule(ctx context.Context, req *ToggleModuleRequest) error {
	if err := s.validateModule(req.Module); err != nil {
		return err
	}
	return s.moduleRepo.SetEnabled(ctx, req.Module, req.Enabled)
}

// SyncFeatures 全量替换某模块的精选条目。
func (s *HomepageConfigService) SyncFeatures(ctx context.Context, req *SyncFeaturesRequest) error {
	if err := s.validateModule(req.Module); err != nil {
		return err
	}
	return repository.Transaction(ctx, func(ctx context.Context) error {
		return s.featureRepo.Sync(ctx, req.Module, req.ItemIDs)
	})
}

// RemoveFeature 删除单条精选。
func (s *HomepageConfigService) RemoveFeature(ctx context.Context, id uint) error {
	return s.featureRepo.Delete(ctx, id)
}

// PublicHomepage CMS 公开接口: 返回各板块的开关 + 条目详情。
// enabled=false → 空条目; enabled=true 有精选 → 按精选顺序返回;
// enabled=true 无精选 → 取最新 N 条(当前行为)。
func (s *HomepageConfigService) PublicHomepage(ctx context.Context) (map[string]HomepageSection, error) {
	modules, err := s.moduleRepo.ListAll(ctx)
	if err != nil {
		return nil, err
	}
	result := make(map[string]HomepageSection, len(modules))
	for _, m := range modules {
		if !m.Enabled {
			result[m.Module] = HomepageSection{Enabled: false, Items: []HomepageSectionItem{}}
			continue
		}
		features, _ := s.featureRepo.ListByModule(ctx, m.Module)
		var items []HomepageSectionItem
		if len(features) > 0 {
			ids := make([]uint, 0, len(features))
			for _, f := range features {
				ids = append(ids, f.ItemID)
			}
			items = s.fetchItemsByIDs(ctx, m.Module, ids)
		} else {
			items = s.fetchLatestItems(ctx, m.Module)
		}
		if items == nil {
			items = []HomepageSectionItem{}
		}
		result[m.Module] = HomepageSection{Enabled: true, Items: items}
	}
	return result, nil
}

// ── 业务表查询(直接 DB 查询, 避免跨模块依赖) ──

// fetchItemInfo 取单条业务名称 + 副信息(admin 表格展示用)。
func (s *HomepageConfigService) fetchItemInfo(ctx context.Context, module string, itemID uint) (name, sub string) {
	db := repository.DBFrom(ctx)
	switch module {
	case "product":
		var p struct {
			Name     string
			Category string
		}
		db.Table("crm_product").Select("name, category").Where("id = ?", itemID).Scan(&p)
		return p.Name, p.Category
	case "partner":
		var c struct {
			Name  string
			Level string
		}
		db.Table("crm_customer").Select("name, level").Where("id = ?", itemID).Scan(&c)
		return c.Name, c.Level
	case "team":
		var u struct {
			Nickname string
			Username string
		}
		db.Table("sys_user").Select("nickname, username").Where("id = ?", itemID).Scan(&u)
		name = u.Nickname
		if name == "" {
			name = u.Username
		}
		return name, ""
	}
	return "", ""
}

// fetchItemsByIDs 按指定 ID 顺序取业务条目(CMS 公开用)。
func (s *HomepageConfigService) fetchItemsByIDs(ctx context.Context, module string, ids []uint) []HomepageSectionItem {
	db := repository.DBFrom(ctx)
	switch module {
	case "product":
		var rows []struct {
			ID          uint
			Name        string
			ImageURL    string
			Description string
			Category    string
		}
		db.Table("crm_product").
			Select("id, name, image_url, description, category").
			Where("id IN ? AND status = 1", ids).
			Scan(&rows)
		return reorderProducts(rows, ids)
	case "partner":
		var rows []struct {
			ID       uint
			Name     string
			Level    string
			Industry string
			Source   string
		}
		db.Table("crm_customer").
			Select("id, name, level, industry, source").
			Where("id IN ? AND status = 1", ids).
			Scan(&rows)
		return reorderPartners(rows, ids)
	case "team":
		var rows []struct {
			ID       uint
			Nickname string
			Avatar   string
		}
		db.Table("sys_user").
			Select("id, nickname, avatar").
			Where("id IN ? AND status = 1", ids).
			Scan(&rows)
		return reorderTeam(ctx, db, rows, ids)
	}
	return nil
}

// fetchLatestItems 取最新 N 条(无精选时的降级行为)。
func (s *HomepageConfigService) fetchLatestItems(ctx context.Context, module string) []HomepageSectionItem {
	db := repository.DBFrom(ctx)
	switch module {
	case "product":
		var rows []struct {
			ID          uint
			Name        string
			ImageURL    string
			Description string
			Category    string
		}
		db.Table("crm_product").
			Select("id, name, image_url, description, category").
			Where("status = 1").
			Order("id DESC").
			Limit(6).
			Scan(&rows)
		items := make([]HomepageSectionItem, 0, len(rows))
		for _, r := range rows {
			items = append(items, HomepageSectionItem{
				ID: r.ID, Name: r.Name, ImageURL: r.ImageURL,
				Description: r.Description, Category: r.Category,
			})
		}
		return items
	case "partner":
		var rows []struct {
			ID       uint
			Name     string
			Level    string
			Industry string
			Source   string
		}
		db.Table("crm_customer").
			Select("id, name, level, industry, source").
			Where("status = 1").
			Order("id DESC").
			Limit(8).
			Scan(&rows)
		items := make([]HomepageSectionItem, 0, len(rows))
		for _, r := range rows {
			items = append(items, HomepageSectionItem{
				ID: r.ID, Name: r.Name, Level: r.Level,
				Industry: r.Industry, Source: r.Source,
			})
		}
		return items
	case "team":
		var users []model.SysUser
		db.Where("status = 1").Order("id ASC").Limit(4).Find(&users)
		items := make([]HomepageSectionItem, 0, len(users))
		for _, u := range users {
			nickname := u.Nickname
			if nickname == "" {
				nickname = u.Username
			}
			items = append(items, HomepageSectionItem{
				ID: u.ID, Name: nickname, Avatar: u.Avatar,
			})
		}
		return items
	}
	return nil
}

// ── 按精选顺序重排 ──

func reorderProducts(rows []struct {
	ID          uint
	Name        string
	ImageURL    string
	Description string
	Category    string
}, ids []uint) []HomepageSectionItem {
	m := make(map[uint]HomepageSectionItem, len(rows))
	for _, r := range rows {
		m[r.ID] = HomepageSectionItem{
			ID: r.ID, Name: r.Name, ImageURL: r.ImageURL,
			Description: r.Description, Category: r.Category,
		}
	}
	return pickOrdered(m, ids)
}

func reorderPartners(rows []struct {
	ID       uint
	Name     string
	Level    string
	Industry string
	Source   string
}, ids []uint) []HomepageSectionItem {
	m := make(map[uint]HomepageSectionItem, len(rows))
	for _, r := range rows {
		m[r.ID] = HomepageSectionItem{
			ID: r.ID, Name: r.Name, Level: r.Level,
			Industry: r.Industry, Source: r.Source,
		}
	}
	return pickOrdered(m, ids)
}

func reorderTeam(ctx context.Context, db *gorm.DB, rows []struct {
	ID       uint
	Nickname string
	Avatar   string
}, ids []uint) []HomepageSectionItem {
	// 查角色名拼职位
	type userRole struct {
		UserID uint
		RoleName string
	}
	var roleNames []userRole
	userIDs := make([]uint, 0, len(rows))
	for _, r := range rows {
		userIDs = append(userIDs, r.ID)
	}
	if len(userIDs) > 0 {
		db.Table("sys_user_role ur").
			Select("ur.sys_user_id as user_id, r.name as role_name").
			Joins("JOIN sys_role r ON r.id = ur.sys_role_id AND r.deleted_at IS NULL").
			Where("ur.sys_user_id IN ?", userIDs).
			Scan(&roleNames)
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

	m := make(map[uint]HomepageSectionItem, len(rows))
	for _, r := range rows {
		name := r.Nickname
		if name == "" {
			name = ""
		}
		m[r.ID] = HomepageSectionItem{
			ID: r.ID, Name: name, Avatar: r.Avatar,
			Position: positionMap[r.ID],
		}
	}
	return pickOrdered(m, ids)
}

func pickOrdered(m map[uint]HomepageSectionItem, ids []uint) []HomepageSectionItem {
	result := make([]HomepageSectionItem, 0, len(ids))
	for _, id := range ids {
		if item, ok := m[id]; ok {
			result = append(result, item)
		}
	}
	return result
}

