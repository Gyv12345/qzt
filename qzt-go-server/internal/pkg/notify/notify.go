// Package notify 统一通知分发器。
//
// 将站内信(DB落库 + SSE推送)、企业微信推送、微信服务号模板消息整合为一处调用。
// 供审批引擎事件监听器、CRM 跟进提醒、站内信发送等场景使用。
package notify

import (
	"context"
	"encoding/json"
	"fmt"
	"net/url"
	"strings"

	"qzt-go-server/internal/pkg/demoguard"
	"qzt-go-server/internal/pkg/dingtalk"
	"qzt-go-server/internal/pkg/feishu"
	"qzt-go-server/internal/pkg/setting"
	"qzt-go-server/internal/pkg/sse"
	"qzt-go-server/internal/pkg/wecom"
	"qzt-go-server/internal/pkg/wxmp"
	"qzt-go-server/internal/repository"
	"qzt-go-server/pkg/xlogger"
)

// 外部 IM 工作通知渠道(sys_config notify.external_channel 合法值)。
const (
	NotifyChannelWecom    = "wecom"    // 企业微信应用消息(默认,历史行为)
	NotifyChannelDingtalk = "dingtalk" // 钉钉工作通知(P32)
	NotifyChannelFeishu   = "feishu"   // 飞书消息推送(P32)
	NotifyChannelNone     = "none"     // 关闭外部 IM 推送(仅站内信)
)

// NotifyExternalChannelConfigKey 外部通知通道路由的 sys_config 键。
const NotifyExternalChannelConfigKey = "notify.external_channel"

// NormalizeExternalChannel 归一 notify.external_channel 配置:
// 空/非法回落默认 'wecom'(与历史行为一致);合法值 wecom/dingtalk/feishu/none。
func NormalizeExternalChannel(v string) string {
	v = strings.ToLower(strings.TrimSpace(v))
	switch v {
	case "":
		return NotifyChannelWecom
	case NotifyChannelWecom, NotifyChannelDingtalk, NotifyChannelFeishu, NotifyChannelNone:
		return v
	default:
		return NotifyChannelWecom
	}
}

// Dispatch 向用户发送通知(DB消息 + SSE推送 + 外部IM工作通知 + 微信服务号模板消息)。
// receiverID: 接收人用户ID
// title/content: 通知内容
// path: 点击跳转路径(SSE推送给前端,也用于微信通知的跳转链接)
func Dispatch(ctx context.Context, receiverID uint, title, content, path string) {
	// 1. SSE 实时推送(总是执行)
	sse.Global.Push(receiverID, sse.Message{
		Event: "message",
		Title: title,
		Body:  content,
		Path:  path,
	})

	// 演示模式护栏:外部通道(企微/钉钉/飞书/服务号模板消息)整体降级为仅站内信——公开
	// 演示期间访客可编排工作流 notify 节点、互发站内信、触发审批事件等,外部
	// 通道不拦等于开放对真实用户企微/微信的轰炸入口;站内信落库不受影响。
	// 豁免(P29 需求④):官网留言/独立站询盘的到站通知是真实销售线索通道,
	// 标题含「官网线索/独立站询盘/独立站订单」时即使 demo 模式仍走企微送达
	// 真实负责人(P28-B 补「独立站订单」:真实收款订单通知必须送达)。
	externalBlocked := demoguard.Enabled(ctx) && !isOfficialLeadNotice(title)

	// 2. 外部 IM 工作通知(通道路由:sys_config notify.external_channel,
	//    默认 wecom;可选 dingtalk/feishu/none。收件人按 sys_user 外部绑定 id,
	//    未绑定的收件人跳过外推,仅收站内信)
	if !externalBlocked {
		pushWorkNotice(ctx, receiverID, title, content)
	}

	// 3. 微信服务号模板消息(独立通道,需配置 + 用户绑定 openid + 模板ID;
	//    不受 IM 通道路由影响,维持历史行为)
	if !externalBlocked {
		pushWechat(ctx, receiverID, title, content, path)
	}
}

// pushWorkNotice 按通道路由推送外部 IM 工作通知。
func pushWorkNotice(ctx context.Context, userID uint, title, content string) {
	channel := NormalizeExternalChannel(setting.Get(ctx, NotifyExternalChannelConfigKey))
	switch channel {
	case NotifyChannelNone:
		return
	case NotifyChannelDingtalk:
		pushDingtalk(ctx, userID, title, content)
	case NotifyChannelFeishu:
		pushFeishu(ctx, userID, title, content)
	default: // wecom 与未知值兜底:保持历史企微行为
		pushWecom(ctx, userID, title, content)
	}
}

