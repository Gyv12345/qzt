package crm

import (
	"context"
)

// handover.go 离职交接批量转移 repository。
// 表名/字段名来自服务端常量清单(crm_customer 等),批量 UPDATE 走原生 Table
// (不走单条 Transfer,SQL 批量更新性能高)。

// TransferColumnOwner 批量转移某表的归属字段(owner_id/follower_id,软删行不动),返回影响行数。
func TransferColumnOwner(ctx context.Context, table, field string, fromUserID, toUserID uint) (int64, error) {
	res := repoDB(ctx).Table(table).
		Where(field+" = ? AND deleted_at IS NULL", fromUserID).
		Update(field, toUserID)
	return res.RowsAffected, res.Error
}

// BatchInsertTransferHistory 批量写客户归属转移历史(TRANSFER,接收人为新 owner)。
func BatchInsertTransferHistory(ctx context.Context, fromUserID, toUserID uint) error {
	return repoDB(ctx).Exec(`INSERT INTO crm_customer_owner_history (customer_id, owner_id, action, operator_id, created_at, updated_at)
		SELECT id, ?, 'TRANSFER', ?, NOW(), NOW() FROM crm_customer
		WHERE owner_id = ? AND deleted_at IS NULL`,
		toUserID, fromUserID, toUserID).Error
}
