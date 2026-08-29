package crm

import (
	"context"
)

// handover.go 离职交接 CRM 侧 repository。
// 通用跨表归属转移见 repository.TransferColumnOwnerWhere(全局层);
// 本文件只放 CRM 特有的交接逻辑(归属历史、协作去重)。

// BatchInsertTransferHistory 批量写客户归属转移历史(TRANSFER,接收人为新 owner)。
func BatchInsertTransferHistory(ctx context.Context, fromUserID, toUserID uint) error {
	return repoDB(ctx).Exec(`INSERT INTO crm_customer_owner_history (customer_id, owner_id, action, operator_id, created_at, updated_at)
		SELECT id, ?, 'TRANSFER', ?, NOW(), NOW() FROM crm_customer
		WHERE owner_id = ? AND deleted_at IS NULL`,
		toUserID, fromUserID, toUserID).Error
}
