// Package notify 统一通知分发器。
//
// 将站内信(DB落库 + SSE推送) 和 企业微信推送 整合为一处调用。
// 供审批引擎事件监听器、CRM 跟进提醒、站内信发送等场景使用。
package notify

import (
	"context"
	"fmt"

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

// pushWecom 若企业微信已启用并配置凭证,且用户已绑定企业微信,则推送通知。
// 凭证与启用状态都来自 sys_oauth_config(provider=wecom),与「第三方应用」配置页同源
// (不再读 sys_config 的 wecom.*/notification.wecom.enabled,避免配置割裂)。
func pushWecom(ctx context.Context, userID uint, title, content string) {
	cfg, enabled := loadWecomConfig(ctx)
	if !enabled || cfg.CorpID == "" || cfg.Secret == "" {
		return // 未启用或未配置凭证
	}

	// 查用户的企业微信ID
	var wecomUserID string
	err := repository.DBFrom(ctx).Table("sys_user").
		Where("id = ? AND status = 1 AND deleted_at IS NULL", userID).
		Pluck("wecom_user_id", &wecomUserID).Error
	if err != nil || wecomUserID == "" {
		return // 用户未绑定企业微信
	}

	client := wecom.NewClient(cfg)
	// 发送(text 格式,兼容性最好)
	msg := fmt.Sprintf("%s\n%s", title, content)
	if err := client.SendMessage(ctx, wecomUserID, "text", msg); err != nil {
		xlogger.ErrorfCtx(ctx, "企业微信通知推送失败 user=%d wecom=%s: %v", userID, wecomUserID, err)
	} else {
		// 成功也留痕:同一通知若出现两条此日志,即存在重复 Dispatch(曾因双层分发双发企微)
		xlogger.InfofCtx(ctx, "企业微信通知已推送 user=%d wecom=%s title=%s", userID, wecomUserID, title)
	}
}

// loadWecomConfig 从 sys_oauth_config 读取启用的企业微信凭证(优先 enabled 的那条)。
// 返回凭证 + 是否启用;未配置或读取失败时 enabled=false。
func loadWecomConfig(ctx context.Context) (wecom.Config, bool) {
	var c struct {
		AppID     string
		AppSecret string
		AgentID   string
		Enabled   int
	}
	err := repository.DBFrom(ctx).Table("sys_oauth_config").
		Where("provider = ? AND deleted_at IS NULL", "wecom").
		Order("enabled DESC, sort ASC, id DESC").Limit(1).
		Scan(&c).Error
	if err != nil {
		xlogger.ErrorfCtx(ctx, "企业微信通知:读取 sys_oauth_config 失败: %v", err)
		return wecom.Config{}, false
	}
	return wecom.Config{CorpID: c.AppID, Secret: c.AppSecret, AgentID: c.AgentID}, c.Enabled == 1
}
