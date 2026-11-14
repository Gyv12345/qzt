// Package demoguard 公开演示模式护栏。
//
// 背景:生产超管 admin 将以简单密码公开给所有人试用,sys_config 键 demo.mode
// 置 "1" 即进入演示模式,各护栏点(系统重置/API Key/系统配置写/告警降级/
// 外部通道降级/登录锁定放宽)据此统一判断。
//
// 失败语义:Enabled 判定失败一律按「未开启」处理(false)——护栏自身故障宁可
// 放行,绝不能把全站读路径拖垮。读链路复用 setting.Get:Redis 缓存 hash
// (config) → 未命中回源 sys_config 表并回填;Redis 异常自动落到 DB,DB 也
// 读不到(异常/键不存在)返回空串 → 非 "1" → false。
package demoguard

import (
	"context"

	"qzt-go-server/internal/pkg/setting"
)

// ModeKey 演示模式开关的 sys_config 键。
const ModeKey = "demo.mode"

// Enabled 演示模式是否开启(值 "1")。调用方在每处护栏点判断,注释标「演示模式护栏」。
func Enabled(ctx context.Context) bool {
	return setting.Get(ctx, ModeKey) == "1"
}
