// Package service 即时通讯(IM)业务逻辑。
// 会话:列表(未读数/最新消息/单聊对端解析)、单聊幂等创建、群聊创建、已读游标、成员管理。
package service

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"

	"gorm.io/gorm"

	"qzt-go-server/internal/model/base"
	immodel "qzt-go-server/internal/model/im"
	"qzt-go-server/internal/repository"
	"qzt-go-server/pkg/xtime"
)

// ── 业务错误(Handler 据此映射响应码) ──

var (
	// ErrNotMember 非会话成员(读取/发言/成员管理的统一拦截)。
	ErrNotMember = errors.New("不是会话成员")
	// ErrConvNotFound 会话不存在或已删除。
	ErrConvNotFound = errors.New("会话不存在")
	// ErrNotGroup 该操作仅群聊会话支持。
	ErrNotGroup = errors.New("该操作仅群聊会话支持")
	// ErrTargetUserNotFound 目标用户不存在。
	ErrTargetUserNotFound = errors.New("目标用户不存在")
	// ErrTargetUserDisabled 目标用户已禁用。
	ErrTargetUserDisabled = errors.New("目标用户已禁用")
	// ErrValidation 参数校验失败的哨兵(具体文案见 validationError)。
	ErrValidation = errors.New("参数错误")
)

// validationError 参数校验错误:文案即错误信息,errors.Is 匹配 ErrValidation。
type validationError struct{ msg string }

func (e *validationError) Error() string { return e.msg }
func (e *validationError) Is(target error) bool {
	return target == ErrValidation
}

func newValidation(format string, args ...any) error {
	return &validationError{msg: fmt.Sprintf(format, args...)}
}

// ── DTO(与前端约定的固定契约) ──

// PeerInfo 单聊对端用户信息。
type PeerInfo struct {
	ID       uint   `json:"id"`
	Nickname string `json:"nickname"`
	Avatar   string `json:"avatar"`
}

// MessageDTO 消息对象(会话列表最新一条与消息分页共用)。
type MessageDTO struct {
	ID             uint           `json:"id"`
	ConversationID uint           `json:"conversation_id"`
	SenderID       uint           `json:"sender_id"`
	SenderName     string         `json:"sender_name"`
	SenderAvatar   string         `json:"sender_avatar"`
	ContentType    string         `json:"content_type"`
	Content        string         `json:"content"`
	CreatedAt      xtime.DateTime `json:"created_at"`
}

// ConversationDTO 会话对象。
type ConversationDTO struct {
	ID            uint           `json:"id"`
	Type          string         `json:"type"`
	Name          string         `json:"name"`
	OwnerID       uint           `json:"owner_id"`
	MemberCount   int64          `json:"member_count"`
	Peer          *PeerInfo      `json:"peer"`
	Unread        int64          `json:"unread"`
	LastMessage   *MessageDTO    `json:"last_message"`
	LastMessageAt xtime.DateTime `json:"last_message_at"`
}

// ── 请求/结果对象 ──

// CreateSingleRequest 创建单聊。
type CreateSingleRequest struct {
	TargetUserID uint `json:"target_user_id" binding:"required"`
}

// CreateGroupRequest 创建群聊。
type CreateGroupRequest struct {
	Name      string `json:"name" binding:"required"`
	MemberIDs []uint `json:"member_ids"`
}

// AddMembersRequest 添加群成员。
type AddMembersRequest struct {
	UserIDs []uint `json:"user_ids" binding:"required"`
}

// MarkReadResult 标记已读结果。
type MarkReadResult struct {
	LastReadMessageID uint `json:"last_read_message_id"`
}

// AddMembersResult 添加成员结果。
type AddMembersResult struct {
	Added int `json:"added"`
}

// RemoveMemberResult 移除成员结果。
type RemoveMemberResult struct {
	Removed bool `json:"removed"`
}

// ── 会话服务 ──

// ConversationService IM 会话服务。
type ConversationService struct {
	convRepo   *repository.ConversationRepo
	memberRepo *repository.ConversationMemberRepo
	msgRepo    *repository.MessageRepo
}

