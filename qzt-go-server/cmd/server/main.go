package main

import (
	"context"
	"flag"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"qzt-go-server/config"
	"qzt-go-server/internal/app"
	mcpmod "qzt-go-server/internal/mcp"
	apimod "qzt-go-server/internal/module/api"
	apprmod "qzt-go-server/internal/module/approval"
	apprsvc "qzt-go-server/internal/module/approval/service"
	"qzt-go-server/internal/module/cms"
	crmmod "qzt-go-server/internal/module/crm"
	crmsvc "qzt-go-server/internal/module/crm/service"
	finmod "qzt-go-server/internal/module/finance"
	entmod "qzt-go-server/internal/module/enterprise"
	entsvc "qzt-go-server/internal/module/enterprise/service"
	hrmmod "qzt-go-server/internal/module/hrm"
	mailmod "qzt-go-server/internal/module/mail"
	psimod "qzt-go-server/internal/module/psi"
	"qzt-go-server/internal/module/system"
	oamod "qzt-go-server/internal/module/oa"
	oasvc "qzt-go-server/internal/module/oa/service"
	kbmod "qzt-go-server/internal/module/kb"
	cloudmod "qzt-go-server/internal/module/cloud"
	projmod "qzt-go-server/internal/module/project"
	"qzt-go-server/internal/pkg/ipregion"
	"qzt-go-server/internal/pkg/setting"
	"qzt-go-server/internal/server"
	"qzt-go-server/pkg/xcolor"

	_ "qzt-go-server/cmd/server/docs" // swagger 生成文档(注册 swaggerFiles)
)

// @title           企业级业务管理平台 API
// @version         1.0
// @description     基于 Go 的模块化单体后端(基础平台 + RBAC + 系统管理)。第一阶段地基。
// @description     统一响应信封 {code,msg,data,timestamp};登录返回 JWT access/refresh 双令牌。
// @host            localhost:9000
// @BasePath        /
// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description 输入 "Bearer {access_token}"
func main() {
	// -config 指向配置文件目录（默认 ./config）；-log 指向日志目录（默认 ./logs）
	cfgPath := flag.String("config", "./config", "config directory path")
	logPath := flag.String("log", "./logs", "log directory path")
	flag.Parse()

	// 1. 初始化全局资源（配置/时区/日志/存储/DB/Redis/Casbin/JWT）
	if err := app.Init(*cfgPath, *logPath); err != nil {
		fmt.Fprintf(os.Stderr, "[startup] init app failed: %v\n", err)
		os.Exit(1)
	}

	// 2. 预热运行时配置缓存（失败不阻断启动）
	// 数据库表结构和种子数据请通过 docs/sql/ 下的 SQL 脚本手动执行。
	setting.Warm(context.Background())

	// 3. 加载离线 IP 归属地库(登录日志展示 IP 大概地址;缺失仅记日志,不阻断)
	if err := ipregion.Init("data/ip2region.xdb"); err != nil {
		app.Log.Warnf("IP 归属地库加载失败(登录日志将不显示地址): %v", err)
	}

	// 4. 组装路由（注册 system / api / cms / crm / enterprise / approval / hrm / psi / finance / oa / mail 模块）
	router := server.NewRouter(
		system.New(),
		apimod.New(),
		cms.New(),
		crmmod.New(),
		entmod.New(),
		apprmod.New(),
		hrmmod.New(),
		psimod.New(),
		finmod.New(),
		oamod.New(),
		kbmod.New(),
		cloudmod.New(),
		projmod.New(),
		mailmod.New(),
	)

	// 4.45 注册 MCP Server(挂载 /mcp 到 gin engine,API Key 认证)
	mcpmod.StartMCP(router)

	// 4.5 审批引擎:注入站内信客户端 + 注册事件监听器(审批任务分配/完成 → 站内信 + 业务回调)
	apprsvc.SetMessageClient(oasvc.NewMessageService())
	apprsvc.RegisterEventListeners(context.Background())

	// 4.5.1 CRM 回款→财务凭证联动(回款创建后自动生成收入凭证)
	crmsvc.RegisterPaymentListener(context.Background())

	// 4.6 启动定时任务调度器(从 DB 加载已启用的任务)
	scheduler := entsvc.NewJobScheduler()
	if err := scheduler.Start(context.Background()); err != nil {
		app.Log.Warnf("定时任务调度器启动失败(不阻断): %v", err)
	}

	// 5. 启动 HTTP 服务（带超时与请求头大小限制）
	cfg := config.Get()
	addr := fmt.Sprintf("%s:%d", cfg.Application.Server.Addr, cfg.Application.Server.Port)
	srv := &http.Server{
		Addr:           addr,
		Handler:        router,
		ReadTimeout:    cfg.Application.Server.ReadTimeout,
		WriteTimeout:   cfg.Application.Server.WriteTimeout,
		MaxHeaderBytes: int(cfg.Application.Server.MaxHeaderMB) << 20,
	}

	go func() {
		printBanner(cfg.Application.Server.Name, cfg.Application.Server.Version, addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			app.Log.Fatalf("server run failed: %v", err)
		}
	}()

	// 6. 等待退出信号，优雅关停
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	app.Log.Info("正在关闭服务...")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		app.Log.Errorf("server forced to shutdown: %v", err)
	}
	scheduler.Stop()
	app.Close()
	app.Log.Info("服务已停止")
}

// printBanner 启动横幅。仅在非生产环境打印，避免生产日志噪音。
func printBanner(name, version, addr string) {
	banner := fmt.Sprintf(`
 %s  %s  %s
 %s  %s
`,
		xcolor.GreenFont("➜"), xcolor.GreenFont(name+":"+version),
		xcolor.YellowFont("listening "+addr),
		xcolor.YellowFont("[logger]"), "日志已就绪，业务代码请使用 xlogger.InfofCtx/ErrorfCtx 带上 trace_id",
	)
	fmt.Print(banner)
}
