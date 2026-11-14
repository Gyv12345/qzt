package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/pkg/demoguard"
	"qzt-go-server/pkg/xresponse"
)

// DemoSystemWriteGuard 演示模式护栏:sys_config demo.mode=1 时拦截系统管理
// 写方法(POST/PUT/DELETE/PATCH),返回「演示模式不可修改系统配置」。
//
// 只应挂载在「系统管理写接口」的路由组上(users/roles/menus/apis/dicts/
// configs/oauth-configs/site-config/homepage-config/operation-logs 的写路由,
// 见 system/router.go 的 frozen 子组);GET 与 /system/configs/refresh 等
// 只读/缓存同步接口保持放行。demo.mode 未开启或判定失败一律放行,行为与
// 改造前完全一致。
func DemoSystemWriteGuard() gin.HandlerFunc {
	return func(c *gin.Context) {
		switch c.Request.Method {
		case http.MethodPost, http.MethodPut, http.MethodDelete, http.MethodPatch:
		default:
			c.Next()
			return
		}
		// 演示模式护栏判定失败按未开启处理(放行),护栏故障不拖垮业务。
		if !demoguard.Enabled(c.Request.Context()) {
			c.Next()
			return
		}
		xresponse.Forbidden(c, "演示模式不可修改系统配置")
	}
}