// NewConversationService 构造。
func NewConversationService() *ConversationService {
	return &ConversationService{
		convRepo:   repository.NewConversationRepo(),
		memberRepo: repository.NewConversationMemberRepo(),
		msgRepo:    repository.NewMessageRepo(),
	}
}

// convKey 单聊幂等键:双方用户ID 取 min_max(如 "1_5")。
func convKey(a, b uint) string {
	if a > b {
		a, b = b, a
	}
	return fmt.Sprintf("%d_%d", a, b)
}

// userBriefs 批量解析用户昵称/头像。
func userBriefs(ctx context.Context, ids []uint) (map[uint]repository.IMUserBrief, error) {
	return repository.IMUserBriefsByIDs(ctx, ids)
}

// requireMember 校验会话存在且我是成员,返回成员行与会话(会话/消息两个服务共用)。
func requireMember(ctx context.Context, convRepo *repository.ConversationRepo,
	memberRepo *repository.ConversationMemberRepo, me, convID uint) (*immodel.IMConversationMember, *immodel.IMConversation, error) {
	conv, err := convRepo.GetByID(ctx, convID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil, ErrConvNotFound
		}
		return nil, nil, err
	}
	member, err := memberRepo.GetByConvAndUser(ctx, convID, me)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil, ErrNotMember
		}
		return nil, nil, err
	}
	return member, conv, nil
}

// requireMember 会话存在且我是成员校验。
func (s *ConversationService) requireMember(ctx context.Context, me, convID uint) (*immodel.IMConversationMember, *immodel.IMConversation, error) {
	return requireMember(ctx, s.convRepo, s.memberRepo, me, convID)
}

// buildMessageDTO 消息 → DTO(发送人昵称/头像从 briefs 解析)。
func buildMessageDTO(m *immodel.IMMessage, briefs map[uint]repository.IMUserBrief) *MessageDTO {
	dto := &MessageDTO{
		ID:             m.ID,
		ConversationID: m.ConversationID,
		SenderID:       m.SenderID,
		ContentType:    m.ContentType,
		Content:        m.Content,
		CreatedAt:      m.CreatedAt,
	}
	if b, ok := briefs[m.SenderID]; ok {
		dto.SenderName = b.Nickname
		dto.SenderAvatar = b.Avatar
	}
	return dto
}

// singlePeerID 单聊里"我"对端的用户ID(自聊会话兜底为本人)。
func singlePeerID(me uint, members []immodel.IMConversationMember) uint {
	peerID := me
	for _, m := range members {
		if m.UserID != me {
			peerID = m.UserID
			break
		}
	}
	return peerID
}

// buildConversationDTO 组装会话 DTO(纯内存组装,不查库)。
func buildConversationDTO(conv *immodel.IMConversation, members []immodel.IMConversationMember,
	memberCount, unread int64, lastMsg *immodel.IMMessage, briefs map[uint]repository.IMUserBrief, me uint) ConversationDTO {
	dto := ConversationDTO{
		ID:            conv.ID,
		Type:          conv.Type,
		Name:          conv.Name,
		OwnerID:       conv.OwnerID,
		MemberCount:   memberCount,
		Unread:        unread,
		LastMessageAt: conv.LastMessageAt,
	}
	if conv.Type == immodel.ConvTypeSingle {
		peerID := singlePeerID(me, members)
		if b, ok := briefs[peerID]; ok {
			dto.Peer = &PeerInfo{ID: b.ID, Nickname: b.Nickname, Avatar: b.Avatar}
			// 契约:单聊会话 name = 对端昵称
			dto.Name = b.Nickname
		}
	}
	if lastMsg != nil {
		dto.LastMessage = buildMessageDTO(lastMsg, briefs)
	}
	return dto
}

// getConversationDTO 加载单个会话的展示数据(成员/对端/最新消息)并组装 DTO。
func (s *ConversationService) getConversationDTO(ctx context.Context, conv *immodel.IMConversation, me uint, unread int64) (*ConversationDTO, error) {
	members, err := s.memberRepo.ListByConversation(ctx, conv.ID)
	if err != nil {
		return nil, err
	}
	ids := make([]uint, 0, len(members))
	for _, m := range members {
		ids = append(ids, m.UserID)
	}
	briefs, err := userBriefs(ctx, ids)
	if err != nil {
		return nil, err
	}
	var lastMsg *immodel.IMMessage
	if conv.LastMessageID > 0 {
		msgs, err := s.msgRepo.ListByIDs(ctx, []uint{conv.LastMessageID})
		if err != nil {
			return nil, err
		}
		if len(msgs) > 0 {
			lastMsg = &msgs[0]
		}
	}
	dto := buildConversationDTO(conv, members, int64(len(members)), unread, lastMsg, briefs, me)
	return &dto, nil
}

