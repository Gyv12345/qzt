package hrm

import (
	"context"
)

// leave.go 请假 repository。
// hrm_leave 的常规 CRUD 在 hrm 模块 service 内经 BaseRepo 完成;
// 本文件收口跨模块调用方(approval 审批回调)对请假表的直查。

// UpdateLeaveStatus 更新请假单状态列(审批通过回调:同步旧 Status 字段以兼容考勤查询)。
func UpdateLeaveStatus(ctx context.Context, id uint, status string) error {
	return repoDB(ctx).Table("hrm_leave").Where("id = ?", id).
		UpdateColumn("status", status).Error
}
