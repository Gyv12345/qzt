package service

import (
	"context"
	"errors"

	entmodel "qzt-go-server/internal/model/enterprise"
	entrepo "qzt-go-server/internal/repository/enterprise"
)

// message.go 站内信服务。
// 用户互发 + 系统消息(senderId=0)。sendSystemMessage 供定时任务/审批引擎调用。

// MessageService 站内信服务。
type MessageService struct {
	repo *entrepo.MessageRepo
}

func NewMessageService() *MessageService { return &MessageService{repo: entrepo.NewMessageRepo()} }

// SendMessageRequest 用户互发消息请求。
type SendMessageRequest struct {
	ReceiverID uint   `json:"receiver_id" binding:"required"`
	Title      string `json:"title" binding:"required"`
	Content    string `json:"content" binding:"required"`
}

// Send 用户发送消息(校验不能给自己发)。
func (s *MessageService) Send(ctx context.Context, senderID uint, req *SendMessageRequest) error {
	if senderID == req.ReceiverID {
		return errors.New("不能给自己发送消息")
	}
	msg := &entmodel.SysMessage{
		SenderID:   senderID,
		ReceiverID: req.ReceiverID,
		Title:      req.Title,
		Content:    req.Content,
		IsRead:     entmodel.MsgUnread,
	}
	return s.repo.Create(ctx, msg)
}

// SendSystemMessage 系统消息(senderId=0)。供定时任务/审批引擎/事件总线调用。
// 不校验接收人状态,尽量送达;不读登录上下文(定时任务无会话)。
func (s *MessageService) SendSystemMessage(ctx context.Context, receiverID uint, title, content string) error {
	msg := &entmodel.SysMessage{
		SenderID:   entmodel.SystemSenderID,
		ReceiverID: receiverID,
		Title:      title,
		Content:    content,
		IsRead:     entmodel.MsgUnread,
	}
	return s.repo.Create(ctx, msg)
}

// GetUnreadCount 获取当前用户未读消息数。
func (s *MessageService) GetUnreadCount(ctx context.Context, userID uint) (int64, error) {
	return s.repo.CountUnread(ctx, userID)
}

// MarkAsRead 标记单条已读(校验接收人)。
func (s *MessageService) MarkAsRead(ctx context.Context, id, userID uint) error {
	affected, err := s.repo.MarkAsRead(ctx, id, userID)
	if err != nil {
		return err
	}
	if affected == 0 {
		return errors.New("无权操作此消息或消息已读")
	}
	return nil
}

// MarkAllAsRead 全部已读,返回已读条数。
func (s *MessageService) MarkAllAsRead(ctx context.Context, userID uint) (int64, error) {
	return s.repo.MarkAllAsRead(ctx, userID)
}

// MarkAsReadByIds 批量已读,返回已读条数。
func (s *MessageService) MarkAsReadByIds(ctx context.Context, ids []uint, userID uint) (int64, error) {
	return s.repo.MarkAsReadByIds(ctx, ids, userID)
}

// Inbox 收件箱分页。
func (s *MessageService) Inbox(ctx context.Context, page, pageSize int, userID uint) ([]entmodel.SysMessage, int64, error) {
	return s.repo.PageInbox(ctx, page, pageSize, userID)
}

// Outbox 发件箱分页。
func (s *MessageService) Outbox(ctx context.Context, page, pageSize int, userID uint) ([]entmodel.SysMessage, int64, error) {
	return s.repo.PageOutbox(ctx, page, pageSize, userID)
}

// GetByID 消息详情(校验接收人或发送人之一)。
func (s *MessageService) GetByID(ctx context.Context, id, userID uint) (*entmodel.SysMessage, error) {
	msg, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, errors.New("消息不存在")
	}
	if msg.ReceiverID != userID && msg.SenderID != userID {
		return nil, errors.New("无权查看此消息")
	}
	return msg, nil
}

// Delete 删除消息(校验接收人)。
func (s *MessageService) Delete(ctx context.Context, id, userID uint) error {
	msg, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return errors.New("消息不存在")
	}
	if msg.ReceiverID != userID {
		return errors.New("无权删除此消息")
	}
	return s.repo.Delete(ctx, id)
}
