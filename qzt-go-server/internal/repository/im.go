// im.go 即时通讯(IM)仓储。
// 嵌入 repository.BaseRepo[T] 获得通用 CRUD;补充会话列表聚合所需的专用查询
// (未读数/成员数分组统计、按会话键幂等查单聊、成员行硬删除等)。
package repository

import (
	"context"
	"time"

	"qzt-go-server/internal/model"
	immodel "qzt-go-server/internal/model/im"
)

// ── 会话仓储 ──

// ConversationRepo IM 会话仓储。
type ConversationRepo struct {
	BaseRepo[immodel.IMConversation]
}

func NewConversationRepo() *ConversationRepo { return &ConversationRepo{} }

// GetByConvKey 按幂等键查会话(单聊创建的 create-or-return 依赖此查询)。
func (r *ConversationRepo) GetByConvKey(ctx context.Context, key string) (*immodel.IMConversation, error) {
	return r.GetOne(ctx, &QueryOptions{Where: map[string]any{
		"type":     immodel.ConvTypeSingle,
		"conv_key": key,
	}})
}

// ListByIDs 批量取会话(软删除的会话被 GORM 自动过滤)。
func (r *ConversationRepo) ListByIDs(ctx context.Context, ids []uint) ([]immodel.IMConversation, error) {
	var list []immodel.IMConversation
	if len(ids) == 0 {
		return list, nil
	}
	err := dbFrom(ctx).Where("id IN ?", ids).Find(&list).Error
	return list, err
}

// TouchLastMessage 回填会话最新消息(发消息后同事务更新)。
func (r *ConversationRepo) TouchLastMessage(ctx context.Context, convID, messageID uint, at time.Time) error {
	return dbFrom(ctx).Model(&immodel.IMConversation{}).
		Where("id = ?", convID).
		Updates(map[string]any{
			"last_message_id": messageID,
			"last_message_at": at,
		}).Error
}

// ── 会话成员仓储 ──

// ConversationMemberRepo IM 会话成员仓储。
type ConversationMemberRepo struct {
	BaseRepo[immodel.IMConversationMember]
}

func NewConversationMemberRepo() *ConversationMemberRepo { return &ConversationMemberRepo{} }

// CreateBatch 批量插入成员。
func (r *ConversationMemberRepo) CreateBatch(ctx context.Context, members []immodel.IMConversationMember) error {
	if len(members) == 0 {
		return nil
	}
	return dbFrom(ctx).Create(&members).Error
}

// GetByConvAndUser 查某用户在某会话的成员行(成员资格判断)。
func (r *ConversationMemberRepo) GetByConvAndUser(ctx context.Context, convID, userID uint) (*immodel.IMConversationMember, error) {
	var m immodel.IMConversationMember
	if err := dbFrom(ctx).
		Where("conversation_id = ? AND user_id = ?", convID, userID).
		First(&m).Error; err != nil {
		return nil, err
	}
	return &m, nil
}

// ListByUser 列出用户作为成员的全部会话行(会话列表入口)。
func (r *ConversationMemberRepo) ListByUser(ctx context.Context, userID uint) ([]immodel.IMConversationMember, error) {
	var list []immodel.IMConversationMember
	err := dbFrom(ctx).Where("user_id = ?", userID).Find(&list).Error
	return list, err
}

// ListByConversation 列出会话全部成员。
func (r *ConversationMemberRepo) ListByConversation(ctx context.Context, convID uint) ([]immodel.IMConversationMember, error) {
	var list []immodel.IMConversationMember
	err := dbFrom(ctx).Where("conversation_id = ?", convID).Order("id ASC").Find(&list).Error
	return list, err
}

// ListByConversations 批量列出多个会话的成员(会话列表对端解析用)。
func (r *ConversationMemberRepo) ListByConversations(ctx context.Context, convIDs []uint) ([]immodel.IMConversationMember, error) {
	var list []immodel.IMConversationMember
	if len(convIDs) == 0 {
		return list, nil
	}
	err := dbFrom(ctx).Where("conversation_id IN ?", convIDs).Order("id ASC").Find(&list).Error
	return list, err
}

// ExistingUserIDs 返回 userIDs 中已是该会话成员的用户(添加成员时跳过)。
func (r *ConversationMemberRepo) ExistingUserIDs(ctx context.Context, convID uint, userIDs []uint) ([]uint, error) {
	var ids []uint
	if len(userIDs) == 0 {
		return ids, nil
	}
	err := dbFrom(ctx).Model(&immodel.IMConversationMember{}).
		Where("conversation_id = ? AND user_id IN ?", convID, userIDs).
		Pluck("user_id", &ids).Error
	return ids, err
}

// UpdateLastRead 更新成员已读游标。
func (r *ConversationMemberRepo) UpdateLastRead(ctx context.Context, memberID, lastReadID uint) error {
	return dbFrom(ctx).Model(&immodel.IMConversationMember{}).
		Where("id = ?", memberID).
		Update("last_read_message_id", lastReadID).Error
}

// HardDeleteMember 硬删除单个成员行(退出/移除)。
// 用硬删除的原因见 model.IMConversationMember 注释:软删除行占用唯一索引,
// 会导致被移除的成员无法重新加入。
func (r *ConversationMemberRepo) HardDeleteMember(ctx context.Context, convID, userID uint) error {
	return dbFrom(ctx).Unscoped().
		Where("conversation_id = ? AND user_id = ?", convID, userID).
		Delete(&immodel.IMConversationMember{}).Error
}

