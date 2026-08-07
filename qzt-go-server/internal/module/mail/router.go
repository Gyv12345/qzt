package mail

// router.go 邮件模块,挂载在 /mail 下。

import (
	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/app"
	"qzt-go-server/internal/middleware"
	"qzt-go-server/internal/module/mail/handler"
)

type Module struct{}

func New() *Module {
	return &Module{}
}

func (m *Module) Name() string {
	return "mail"
}

func (m *Module) RegisterRoutes(rg *gin.RouterGroup) {
	h := handler.NewMailHandler()

	// 邮件接口:仅需 JWT 认证(所有登录用户可发邮件,权限由前端 mail:send 控制入口)
	// sys_api 记录用于操作日志元数据 + 后台 API 管理展示。
	authenticated := rg.Group("", middleware.Auth(app.JwtManager))
	{
		authenticated.POST("/send", h.Send)
		authenticated.POST("/test", h.TestConnect)
	}
}
