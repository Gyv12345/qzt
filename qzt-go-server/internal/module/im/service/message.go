// message.go 即时通讯(IM)消息业务逻辑:消息分页、发送、SSE 实时推送。
package service

import (
	"context"
	"encoding/json"
	"strings"
	"time"

	immodel "qzt-go-server/internal/model/im"
	"qzt-go-server/internal/pkg/sse"
	"qzt-go-server/internal/repository"
	"qzt-go-server/pkg/xlogger"
)

// IMSendMessageRequest 发送消息。
// 命名带 IM 前缀:swag 按「包名.类型名」解析注解,而 oa/service 也有
// SendMessageRequest,同名会在 swagger 生成时产生歧义,故此处加前缀避让。
type IMSendMessageRequest struct {
	Content     string `json:"content" binding:"required"`
	ContentType string `json:"content_type"`
}

// imPushBody SSE 推送 body 的 JSON 结构
// (作为字符串放入 sse.Message.Body,前端 JSON.parse 后使用)。
type imPushBody struct {
	ConversationID uint        `json:"conversation_id"`
	ConvType       string      `json:"conv_type"`
	ConvName       string      `json:"conv_name"`
	Message        *MessageDTO `json:"message"`
}

// MessageService IM 消息服务。
type MessageService struct {
	convRepo   *repository.ConversationRepo
	memberRepo *repository.ConversationMemberRepo
	msgRepo    *repository.MessageRepo
}

// NewMessageService 构造。
func NewMessageService() *MessageService {
	return &MessageService{
		convRepo:   repository.NewConversationRepo(),
		memberRepo: repository.NewConversationMemberRepo(),
		msgRepo:    repository.NewMessageRepo(),
	}
}

// requireMember 会话存在且我是成员校验(与 ConversationService 共用实现)。
func (s *MessageService) requireMember(ctx context.Context, me, convID uint) (*immodel.IMConversationMember, *immodel.IMConversation, error) {
	return requireMember(ctx, s.convRepo, s.memberRepo, me, convID)
}

// ListMessages 会话消息分页(按 id 倒序,before_id 独占——加载更早一页)。
// 仅成员可读;limit 默认 20,钳制 1..50。
func (s *MessageService) ListMessages(ctx context.Context, me, convID, beforeID uint, limit int) ([]MessageDTO, error) {
	if _, _, err := s.requireMember(ctx, me, convID); err != nil {
		return nil, err
	}
	if limit <= 0 {
		limit = 20
	}
	if limit > 50 {
		limit = 50
	}
	msgs, err := s.msgRepo.ListPage(ctx, convID, beforeID, limit)
	if err != nil {
		return nil, err
	}
	if len(msgs) == 0 {
		return []MessageDTO{}, nil
	}
	senderIDs := make([]uint, 0, len(msgs))
	seen := make(map[uint]struct{}, len(msgs))
	for _, m := range msgs {
		if _, ok := seen[m.SenderID]; !ok {
			seen[m.SenderID] = struct{}{}
			senderIDs = append(senderIDs, m.SenderID)
		}
	}
	briefs, err := userBriefs(ctx, senderIDs)
	if err != nil {
		return nil, err
	}
	dtos := make([]MessageDTO, 0, len(msgs))
	for i := range msgs {
		dtos = append(dtos, *buildMessageDTO(&msgs[i], briefs))
	}
	return dtos, nil
}

// SendMessage 发送消息(仅成员):插消息 → 回填会话最新消息 → SSE 推送全部成员(含发送人)。
func (s *MessageService) SendMessage(ctx context.Context, me, convID uint, req IMSendMessageRequest) (*MessageDTO, error) {
	_, conv, err := s.requireMember(ctx, me, convID)
	if err != nil {
		return nil, err
	}
	content := strings.TrimSpace(req.Content)
	if content == "" {
		return nil, newValidation("消息内容不能为空")
	}
	contentType := req.ContentType
	if contentType == "" {
		contentType = immodel.MsgTypeText
	}
	if contentType != immodel.MsgTypeText {
		return nil, newValidation("暂仅支持文本消息")
	}

	// 发送人昵称/头像(DTO 与推送 Title 都要用;插库前解析,失败即整体失败)
	briefs, err := userBriefs(ctx, []uint{me})
	if err != nil {
		return nil, err
	}
	senderName := briefs[me].Nickname

	var msg *immodel.IMMessage
	err = repository.Transaction(ctx, func(ctx context.Context) error {
		m := &immodel.IMMessage{
			ConversationID: convID,
			SenderID:       me,
			ContentType:    contentType,
			Content:        content,
		}
		if err := s.msgRepo.Create(ctx, m); err != nil {
			return err
		}
		if err := s.convRepo.TouchLastMessage(ctx, convID, m.ID, time.Now()); err != nil {
			return err
		}
		msg = m
		return nil
	})
	if err != nil {
		return nil, err
	}

	// SSE 推送(事务已提交;尽力而为,hub 满则丢弃,不影响发送结果)
	s.pushNewMessage(ctx, conv, msg, senderName)
	dto := buildMessageDTO(msg, briefs)
	return dto, nil
}

// pushNewMessage 向会话全部成员(含发送人)推送 im_message SSE 事件。
// body 为 JSON 字符串:
// {"conversation_id":1,"conv_type":"single","conv_name":"王五","message":{...消息对象...}}
// conv_name:群聊=群名;单聊=接收者视角的对端昵称(发送人视角同理取对方)。
func (s *MessageService) pushNewMessage(ctx context.Context, conv *immodel.IMConversation, msg *immodel.IMMessage, senderName string) {
	members, err := s.memberRepo.ListByConversation(ctx, conv.ID)
	if err != nil {
		xlogger.ErrorfCtx(ctx, "[im] push list members failed conv=%d err=%v", conv.ID, err)
		return
	}
	if len(members) == 0 {
		return
	}
	ids := make([]uint, 0, len(members))
	for _, m := range members {
		ids = append(ids, m.UserID)
	}
	briefs, err := userBriefs(ctx, ids)
	if err != nil {
		xlogger.ErrorfCtx(ctx, "[im] push resolve briefs failed conv=%d err=%v", conv.ID, err)
		briefs = map[uint]repository.IMUserBrief{}
	}
	for _, m := range members {
		convName := conv.Name
		if conv.Type == immodel.ConvTypeSingle {
			// 单聊:该接收者视角的对端昵称(自聊兜底为自己)
			peerID := singlePeerID(m.UserID, members)
			if b, ok := briefs[peerID]; ok {
				convName = b.Nickname
			}
		}
		body := imPushBody{
			ConversationID: conv.ID,
			ConvType:       conv.Type,
			ConvName:       convName,
			Message:        buildMessageDTO(msg, briefs),
		}
		data, err := json.Marshal(body)
		if err != nil {
			xlogger.ErrorfCtx(ctx, "[im] push marshal failed conv=%d err=%v", conv.ID, err)
			return
		}
		sse.Global.Push(m.UserID, sse.Message{
			Event: "im_message",
			Title: senderName,
			Body:  string(data),
		})
	}
}
