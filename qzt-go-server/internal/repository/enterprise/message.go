package enterprise

import (
	"context"

	"gorm.io/gorm"

	entmodel "qzt-go-server/internal/model/enterprise"
	"qzt-go-server/internal/repository"
	"qzt-go-server/pkg/xtime"
)

// message.go 站内信 repository。
// 含 markAsRead/markAllAsRead/markAsReadByIds 批量更新(JPQL → GORM Updates)。

type MessageRepo struct {
	repository.BaseRepo[entmodel.SysMessage]
}

func NewMessageRepo() *MessageRepo { return &MessageRepo{} }

// CountUnread 统计用户未读消息数。
func (r *MessageRepo) CountUnread(ctx context.Context, receiverID uint) (int64, error) {
	var count int64
	err := repoDB(ctx).Model(&entmodel.SysMessage{}).
		Where("receiver_id = ? AND is_read = ?", receiverID, entmodel.MsgUnread).
		Count(&count).Error
	return count, err
}

// MarkAsRead 标记单条已读(校验 receiverID)。返回受影响行数。
func (r *MessageRepo) MarkAsRead(ctx context.Context, id, receiverID uint) (int64, error) {
	now := xtime.Now()
	result := repoDB(ctx).Model(&entmodel.SysMessage{}).
		Where("id = ? AND receiver_id = ? AND is_read = ?", id, receiverID, entmodel.MsgUnread).
		Updates(map[string]interface{}{
			"is_read":   entmodel.MsgRead,
			"read_time": now,
			"updated_at": now,
		})
	return result.RowsAffected, result.Error
}

// MarkAllAsRead 标记当前用户全部未读为已读。返回受影响行数。
func (r *MessageRepo) MarkAllAsRead(ctx context.Context, receiverID uint) (int64, error) {
	now := xtime.Now()
	result := repoDB(ctx).Model(&entmodel.SysMessage{}).
		Where("receiver_id = ? AND is_read = ?", receiverID, entmodel.MsgUnread).
		Updates(map[string]interface{}{
			"is_read":   entmodel.MsgRead,
			"read_time": now,
			"updated_at": now,
		})
	return result.RowsAffected, result.Error
}

// MarkAsReadByIds 按 ID 批量已读。返回受影响行数。
func (r *MessageRepo) MarkAsReadByIds(ctx context.Context, ids []uint, receiverID uint) (int64, error) {
	if len(ids) == 0 {
		return 0, nil
	}
	now := xtime.Now()
	result := repoDB(ctx).Model(&entmodel.SysMessage{}).
		Where("id IN ? AND receiver_id = ? AND is_read = ?", ids, receiverID, entmodel.MsgUnread).
		Updates(map[string]interface{}{
			"is_read":   entmodel.MsgRead,
			"read_time": now,
			"updated_at": now,
		})
	return result.RowsAffected, result.Error
}

// PageInbox 收件箱分页(receiver_id = userID)。
func (r *MessageRepo) PageInbox(ctx context.Context, page, pageSize int, receiverID uint) ([]entmodel.SysMessage, int64, error) {
	var list []entmodel.SysMessage
	var total int64
	db := repoDB(ctx).Model(&entmodel.SysMessage{}).Where("receiver_id = ?", receiverID)
	if err := db.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	if err := db.Order("id DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&list).Error; err != nil {
		return nil, 0, err
	}
	return list, total, nil
}

// PageOutbox 发件箱分页(sender_id = userID,排除系统消息)。
func (r *MessageRepo) PageOutbox(ctx context.Context, page, pageSize int, senderID uint) ([]entmodel.SysMessage, int64, error) {
	var list []entmodel.SysMessage
	var total int64
	db := repoDB(ctx).Model(&entmodel.SysMessage{}).Where("sender_id = ?", senderID)
	if err := db.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	if err := db.Order("id DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&list).Error; err != nil {
		return nil, 0, err
	}
	return list, total, nil
}

// repoDB 返回当前 context 下的 *gorm.DB(事务内复用事务,否则全局 DB)。
func repoDB(ctx context.Context) *gorm.DB { return repository.DBFrom(ctx) }
