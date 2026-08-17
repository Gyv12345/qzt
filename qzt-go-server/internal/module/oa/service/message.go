package service

import (
	"context"
	"errors"

	oamodel "qzt-go-server/internal/model/oa"
	"qzt-go-server/internal/pkg/notify"
	oarepo "qzt-go-server/internal/repository/oa"
)

// message.go OA 站内信服务。
// 用户互发(Markdown) + 系统消息(senderId=0) + SSE 实时推送。

type MessageService struct {
	repo *oarepo.MessageRepo
}

func NewMessageService() *MessageService { return &MessageService{repo: oarepo.NewMessageRepo()} }

type SendMessageRequest struct {
	ReceiverID  uint   `json:"receiver_id" binding:"required"`
	Title       string `json:"title" binding:"required"`
	Content     string `json:"content" binding:"required"`
	ContentType string `json:"content_type"`
}

// Send 用户发送消息。
func (s *MessageService) Send(ctx context.Context, senderID uint, req *SendMessageRequest) error {
	if senderID == req.ReceiverID {
		return errors.New("不能给自己发送消息")
	}
	if req.ContentType == "" {
		req.ContentType = "text"
	}
	msg := &oamodel.OaMessage{
		SenderID:    senderID,
		ReceiverID:  req.ReceiverID,
		Title:       req.Title,
		Content:     req.Content,
		ContentType: req.ContentType,
		IsRead:      oamodel.MsgUnread,
	}
	if err := s.repo.Create(ctx, msg); err != nil {
		return err
	}
	// 通知分发(SSE + 企业微信)
	notify.Dispatch(ctx, req.ReceiverID, req.Title, req.Content, "/oa/message")
	return nil
}

// SendSystemMessage 系统消息(senderId=0),点击跳消息中心。供跟进提醒等通用场景调用。
func (s *MessageService) SendSystemMessage(ctx context.Context, receiverID uint, title, content string) error {
	return s.SendSystemMessageWithPath(ctx, receiverID, title, content, "/oa/message")
}

// SendSystemMessageWithPath 系统消息 + 指定点击跳转路径。
// 注意:内部已含通知分发(SSE+企微),调用方不要再调 notify.Dispatch,否则用户收到两条。
func (s *MessageService) SendSystemMessageWithPath(ctx context.Context, receiverID uint, title, content, path string) error {
	msg := &oamodel.OaMessage{
		SenderID:    oamodel.SystemSenderID,
		ReceiverID:  receiverID,
		Title:       title,
		Content:     content,
		ContentType: "text",
		IsRead:      oamodel.MsgUnread,
	}
	if err := s.repo.Create(ctx, msg); err != nil {
		return err
	}
	// 通知分发(SSE + 企业微信)
	notify.Dispatch(ctx, receiverID, title, content, path)
	return nil
}

func (s *MessageService) GetUnreadCount(ctx context.Context, userID uint) (int64, error) {
	return s.repo.CountUnread(ctx, userID)
}

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

func (s *MessageService) MarkAllAsRead(ctx context.Context, userID uint) (int64, error) {
	return s.repo.MarkAllAsRead(ctx, userID)
}

func (s *MessageService) MarkAsReadByIds(ctx context.Context, ids []uint, userID uint) (int64, error) {
	return s.repo.MarkAsReadByIds(ctx, ids, userID)
}

func (s *MessageService) Inbox(ctx context.Context, page, pageSize int, userID uint) ([]oamodel.OaMessage, int64, error) {
	return s.repo.PageInbox(ctx, page, pageSize, userID)
}

func (s *MessageService) Outbox(ctx context.Context, page, pageSize int, userID uint) ([]oamodel.OaMessage, int64, error) {
	return s.repo.PageOutbox(ctx, page, pageSize, userID)
}

func (s *MessageService) GetByID(ctx context.Context, id, userID uint) (*oamodel.OaMessage, error) {
	msg, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, errors.New("消息不存在")
	}
	if msg.ReceiverID != userID && msg.SenderID != userID {
		return nil, errors.New("无权查看此消息")
	}
	return msg, nil
}

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
