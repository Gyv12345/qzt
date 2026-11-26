package mp

import (
	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/app"
	"qzt-go-server/internal/middleware"
	"qzt-go-server/internal/module/mp/handler"
)

// Module 公众号运营模块(mp 运营中心)。注册在 /mp 下。
// 路由与 docs/sql/mp_ops.sql 的 sys_api 900-913 一一对应:
// 账号 CRUD 900-903 + 文章 CRUD/AI 生成/推草稿 904-910 + 菜单读写删 911-913。
type Module struct{}

func New() *Module { return &Module{} }

func (m *Module) Name() string { return "mp" }

func (m *Module) RegisterRoutes(rg *gin.RouterGroup) {
	accountHandler := handler.NewAccountHandler()
	articleHandler := handler.NewArticleHandler()
	menuHandler := handler.NewMenuHandler()

	// 受保护路由(JWT + 操作日志 + Casbin RBAC),与 kb 模块同构
	auth := rg.Group("", middleware.Auth(app.JwtManager), middleware.OperationLog(), middleware.CasbinRBAC())
	{
		// 账号管理(sys_api 900-903)
		auth.GET("/accounts", accountHandler.List)
		auth.POST("/accounts", accountHandler.Create)
		auth.PUT("/accounts/:id", accountHandler.Update)
		auth.DELETE("/accounts/:id", accountHandler.Delete)

		// 文章创作(sys_api 904-910)
		auth.GET("/articles", articleHandler.List)
		auth.POST("/articles", articleHandler.Create)
		auth.GET("/articles/:id", articleHandler.GetByID)
		auth.PUT("/articles/:id", articleHandler.Update)
		auth.DELETE("/articles/:id", articleHandler.Delete)
		auth.POST("/articles/:id/generate", articleHandler.Generate)
		auth.POST("/articles/:id/push-draft", articleHandler.PushDraft)

		// 菜单设置(sys_api 911-913)
		auth.GET("/accounts/:id/menu", menuHandler.Get)
		auth.PUT("/accounts/:id/menu", menuHandler.Save)
		auth.DELETE("/accounts/:id/menu", menuHandler.Delete)
	}
}
