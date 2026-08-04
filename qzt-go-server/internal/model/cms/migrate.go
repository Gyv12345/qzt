package cms

import "gorm.io/gorm"

// migrate.go CMS 模块建表与种子。

// allModels 所有需要建表的 CMS model。新增 model 时在此登记。
func allModels() []any {
	return []any{
		&CmsCategory{},
		&CmsTag{},
		&CmsArticle{},
		&CmsPage{},
	}
}

// AutoMigrate 同步 CMS 所有表结构。cms_article_tag 关联表由 many2many 自动创建。
func AutoMigrate(db *gorm.DB) error {
	return db.AutoMigrate(allModels()...)
}
