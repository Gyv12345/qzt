package model

import (
	"fmt"

	"go.uber.org/zap"
	"gorm.io/gorm"

	"qzt-go-server/internal/model/approval"
	"qzt-go-server/internal/model/cms"
	"qzt-go-server/internal/model/crm"
	"qzt-go-server/internal/model/enterprise"
	"qzt-go-server/internal/model/finance"
	"qzt-go-server/internal/model/hrm"
	"qzt-go-server/internal/model/psi"
	"qzt-go-server/pkg/xcryption"
)

// allModels 所有需要建表的 model。新增 model 时在此登记。
func allModels() []any {
	return []any{
		&SysUser{},
		&SysRole{},
		&SysMenu{},
		&SysAPI{},
		&SysConfig{},
		&SysOperationLog{},
		&SysDict{},
		&SysDictItem{},
		&SysOauthConfig{},
		&SysStorageConfig{},
		&SysApiKey{},
		&SysSiteConfig{},
	}
}

// AutoMigrate 同步所有表结构(系统 + CRM + CMS)。仅用于开发与首次初始化；
// 生产环境推荐使用 docs/sql 下的版本化迁移脚本。
func AutoMigrate(db *gorm.DB) error {
	if err := db.AutoMigrate(allModels()...); err != nil {
		return err
	}
	if err := crm.AutoMigrate(db); err != nil {
		return err
	}
	if err := cms.AutoMigrate(db); err != nil {
		return err
	}
	if err := enterprise.AutoMigrate(db); err != nil {
		return err
	}
	if err := hrm.AutoMigrate(db); err != nil {
		return err
	}
	if err := psi.AutoMigrate(db); err != nil {
		return err
	}
	if err := approval.AutoMigrate(db); err != nil {
		return err
	}
	return finance.AutoMigrate(db)
}

// SeedData 写入初始数据：超级管理员角色、超管用户、默认菜单与 API、示例字典。
// 幂等：若 super_admin 角色已存在则跳过系统种子；CRM 字典与 CRM 种子独立幂等写入。
func SeedData(db *gorm.DB) error {
	// CRM 字典(独立幂等:按 code 检查是否存在,不存在才插入)
	if err := seedCRMDicts(db); err != nil {
		zap.S().Warnf("seed crm dicts: %v", err)
	}
	// CRM 表单/字段/阶段配置(幂等:form_key=CUSTOMER 存在即跳过)
	if err := crm.SeedCRMData(db); err != nil {
		zap.S().Warnf("seed crm data: %v", err)
	}
	// HRM 字典(独立幂等:按 code 检查是否存在,不存在才插入)
	if err := seedHRMDicts(db); err != nil {
		zap.S().Warnf("seed hrm dicts: %v", err)
	}
	// 财务科目体系(幂等:fin_account 有数据则跳过)
	if err := finance.SeedFinanceData(db); err != nil {
		zap.S().Warnf("seed finance data: %v", err)
	}
	// HRM 默认部门树(幂等:根部门 code=HQ 存在即跳过)
	if err := hrm.SeedHRMData(db); err != nil {
		zap.S().Warnf("seed hrm data: %v", err)
	}
	// PSI 字典(独立幂等:按 code 检查是否存在,不存在才插入)
	if err := seedPSIDicts(db); err != nil {
		zap.S().Warnf("seed psi dicts: %v", err)
	}
	// PSI 默认仓库(幂等:默认仓库编码存在即跳过)
	if err := psi.SeedPSIData(db); err != nil {
		zap.S().Warnf("seed psi data: %v", err)
	}
	// PSI 接口权限记录(幂等:按 path+method 补建,供操作日志元数据与 Casbin)
	if err := seedPSIPermissions(db); err != nil {
		zap.S().Warnf("seed psi permissions: %v", err)
	}

	var count int64
	db.Model(&SysRole{}).Where("code = ?", SuperAdminRoleCode).Count(&count)
	if count > 0 {
		return nil
	}

	zap.S().Info("开始写入初始数据...")

	err := db.Transaction(func(tx *gorm.DB) error {
		apis := defaultAPIs()
		for i := range apis {
			if err := tx.Create(&apis[i]).Error; err != nil {
				return err
			}
		}

		adminRole := &SysRole{
			Name:   "超级管理员",
			Code:   SuperAdminRoleCode,
			Sort:   0,
			Status: StatusEnabled,
			Remark: "超级管理员，拥有所有权限",
		}
		if err := tx.Create(adminRole).Error; err != nil {
			return err
		}

		hashed, err := xcryption.HashPassword(defaultAdminPassword)
		if err != nil {
			return fmt.Errorf("hash seed password: %w", err)
		}
		adminUser := &SysUser{
			Username: "admin",
			Password: hashed,
			Nickname: "管理员",
			Status:   StatusEnabled,
			Roles:    []SysRole{*adminRole},
		}
		if err := tx.Create(adminUser).Error; err != nil {
			return err
		}

		menus := defaultMenus(apis)
		for i := range menus {
			if err := tx.Create(&menus[i]).Error; err != nil {
				return err
			}
		}
		// 将全部内置菜单授权给超级管理员角色
		if err := tx.Model(adminRole).Association("Menus").Replace(menus); err != nil {
			return err
		}

		// 示例字典
		for i := range defaultDicts() {
			if err := tx.Create(&defaultDicts()[i]).Error; err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return err
	}

	zap.S().Warnf("已创建默认管理员 admin/%s，请登录后立即修改密码", defaultAdminPassword)
	zap.S().Info("初始数据写入完成")
	return nil
}

// seedCRMDicts 幂等写入 CRM 字典:按 code 检查,不存在才插入(含字典项)。
func seedCRMDicts(db *gorm.DB) error {
	for _, d := range crmDicts() {
		var cnt int64
		db.Model(&SysDict{}).Where("code = ?", d.Code).Count(&cnt)
		if cnt > 0 {
			continue
		}
		if err := db.Create(&d).Error; err != nil {
			return err
		}
	}
	return nil
}

// seedHRMDicts 幂等写入 HRM 字典:按 code 检查,不存在才插入(含字典项)。
func seedHRMDicts(db *gorm.DB) error {
	for _, d := range hrmDicts() {
		var cnt int64
		db.Model(&SysDict{}).Where("code = ?", d.Code).Count(&cnt)
		if cnt > 0 {
			continue
		}
		if err := db.Create(&d).Error; err != nil {
			return err
		}
	}
	return nil
}

// seedPSIDicts 幂等写入 PSI 字典:按 code 检查,不存在才插入(含字典项)。
func seedPSIDicts(db *gorm.DB) error {
	for _, d := range psiDicts() {
		var cnt int64
		db.Model(&SysDict{}).Where("code = ?", d.Code).Count(&cnt)
		if cnt > 0 {
			continue
		}
		if err := db.Create(&d).Error; err != nil {
			return err
		}
	}
	return nil
}

// defaultAdminPassword 种子超管账号的初始密码。
const defaultAdminPassword = "admin123"
