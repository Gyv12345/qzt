package enterprise

import "gorm.io/gorm"

// migrate.go enterprise 模块建表与种子(通知/消息/定时任务)。

// allModels 所有需要建表的 enterprise model。新增 model 时在此登记。
func allModels() []any {
	return []any{
		&SysNotice{},
		&SysMessage{},
		&SysJob{},
		&SysJobLog{},
	}
}

// AutoMigrate 同步 enterprise 所有表结构。
func AutoMigrate(db *gorm.DB) error {
	return db.AutoMigrate(allModels()...)
}
