package middleware

import (
	"strconv"
	"time"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/pkg/cache"
	"qzt-go-server/internal/pkg/demoguard"
	"qzt-go-server/pkg/xresponse"
)

// LoginLimit 登录失败次数限流中间件。以 (username, ip) 为粒度，
// 超过阈值（见 cache.loginLimitMax）即拒绝，防止暴力破解。
// 仅应用于登录接口；中间件只做"是否已锁定"的前置判断。
// 因登录用户名多在请求体内（预读会与后续 bind 冲突），失败计数由 auth service
// 在校验失败后按实际用户名自增，本中间件仅做 IP 维度的快速拦截。
func LoginLimit() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 演示模式护栏:跳过本中间件的 IP 维度快速拦截——公开演示期间大量
		// 访客共享出口 IP 互相累加失败,会把整个 IP 封到谁都登不进;真正的
		// (username, ip) 维度锁定放宽(阈值 20,跳过 username/IP-ban 维度)
		// 由 auth service 按 demo 口径判断。
		if demoguard.Enabled(c.Request.Context()) {
			c.Next()
			return
		}
		if cache.IsLoginLocked("_", c.ClientIP()) {
			ttl := cache.GetLoginLockTTL("_", c.ClientIP())
			xresponse.TooManyRequests(c, "登录失败次数过多，请 "+humanDuration(ttl)+"后再试")
			return
		}
		c.Next()
	}
}

// humanDuration 把 time.Duration 转成"X分钟"/"X小时"的中文展示。
func humanDuration(d time.Duration) string {
	if d <= 0 {
		return "稍候"
	}
	mins := int(d.Minutes())
	if mins < 1 {
		return "1 分钟"
	}
	if mins >= 60 {
		return strconv.Itoa(mins/60) + " 小时"
	}
	return strconv.Itoa(mins) + " 分钟"
}