// ListConversations 我的会话列表(按最新消息时间倒序,无消息排最后)。
func (s *ConversationService) ListConversations(ctx context.Context, me uint) ([]ConversationDTO, error) {
	members, err := s.memberRepo.ListByUser(ctx, me)
	if err != nil {
		return nil, err
	}
	if len(members) == 0 {
		return []ConversationDTO{}, nil
	}
	convIDs := make([]uint, 0, len(members))
	for _, m := range members {
		convIDs = append(convIDs, m.ConversationID)
	}
	convs, err := s.convRepo.ListByIDs(ctx, convIDs)
	if err != nil {
		return nil, err
	}
	if len(convs) == 0 {
		return []ConversationDTO{}, nil
	}
	activeIDs := make([]uint, 0, len(convs))
	for _, c := range convs {
		activeIDs = append(activeIDs, c.ID)
	}

	convMembers, err := s.memberRepo.ListByConversations(ctx, activeIDs)
	if err != nil {
		return nil, err
	}
	membersByConv := make(map[uint][]immodel.IMConversationMember, len(activeIDs))
	userIDSet := make(map[uint]struct{})
	for _, m := range convMembers {
		membersByConv[m.ConversationID] = append(membersByConv[m.ConversationID], m)
		userIDSet[m.UserID] = struct{}{}
	}
	allUserIDs := make([]uint, 0, len(userIDSet))
	for id := range userIDSet {
		allUserIDs = append(allUserIDs, id)
	}
	briefs, err := userBriefs(ctx, allUserIDs)
	if err != nil {
		return nil, err
	}
	counts, err := s.memberRepo.MemberCountsByConversation(ctx, activeIDs)
	if err != nil {
		return nil, err
	}
	unread, err := repository.UnreadCountsByUser(ctx, me, activeIDs)
	if err != nil {
		return nil, err
	}
	lastIDs := make([]uint, 0, len(convs))
	for _, c := range convs {
		if c.LastMessageID > 0 {
			lastIDs = append(lastIDs, c.LastMessageID)
		}
	}
	lastMsgByID := make(map[uint]immodel.IMMessage, len(lastIDs))
	if len(lastIDs) > 0 {
		lastMsgs, err := s.msgRepo.ListByIDs(ctx, lastIDs)
		if err != nil {
			return nil, err
		}
		for _, m := range lastMsgs {
			lastMsgByID[m.ID] = m
		}
	}

	dtos := make([]ConversationDTO, 0, len(convs))
	for i := range convs {
		conv := &convs[i]
		var lastMsg *immodel.IMMessage
		if conv.LastMessageID > 0 {
			if m, ok := lastMsgByID[conv.LastMessageID]; ok {
				lastMsg = &m
			}
		}
		dtos = append(dtos, buildConversationDTO(conv, membersByConv[conv.ID],
			counts[conv.ID], unread[conv.ID], lastMsg, briefs, me))
	}
	// 最新消息时间倒序(零值/NULL 靠后),同时间按会话 ID 倒序保持稳定。
	sort.SliceStable(dtos, func(i, j int) bool {
		ti := time.Time(dtos[i].LastMessageAt)
		tj := time.Time(dtos[j].LastMessageAt)
		if !ti.Equal(tj) {
			return ti.After(tj)
		}
		return dtos[i].ID > dtos[j].ID
	})
	return dtos, nil
}

