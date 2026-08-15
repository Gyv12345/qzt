package middleware

import (
	"net/http"
	"slices"

	"github.com/gin-gonic/gin"

	"qzt-go-server/config"
)

// Cors 处理跨域。
// 配置了 cors.allow_origins 时按白名单精确匹配(仅命中才回显 Origin 并允许
// 凭证,防任意站点跨源读取);未配置时保持反射任意 Origin——当前认证走
// Authorization 头(Bearer),浏览器跨站请求带不上凭据,反射无直接可利用面,
// 且私有化部署客户域名不定,保留兼容。新环境建议显式配置白名单(支持 ${VAR})。
func Cors() gin.HandlerFunc {
	allowOrigins := config.Get().Cors.AllowOrigins
	return func(c *gin.Context) {
		method := c.Request.Method
		origin := c.Request.Header.Get("Origin")
		if origin == "" {
			c.Next()
			return
		}

		if len(allowOrigins) > 0 && !slices.Contains(allowOrigins, origin) {
			c.AbortWithStatus(http.StatusForbidden)
			return
		}

		c.Header("Access-Control-Allow-Origin", origin)
		c.Header("Access-Control-Allow-Methods", "POST, GET, OPTIONS, DELETE, PUT, PATCH")
		c.Header("Access-Control-Allow-Headers", "Authorization, Content-Length, X-CSRF-Token, Token, Session, X-Trace-Id, X-Requested-With, Accept, Origin, Host, Connection, Accept-Encoding, Accept-Language, Content-Type, Pragma")
		c.Header("Access-Control-Expose-Headers", "Content-Length, Access-Control-Allow-Origin, Access-Control-Allow-Headers, Content-Type, X-Trace-Id")
		c.Header("Access-Control-Allow-Credentials", "true")

		if method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}
