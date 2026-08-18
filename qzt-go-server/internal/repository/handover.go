package repository

import (
	"context"
)

// handover.go 离职交接跨模块批量转移 repository。
// 交接天然横跨 CRM/项目/审批/云盘/进销存等模块,故放全局 repository 层。
// 表名/字段名/附加条件均为服务端常量,不接受外部输入。

// TransferColumnOwnerWhere 批量转移某表的归属字段(owner_id/assignee_id 等)给接收人,
// 支持附加 WHERE 条件(如仅未办结的审批任务);软删行不动。返回影响行数。
func TransferColumnOwnerWhere(ctx context.Context, table, field string, fromUserID, toUserID uint, cond string, args ...any) (int64, error) {
	q := dbFrom(ctx).Table(table).
		Where(field+" = ? AND deleted_at IS NULL", fromUserID)
	if cond != "" {
		q = q.Where(cond, args...)
	}
	res := q.Update(field, toUserID)
	return res.RowsAffected, res.Error
}