// CreateSingle 创建(或返回已有)单聊。幂等键 conv_key="min_max"。
func (s *ConversationService) CreateSingle(ctx context.Context, me uint, req CreateSingleRequest) (*ConversationDTO, error) {
	target, err := repository.NewUserRepo().GetByID(ctx, req.TargetUserID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrTargetUserNotFound
		}
		return nil, err
	}
	if target.Status != base.StatusEnabled {
		return nil, ErrTargetUserDisabled
	}
	key := convKey(me, req.TargetUserID)

	// 幂等:已存在直接返回(unread 按契约固定 0)。
	existing, err := s.convRepo.GetByConvKey(ctx, key)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}
	if existing != nil {
		return s.getConversationDTO(ctx, existing, me, 0)
	}

	var conv *immodel.IMConversation
	err = repository.Transaction(ctx, func(ctx context.Context) error {
		c := &immodel.IMConversation{
			Type:    immodel.ConvTypeSingle,
			Name:    "",
			OwnerID: me,
			ConvKey: &key,
		}
		if err := s.convRepo.Create(ctx, c); err != nil {
			return err
		}
		// 自聊(给自己发消息)双方为同一人,只建一条成员行。
		ms := []immodel.IMConversationMember{
			{ConversationID: c.ID, UserID: me},
			{ConversationID: c.ID, UserID: req.TargetUserID},
		}
		if me == req.TargetUserID {
			ms = ms[:1]
		}
		if err := s.memberRepo.CreateBatch(ctx, ms); err != nil {
			return err
		}
		conv = c
		return nil
	})
	if err != nil {
		return nil, err
	}
	return s.getConversationDTO(ctx, conv, me, 0)
}

// CreateGroup 创建群聊(创建人自动入群,成员去重且忽略创建人自身)。
func (s *ConversationService) CreateGroup(ctx context.Context, me uint, req CreateGroupRequest) (*ConversationDTO, error) {
	name := strings.TrimSpace(req.Name)
	if name == "" {
		return nil, newValidation("群名称不能为空")
	}
	// 成员去重 + 排除创建人
	idSet := make(map[uint]struct{}, len(req.MemberIDs))
	ids := make([]uint, 0, len(req.MemberIDs))
	for _, id := range req.MemberIDs {
		if id == 0 || id == me {
			continue
		}
		if _, ok := idSet[id]; ok {
			continue
		}
		idSet[id] = struct{}{}
		ids = append(ids, id)
	}
	if len(ids) > 0 {
		briefs, err := userBriefs(ctx, ids)
		if err != nil {
			return nil, err
		}
		missing := make([]uint, 0)
		for _, id := range ids {
			if _, ok := briefs[id]; !ok {
				missing = append(missing, id)
			}
		}
		if len(missing) > 0 {
			return nil, newValidation("以下用户不存在: %v", missing)
		}
	}

	var conv *immodel.IMConversation
	err := repository.Transaction(ctx, func(ctx context.Context) error {
		c := &immodel.IMConversation{
			Type:    immodel.ConvTypeGroup,
			Name:    name,
			OwnerID: me,
			// ConvKey 保持 nil → 落库 NULL,不占 uk_conv_key 唯一索引
		}
		if err := s.convRepo.Create(ctx, c); err != nil {
			return err
		}
		ms := make([]immodel.IMConversationMember, 0, len(ids)+1)
		ms = append(ms, immodel.IMConversationMember{ConversationID: c.ID, UserID: me})
		for _, id := range ids {
			ms = append(ms, immodel.IMConversationMember{ConversationID: c.ID, UserID: id})
		}
		if err := s.memberRepo.CreateBatch(ctx, ms); err != nil {
			return err
		}
		conv = c
		return nil
	})
	if err != nil {
		return nil, err
	}
	return s.getConversationDTO(ctx, conv, me, 0)
}

// MarkRead 标记会话已读:已读游标推进到会话最新一条消息(无消息则 0)。
func (s *ConversationService) MarkRead(ctx context.Context, me, convID uint) (*MarkReadResult, error) {
	member, _, err := s.requireMember(ctx, me, convID)
	if err != nil {
		return nil, err
	}
	latest, err := s.msgRepo.LatestID(ctx, convID)
	if err != nil {
		return nil, err
	}
	if err := s.memberRepo.UpdateLastRead(ctx, member.ID, latest); err != nil {
		return nil, err
	}
	return &MarkReadResult{LastReadMessageID: latest}, nil
}

