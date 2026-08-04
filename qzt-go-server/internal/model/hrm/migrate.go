package hrm

import (
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// migrate.go HRM 模块建表 + 种子数据。

// allModels 所有需要建表的 HRM model。新增 model 时在此登记。
func allModels() []any {
	return []any{
		&HrmDepartment{},
		&HrmPosition{},
		&HrmEmployee{},
		&HrmPositionChange{},
		&HrmAttendanceClock{},
		&HrmLeave{},
		&HrmOvertime{},
		&HrmAttendanceSummary{},
		&HrmSalaryStructure{},
		&HrmPayroll{},
	}
}

// AutoMigrate 同步 HRM 所有表结构。
func AutoMigrate(db *gorm.DB) error {
	return db.AutoMigrate(allModels()...)
}

// SeedHRMData 写入 HRM 初始数据:默认部门树。
// 幂等:按部门 code 检查,根部门 HQ 存在则跳过。
func SeedHRMData(db *gorm.DB) error {
	var count int64
	db.Model(&HrmDepartment{}).Where("code = ?", "HQ").Count(&count)
	if count > 0 {
		return nil
	}
	zap.S().Info("开始写入 HRM 初始部门数据...")
	depts := defaultDepartments()
	if err := db.Create(&depts).Error; err != nil {
		return err
	}
	zap.S().Info("HRM 初始部门数据写入完成")
	return nil
}

// defaultDepartments 默认部门树(总裁办 + 研发部 + 市场部 + 财务部)。
// 根部门 ParentID=0;ID 显式稳定,便于二级引用。
func defaultDepartments() []HrmDepartment {
	return []HrmDepartment{
		{ID: 1, ParentID: 0, Name: "总裁办", Code: "HQ", Sort: 1, Status: 1},
		{ID: 2, ParentID: 1, Name: "研发部", Code: "RD", Sort: 1, Status: 1},
		{ID: 3, ParentID: 1, Name: "市场部", Code: "MK", Sort: 2, Status: 1},
		{ID: 4, ParentID: 1, Name: "财务部", Code: "FIN", Sort: 3, Status: 1},
	}
}
