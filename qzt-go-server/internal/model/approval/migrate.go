package approval

import "gorm.io/gorm"

// migrate.go 审批引擎建表。

// allModels 所有需要建表的 approval model(11 张表)。
func allModels() []any {
	return []any{
		&ApprovalFlow{},
		&ApprovalFlowVersion{},
		&ApprovalNode{},
		&ApprovalNodeApprover{},
		&ApprovalNodeCondition{},
		&ApprovalNodeLink{},
		&ApprovalInstance{},
		&ApprovalTask{},
		&ApprovalAddSignTask{},
		&ApprovalReturnBackRecord{},
		&ApprovalRecord{},
	}
}

// AutoMigrate 同步审批引擎所有表结构。
func AutoMigrate(db *gorm.DB) error {
	return db.AutoMigrate(allModels()...)
}