// AddMembers 添加群成员(成员可加;校验用户存在;跳过已是成员;输入去重)。
func (s *ConversationService) AddMembers(ctx context.Context, me, convID uint, req AddMembersRequest) (*AddMembersResult, error) {
	_, conv, err := s.requireMember(ctx, me, convID)
	if err != nil {
		return nil, err
	}
	if conv.Type != immodel.ConvTypeGroup {
		return nil, ErrNotGroup
	}
	idSet := make(map[uint]struct{}, len(req.UserIDs))
	ids := make([]uint, 0, len(req.UserIDs))
	for _, id := range req.UserIDs {
		if id == 0 {
			continue
		}
		if _, ok := idSet[id]; ok {
			continue
		}
		idSet[id] = struct{}{}
		ids = append(ids, id)
	}
	if len(ids) == 0 {
		return &AddMembersResult{Added: 0}, nil
	}
	briefs, err := userBriefs(ctx, ids)
	if err != nil {
		return nil, err
	}
	missing := make([]uint, 0)
	for _, id := range ids {
		if _, ok := briefs[id]; !ok {
			missing = append(missing, id)
		}
	}
	if len(missing) > 0 {
		return nil, newValidation("以下用户不存在: %v", missing)
	}
	existing, err := s.memberRepo.ExistingUserIDs(ctx, convID, ids)
	if err != nil {
		return nil, err
	}
	existingSet := make(map[uint]struct{}, len(existing))
	for _, id := range existing {
		existingSet[id] = struct{}{}
	}
	newIDs := make([]uint, 0, len(ids))
	for _, id := range ids {
		if _, ok := existingSet[id]; !ok {
			newIDs = append(newIDs, id)
		}
	}
	if len(newIDs) == 0 {
		return &AddMembersResult{Added: 0}, nil
	}
	ms := make([]immodel.IMConversationMember, 0, len(newIDs))
	for _, id := range newIDs {
		ms = append(ms, immodel.IMConversationMember{ConversationID: convID, UserID: id})
	}
	if err := s.memberRepo.CreateBatch(ctx, ms); err != nil {
		return nil, err
	}
	return &AddMembersResult{Added: len(newIDs)}, nil
}

// RemoveMember 移除群成员(成员行硬删除)。
// 自退:非群主直接退;群主退群自动转移群主给最早加入的剩余成员,无人则解散(软删会话)。
// 移除他人:v1 任意成员可移除其他成员;若移除的是群主,同样走转移/解散逻辑。
func (s *ConversationService) RemoveMember(ctx context.Context, me, convID, targetID uint) (*RemoveMemberResult, error) {
	_, conv, err := s.requireMember(ctx, me, convID)
	if err != nil {
		return nil, err
	}
	if conv.Type != immodel.ConvTypeGroup {
		return nil, ErrNotGroup
	}
	if targetID == 0 {
		return nil, newValidation("参数错误")
	}
	if _, err := s.memberRepo.GetByConvAndUser(ctx, convID, targetID); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, newValidation("该用户不是会话成员")
		}
		return nil, err
	}
	if err := s.removeMemberTx(ctx, conv, targetID); err != nil {
		return nil, err
	}
	return &RemoveMemberResult{Removed: true}, nil
}

// removeMemberTx 移除成员并按需转移群主/解散(单事务)。
func (s *ConversationService) removeMemberTx(ctx context.Context, conv *immodel.IMConversation, targetID uint) error {
	return repository.Transaction(ctx, func(ctx context.Context) error {
		if err := s.memberRepo.HardDeleteMember(ctx, conv.ID, targetID); err != nil {
			return err
		}
		// 被移除的不是群主,到此结束。
		if targetID != conv.OwnerID {
			return nil
		}
		remaining, err := s.memberRepo.ListByConversation(ctx, conv.ID)
		if err != nil {
			return err
		}
		if len(remaining) == 0 {
			// 无人剩余:清空成员行并软删除会话(解散)。
			if err := s.memberRepo.HardDeleteByConversation(ctx, conv.ID); err != nil {
				return err
			}
			return s.convRepo.Delete(ctx, conv.ID)
		}
		// 转移群主给最早加入的剩余成员(ListByConversation 按 id ASC)。
		newOwner := remaining[0]
		return s.convRepo.Update(ctx, &immodel.IMConversation{ID: conv.ID, OwnerID: newOwner.UserID}, "OwnerID")
	})
}
