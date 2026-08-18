// alert.go 根账户(admin, id=1)与内置超管角色(role 1)的安全告警。
//
// 告警接收人是根账户本人:notify.Dispatch 推 SSE(在线实时弹窗)+ 企业微信
// (若已绑定),覆盖两类事件:
//   1. 针对根账户/内置角色的写操作尝试——无论操作被守卫拒绝还是放行(如改
//      昵称这类合法资料变更),真超管都第一时间知情;
//   2. 根账户登录成功(带离线 IP 归属地)。
//
// 告警失败只记日志(notify 内部已处理),绝不影响业务主流程。
package service

import (
	"context"
	"fmt"
	"time"

	"qzt-go-server/internal/pkg/ipregion"
	"qzt-go-server/internal/pkg/notify"
)

// RootAccountID 系统根账户 admin 的固定 ID(种子数据保证,守卫判定与其余
// id==1 硬判断同源)。
const RootAccountID uint = 1

// AlertRootAccountWrite 推送根账户/内置超管角色写操作告警。
// action: 操作名(如"重置密码"); target: 对象(如"超级管理员账户");
// operator: 操作者用户名; ip: 来源 IP; result: "成功" 或 "被拒绝: 原因"。
func AlertRootAccountWrite(ctx context.Context, action, target, operator, ip, result string) {
	content := fmt.Sprintf("操作者: %s\n操作: %s\n对象: %s\n结果: %s\n来源 IP: %s\n时间: %s",
		operator, action, target, result, ip, time.Now().Format("2006-01-02 15:04:05"))
	notify.Dispatch(ctx, RootAccountID, "【安全告警】"+target+"变更尝试", content, "/system/user")
}

// AlertRootAccountLogin 推送根账户登录提醒(含离线 IP 归属地)。
func AlertRootAccountLogin(ctx context.Context, ip string) {
	region := ipregion.Lookup(ip)
	if region == "" {
		region = "未知"
	}
	content := fmt.Sprintf("超级管理员账号刚刚登录成功\n来源 IP: %s (%s)\n时间: %s\n若非本人操作,请立即在个人中心修改密码。",
		ip, region, time.Now().Format("2006-01-02 15:04:05"))
	notify.Dispatch(ctx, RootAccountID, "【安全提醒】超级管理员登录", content, "/")
}
