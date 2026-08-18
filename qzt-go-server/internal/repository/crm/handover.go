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

// DeleteDuplicatedCollaboration 删除离职人的客户协作记录中、接收人已在协作的行
// (uk_customer_user 唯一键,不先删会让批量转移整表失败)。返回删除行数。
func DeleteDuplicatedCollaboration(ctx context.Context, fromUserID, toUserID uint) (int64, error) {
	res := repoDB(ctx).Exec(`DELETE c1 FROM crm_customer_collaboration c1
		JOIN crm_customer_collaboration c2
			ON c2.customer_id = c1.customer_id AND c2.user_id = ? AND c2.deleted_at IS NULL
		WHERE c1.user_id = ? AND c1.deleted_at IS NULL`,
		toUserID, fromUserID)
	return res.RowsAffected, res.Error
}
