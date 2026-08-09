package oa

import (
	"context"

	oamodel "qzt-go-server/internal/model/oa"
	"qzt-go-server/internal/repository"
	"qzt-go-server/pkg/xtime"
)

// message.go OA 站内信 repository。

type MessageRepo struct {
	repository.BaseRepo[oamodel.OaMessage]
}

func NewMessageRepo() *MessageRepo { return &MessageRepo{} }

func (r *MessageRepo) CountUnread(ctx context.Context, receiverID uint) (int64, error) {
	var count int64
	err := repository.DBFrom(ctx).Model(&oamodel.OaMessage{}).
		Where("receiver_id = ? AND is_read = ?", receiverID, oamodel.MsgUnread).
		Count(&count).Error
	return count, err
}

func (r *MessageRepo) MarkAsRead(ctx context.Context, id, receiverID uint) (int64, error) {
	now := xtime.Now()
	result := repository.DBFrom(ctx).Model(&oamodel.OaMessage{}).
		Where("id = ? AND receiver_id = ? AND is_read = ?", id, receiverID, oamodel.MsgUnread).
		Updates(map[string]interface{}{
			"is_read":    oamodel.MsgRead,
			"read_time":  now,
			"updated_at": now,
		})
	return result.RowsAffected, result.Error
}

func (r *MessageRepo) MarkAllAsRead(ctx context.Context, receiverID uint) (int64, error) {
	now := xtime.Now()
	result := repository.DBFrom(ctx).Model(&oamodel.OaMessage{}).
		Where("receiver_id = ? AND is_read = ?", receiverID, oamodel.MsgUnread).
		Updates(map[string]interface{}{
			"is_read":    oamodel.MsgRead,
			"read_time":  now,
			"updated_at": now,
		})
	return result.RowsAffected, result.Error
}

func (r *MessageRepo) MarkAsReadByIds(ctx context.Context, ids []uint, receiverID uint) (int64, error) {
	if len(ids) == 0 {
		return 0, nil
	}
	now := xtime.Now()
	result := repository.DBFrom(ctx).Model(&oamodel.OaMessage{}).
		Where("id IN ? AND receiver_id = ? AND is_read = ?", ids, receiverID, oamodel.MsgUnread).
		Updates(map[string]interface{}{
			"is_read":    oamodel.MsgRead,
			"read_time":  now,
			"updated_at": now,
		})
	return result.RowsAffected, result.Error
}

func (r *MessageRepo) PageInbox(ctx context.Context, page, pageSize int, receiverID uint) ([]oamodel.OaMessage, int64, error) {
	var list []oamodel.OaMessage
	var total int64
	db := repository.DBFrom(ctx).Model(&oamodel.OaMessage{}).Where("receiver_id = ?", receiverID)
	if err := db.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	if err := db.Order("id DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&list).Error; err != nil {
		return nil, 0, err
	}
	return list, total, nil
}

func (r *MessageRepo) PageOutbox(ctx context.Context, page, pageSize int, senderID uint) ([]oamodel.OaMessage, int64, error) {
	var list []oamodel.OaMessage
	var total int64
	db := repository.DBFrom(ctx).Model(&oamodel.OaMessage{}).Where("sender_id = ?", senderID)
	if err := db.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	if err := db.Order("id DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&list).Error; err != nil {
		return nil, 0, err
	}
	return list, total, nil
}
