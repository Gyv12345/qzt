// Package notify 统一通知分发器。
//
// 将站内信(DB落库 + SSE推送) 和 企业微信推送 整合为一处调用。
// 供审批引擎事件监听器、CRM 跟进提醒、站内信发送等场景使用。
package notify

import (
	"context"
	"fmt"

	"qzt-go-server/internal/pkg/setting"
	"qzt-go-server/internal/pkg/sse"
	"qzt-go-server/internal/pkg/wecom"
	"qzt-go-server/internal/repository"
	"qzt-go-server/pkg/xlogger"
)

// Dispatch 向用户发送通知(DB消息 + SSE推送 + 企业微信推送)。
// receiverID: 接收人用户ID
// title/content: 通知内容
// path: 点击跳转路径(SSE推送给前端)
func Dispatch(ctx context.Context, receiverID uint, title, content, path string) {
	// 1. SSE 实时推送(总是执行)
	sse.Global.Push(receiverID, sse.Message{
		Event: "message",
		Title: title,
		Body:  content,
		Path:  path,
	})

	// 2. 企业微信推送(需配置 + 用户绑定 + 开关开启)
	pushWecom(ctx, receiverID, title, content)
}

// pushWecom 如果用户绑定了企业微信且全局开关开启,推送企业微信通知。
func pushWecom(ctx context.Context, userID uint, title, content string) {
	// 检查全局开关
	enabled := setting.Get(ctx, "notification.wecom.enabled")
	if enabled != "1" && enabled != "true" {
		return
	}

	// 查用户的企业微信ID
	var wecomUserID string
	err := repository.DBFrom(ctx).Table("sys_user").
		Where("id = ? AND status = 1 AND deleted_at IS NULL", userID).
		Pluck("wecom_user_id", &wecomUserID).Error
	if err != nil || wecomUserID == "" {
		return // 用户未绑定企业微信
	}

	// 获取企业微信客户端
	cfg := loadWecomConfig(ctx)
	if cfg.CorpID == "" || cfg.Secret == "" {
		return
	}
	client := wecom.NewClient(cfg)

	// 发送(text 格式,兼容性最好)
	msg := fmt.Sprintf("%s\n%s", title, content)
	if err := client.SendMessage(ctx, wecomUserID, "text", msg); err != nil {
		xlogger.ErrorfCtx(ctx, "企业微信通知推送失败 user=%d wecom=%s: %v", userID, wecomUserID, err)
	}
}

// loadWecomConfig 从 sys_config 读取企业微信配置。
func loadWecomConfig(ctx context.Context) wecom.Config {
	return wecom.Config{
		CorpID:  setting.Get(ctx, "wecom.corp_id"),
		Secret:  setting.Get(ctx, "wecom.secret"),
		AgentID: setting.Get(ctx, "wecom.agent_id"),
	}
}
