package middleware

import (
	"strconv"
	"time"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/pkg/cache"
	e "qzt-go-server/pkg/xerror"
	"qzt-go-server/pkg/xresponse"
)

// LoginLimit 登录失败次数限流中间件。以 (username, ip) 为粒度，
// 超过阈值（见 cache.loginLimitMax）即拒绝，防止暴力破解。
// 仅应用于登录接口；中间件只做"是否已锁定"的前置判断。
// 因登录用户名多在请求体内（预读会与后续 bind 冲突），失败计数由 auth service
// 在校验失败后按实际用户名自增，本中间件仅做 IP 维度的快速拦截。
func LoginLimit() gin.HandlerFunc {
	return func(c *gin.Context) {
		if cache.IsLoginLocked("_", c.ClientIP()) {
			ttl := cache.GetLoginLockTTL("_", c.ClientIP())
			xresponse.Fail(c, e.HttpTooManyRequests.GetErrCode(),
				"登录失败次数过多，请 "+humanDuration(ttl)+" 后再试")
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