// isOfficialLeadNotice 官方获客通知白名单:官网留言/独立站询盘/独立站订单通知,
// 演示模式下仍走企微(P29 需求④:真实线索与真实收款通道保留)。
func isOfficialLeadNotice(title string) bool {
	return strings.Contains(title, "官网线索") ||
		strings.Contains(title, "独立站询盘") ||
		strings.Contains(title, "独立站订单")
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

// pushWechat 若微信服务号已启用且用户已绑定 openid,则推送模板消息。
// 凭证来自 sys_oauth_config(provider=wechat_mp),Extra JSON 携带 template_id;
// 跳转链接 = 移动端站点 origin + path(从配置的 redirect_uri 提取 origin)。
func pushWechat(ctx context.Context, userID uint, title, content, path string) {
	var c struct {
		AppID       string
		AppSecret   string
		RedirectURI string
		Extra       string
		Enabled     int
	}
	err := repository.DBFrom(ctx).Table("sys_oauth_config").
		Where("provider = ? AND deleted_at IS NULL", "wechat_mp").
		Order("enabled DESC, sort ASC, id DESC").Limit(1).
		Scan(&c).Error
	if err != nil || c.Enabled != 1 || c.AppID == "" || c.AppSecret == "" {
		return // 未启用或未配置
	}
	var extra struct {
		TemplateID string `json:"template_id"`
	}
	_ = json.Unmarshal([]byte(c.Extra), &extra)
	if extra.TemplateID == "" {
		return // 未配置通知模板,渠道视为关闭
	}

	var openid string
	if err := repository.DBFrom(ctx).Table("sys_user").
		Where("id = ? AND status = 1 AND deleted_at IS NULL", userID).
		Pluck("wechat_openid", &openid).Error; err != nil || openid == "" {
		return // 用户未绑定微信
	}

	client := wxmp.NewClient(wxmp.Config{
		AppID:       c.AppID,
		Secret:      c.AppSecret,
		RedirectURI: c.RedirectURI,
		TemplateID:  extra.TemplateID,
	})
	jumpURL := mobileOrigin(c.RedirectURI) + path
	if err := client.SendTemplateMsg(ctx, openid, title, content, jumpURL); err != nil {
		xlogger.ErrorfCtx(ctx, "微信服务号通知推送失败 user=%d: %v", userID, err)
	} else {
		xlogger.InfofCtx(ctx, "微信服务号通知已推送 user=%d title=%s", userID, title)
	}
}

// mobileOrigin 从 OAuth 回调地址提取 origin,拼接通知跳转链接。
func mobileOrigin(redirectURI string) string {
	if u, err := url.Parse(redirectURI); err == nil && u.Scheme != "" && u.Host != "" {
		return u.Scheme + "://" + u.Host
	}
	return ""
}

// ── P32 钉钉/飞书工作通知 ──

// externalBinding 用户外部绑定(id_source + external_id;空=未绑定,跳过外推)。
type externalBinding struct {
	ExternalID string
	IDSource   string
}

// loadExternalBinding 查用户外部绑定(仅在用户启用时)。
func loadExternalBinding(ctx context.Context, userID uint, source string) (string, bool) {
	var b externalBinding
	err := repository.DBFrom(ctx).Table("sys_user").
		Select("external_id", "id_source").
		Where("id = ? AND status = 1 AND deleted_at IS NULL", userID).
		Scan(&b).Error
	if err != nil || b.ExternalID == "" || b.IDSource != source {
		return "", false // 未绑定或绑定到其他平台
	}
	return b.ExternalID, true
}

// pushDingtalk 钉钉工作通知(凭证 sys_oauth_config provider=dingtalk,
// agent_id 取 extra.agent_id,兼容 AgentID 列)。
func pushDingtalk(ctx context.Context, userID uint, title, content string) {
	var c struct {
		AppID     string
		AppSecret string
		AgentID   string
		Extra     string
		Enabled   int
	}
	err := repository.DBFrom(ctx).Table("sys_oauth_config").
		Where("provider = ? AND deleted_at IS NULL", "dingtalk").
		Order("enabled DESC, sort ASC, id DESC").Limit(1).
		Scan(&c).Error
	if err != nil || c.Enabled != 1 || c.AppID == "" || c.AppSecret == "" {
		return // 未启用或未配置
	}
	var extra struct {
		AgentID string `json:"agent_id"`
	}
	if c.Extra != "" {
		_ = json.Unmarshal([]byte(c.Extra), &extra)
	}
	agentID := extra.AgentID
	if agentID == "" {
		agentID = c.AgentID
	}
	if agentID == "" {
		return // 工作通知必须有 agent_id
	}

	dingUserID, ok := loadExternalBinding(ctx, userID, "dingtalk")
	if !ok {
		return // 未绑定钉钉,跳过外推(站内信已送达)
	}

	client := dingtalk.NewClient(dingtalk.Config{AppKey: c.AppID, AppSecret: c.AppSecret, AgentID: agentID})
	msg := title + "\n" + content
	if err := client.SendWorkNotice(ctx, dingUserID, msg); err != nil {
		xlogger.ErrorfCtx(ctx, "钉钉通知推送失败 user=%d dingtalk=%s: %v", userID, dingUserID, err)
	} else {
		xlogger.InfofCtx(ctx, "钉钉通知已推送 user=%d dingtalk=%s title=%s", userID, dingUserID, title)
	}
}

// pushFeishu 飞书消息推送(凭证 sys_oauth_config provider=feishu;
// 收件人 external_id 存 open_id——通讯录同步与扫码登录统一 open_id 口径)。
func pushFeishu(ctx context.Context, userID uint, title, content string) {
	var c struct {
		AppID     string
		AppSecret string
		Enabled   int
	}
	err := repository.DBFrom(ctx).Table("sys_oauth_config").
		Where("provider = ? AND deleted_at IS NULL", "feishu").
		Order("enabled DESC, sort ASC, id DESC").Limit(1).
		Scan(&c).Error
	if err != nil || c.Enabled != 1 || c.AppID == "" || c.AppSecret == "" {
		return // 未启用或未配置
	}

	openID, ok := loadExternalBinding(ctx, userID, "feishu")
	if !ok {
		return // 未绑定飞书,跳过外推(站内信已送达)
	}

	client := feishu.NewClient(feishu.Config{AppID: c.AppID, AppSecret: c.AppSecret})
	msg := title + "\n" + content
	if err := client.SendUserMessage(ctx, openID, msg); err != nil {
		xlogger.ErrorfCtx(ctx, "飞书通知推送失败 user=%d feishu=%s: %v", userID, openID, err)
	} else {
		xlogger.InfofCtx(ctx, "飞书通知已推送 user=%d feishu=%s title=%s", userID, openID, title)
	}
}
