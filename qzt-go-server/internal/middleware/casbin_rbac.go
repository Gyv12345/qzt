package middleware

import (
	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/app"
	"qzt-go-server/internal/model"
	"qzt-go-server/pkg/xresponse"
)

// CasbinRBAC 基于角色的权限校验。从 gin context 读取角色编码列表，
// 对每个角色做 Enforce(role, path, method)；任一通过即放行。
// 超级管理员角色直接放行（与 rbac_model.conf 的 matcher 一致，此处提前短路以省一次查询）。
// 拒绝时用 Forbidden（会 abort），确保后续 handler 不被执行。
func CasbinRBAC() gin.HandlerFunc {
	return func(c *gin.Context) {
		roleCodes := GetRoleCodes(c)
		if len(roleCodes) == 0 {
			xresponse.Forbidden(c, "无法获取用户角色")
			return
		}

		obj := c.Request.URL.Path
		act := c.Request.Method

		for _, rc := range roleCodes {
			if rc == model.SuperAdminRoleCode {
				c.Next()
				return
			}
			ok, err := app.Enforcer.Enforce(rc, obj, act)
			if err != nil {
				app.Log.Errorw("casbin enforce error", "error", err)
				xresponse.Forbidden(c, "权限校验异常")
				return
			}
			if ok {
				c.Next()
				return
			}
		}

		xresponse.Forbidden(c, "无访问权限")
	}
}