// HardDeleteByConversation 硬删除会话全部成员行(群聊清空解散时调用)。
func (r *ConversationMemberRepo) HardDeleteByConversation(ctx context.Context, convID uint) error {
	return dbFrom(ctx).Unscoped().
		Where("conversation_id = ?", convID).
		Delete(&immodel.IMConversationMember{}).Error
}

// IMConvCount 会话ID + 计数(成员数分组统计)。
type IMConvCount struct {
	ConversationID uint  `json:"conversation_id"`
	Total          int64 `json:"total"`
}

// MemberCountsByConversation 批量统计各会话的成员数。
func (r *ConversationMemberRepo) MemberCountsByConversation(ctx context.Context, convIDs []uint) (map[uint]int64, error) {
	result := make(map[uint]int64, len(convIDs))
	if len(convIDs) == 0 {
		return result, nil
	}
	var rows []IMConvCount
	err := dbFrom(ctx).Model(&immodel.IMConversationMember{}).
		Select("conversation_id, COUNT(*) AS total").
		Where("conversation_id IN ?", convIDs).
		Group("conversation_id").
		Scan(&rows).Error
	if err != nil {
		return nil, err
	}
	for _, row := range rows {
		result[row.ConversationID] = row.Total
	}
	return result, nil
}

// ── 消息仓储 ──

// MessageRepo IM 消息仓储。
type MessageRepo struct {
	BaseRepo[immodel.IMMessage]
}

func NewMessageRepo() *MessageRepo { return &MessageRepo{} }

// ListPage 会话消息分页(按 id 倒序,before_id 独占——加载更早一页)。
func (r *MessageRepo) ListPage(ctx context.Context, convID uint, beforeID uint, limit int) ([]immodel.IMMessage, error) {
	var list []immodel.IMMessage
	q := dbFrom(ctx).Where("conversation_id = ?", convID)
	if beforeID > 0 {
		q = q.Where("id < ?", beforeID)
	}
	err := q.Order("id DESC").Limit(limit).Find(&list).Error
	return list, err
}

// ListByIDs 批量取消息(会话列表最新一条冗余展示)。
func (r *MessageRepo) ListByIDs(ctx context.Context, ids []uint) ([]immodel.IMMessage, error) {
	var list []immodel.IMMessage
	if len(ids) == 0 {
		return list, nil
	}
	err := dbFrom(ctx).Where("id IN ?", ids).Find(&list).Error
	return list, err
}

// LatestID 会话最新一条消息 ID(无消息返回 0)。
func (r *MessageRepo) LatestID(ctx context.Context, convID uint) (uint, error) {
	var maxID uint
	err := dbFrom(ctx).Model(&immodel.IMMessage{}).
		Where("conversation_id = ?", convID).
		Select("COALESCE(MAX(id), 0)").
		Scan(&maxID).Error
	return maxID, err
}

// IMUnreadCount 未读数分组统计行。
type IMUnreadCount struct {
	ConversationID uint  `json:"conversation_id"`
	Unread         int64 `json:"unread"`
}

// UnreadCountsByUser 批量统计用户在给定会话的未读数:
// 消息 id > 本人成员行 last_read_message_id 且 发送人非本人。
// JOIN 成员表取本人各会话的已读游标,一条 SQL 完成(字段均为可信服务端构造)。
func UnreadCountsByUser(ctx context.Context, userID uint, convIDs []uint) (map[uint]int64, error) {
	result := make(map[uint]int64, len(convIDs))
	if len(convIDs) == 0 {
		return result, nil
	}
	var rows []IMUnreadCount
	err := dbFrom(ctx).Table("im_message AS m").
		Select("m.conversation_id AS conversation_id, COUNT(*) AS unread").
		Joins("JOIN im_conversation_member AS cm ON cm.conversation_id = m.conversation_id "+
			"AND cm.user_id = ? AND cm.deleted_at IS NULL", userID).
		Where("m.conversation_id IN ?", convIDs).
		Where("m.id > cm.last_read_message_id").
		Where("m.sender_id <> ?", userID).
		Where("m.deleted_at IS NULL").
		Group("m.conversation_id").
		Scan(&rows).Error
	if err != nil {
		return nil, err
	}
	for _, row := range rows {
		result[row.ConversationID] = row.Unread
	}
	return result, nil
}

// ── 用户简表(会话展示用) ──

// IMUserBrief 会话/消息展示用的用户简表。
type IMUserBrief struct {
	ID       uint   `json:"id"`
	Nickname string `json:"nickname"`
	Avatar   string `json:"avatar"`
}

// IMUserBriefsByIDs 批量取用户简表(昵称/头像一条 IN 查询完成解析)。
func IMUserBriefsByIDs(ctx context.Context, ids []uint) (map[uint]IMUserBrief, error) {
	result := make(map[uint]IMUserBrief, len(ids))
	if len(ids) == 0 {
		return result, nil
	}
	var users []model.SysUser
	err := dbFrom(ctx).Model(&model.SysUser{}).
		Select("id, nickname, avatar, status").
		Where("id IN ?", ids).
		Find(&users).Error
	if err != nil {
		return nil, err
	}
	for _, u := range users {
		result[u.ID] = IMUserBrief{ID: u.ID, Nickname: u.Nickname, Avatar: u.Avatar}
	}
	return result, nil
}
