package server

import (
	"strings"

	"github.com/gin-gonic/gin"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"

	"qzt-go-server/internal/app"
	"qzt-go-server/internal/middleware"
	response "qzt-go-server/pkg/xresponse"
	"qzt-go-server/pkg/xenv"
)

// Module 可插拔业务模块接口。每个模块实现 Name()（作为 URL 前缀）与
// RegisterRoutes()（注册自身路由）。新增业务模块只需实现本接口并在 main 中注册。
type Module interface {
	Name() string
	RegisterRoutes(rg *gin.RouterGroup)
}

// NewRouter 组装 gin 引擎：注册全局中间件，按模块挂载路由组。
// 第一阶段不内嵌前端 SPA；NoRoute 对未匹配的 API 前缀返回 JSON 404。
func NewRouter(modules ...Module) *gin.Engine {
	r := gin.New()
	r.Use(middleware.Recovery())
	r.Use(middleware.Trace())
	r.Use(middleware.Cors())
	r.Use(middleware.Logger())

	apiPrefixes := make([]string, 0, len(modules))
	for _, m := range modules {
		group := r.Group("/" + m.Name())
		m.RegisterRoutes(group)
		apiPrefixes = append(apiPrefixes, "/"+m.Name()+"/")
		app.Log.Infof("module [%s] registered at /%s", m.Name(), m.Name())
	}

	// Swagger 文档（免鉴权）。文档由 `make swag`(swag init) 生成到 cmd/server/docs。
	// 仅 dev 环境注册:生产/预发暴露全量接口与数据模型会显著降低攻击成本。
	if xenv.Dev() {
		r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))
		app.Log.Info("swagger 文档已注册: /swagger/index.html")
	} else {
		app.Log.Infof("当前环境 %s 不注册 swagger 文档", xenv.Env())
	}

	setupNoRoute(r, apiPrefixes)
	return r
}

// setupNoRoute 处理未匹配路由：API 前缀返回 JSON 404，其余返回 404。
// （未内嵌前端 SPA，因此不做 index.html 兜底；后续接入前端时可在此扩展。）
func setupNoRoute(r *gin.Engine, apiPrefixes []string) {
	r.NoRoute(func(c *gin.Context) {
		reqPath := c.Request.URL.Path
		for _, prefix := range apiPrefixes {
			if strings.HasPrefix(reqPath, prefix) {
				response.NotFound(c, "接口不存在")
				return
			}
		}
		response.NotFound(c, "资源不存在")
	})
}
