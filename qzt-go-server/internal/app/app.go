package app

import (
	"fmt"
	"path/filepath"
	"time"

	"qzt-go-server/config"
)

// Init 初始化所有全局资源，顺序为：配置 → 时区 → 日志 → 存储 → 数据库 → Redis → Casbin。
// 任一步失败立即返回错误。配套 Close() 按相反顺序释放资源。
// 注意：存储配置从 config.{env}.yaml + .env 读取(不再走 DB)，需在 InitStorage 前完成 InitConfig。
func Init(cfgPath string, logPath string) error {
	if err := InitConfig(cfgPath); err != nil {
		return fmt.Errorf("init config: %w", err)
	}
	if err := InitTimezone(); err != nil {
		return fmt.Errorf("init timezone: %w", err)
	}
	InitLogger(logPath)
	Log.Info("配置加载完成")
	Log.Infof("日志输出目录: %s", logPath)

	// 存储配置走配置文件(config.{env}.yaml + .env),不依赖数据库,可在数据库前初始化。
	if err := InitStorage(); err != nil {
		return fmt.Errorf("init storage: %w", err)
	}
	Log.Info("文件存储初始化完成")

	if err := InitDatabase(); err != nil {
		return fmt.Errorf("init database: %w", err)
	}
	Log.Info("数据库连接成功")

	if err := InitRedis(); err != nil {
		return fmt.Errorf("init redis: %w", err)
	}
	Log.Info("Redis 连接成功")

	if err := InitCasbin(filepath.Join(cfgPath, "rbac_model.conf")); err != nil {
		return fmt.Errorf("init casbin: %w", err)
	}
	Log.Info("Casbin 初始化完成")

	if err := InitJWT(); err != nil {
		return fmt.Errorf("init jwt: %w", err)
	}
	Log.Info("JWT 管理器初始化完成")

	return nil
}

// Close 按初始化的相反顺序释放全局资源。每个句柄做 nil 检查，可安全地部分初始化调用。
func Close() {
	if Enforcer != nil {
		_ = Enforcer.SavePolicy()
	}
	if Redis != nil {
		_ = Redis.Close()
	}
	if DB != nil {
		if sqlDB, err := DB.DB(); err == nil {
			_ = sqlDB.Close()
		}
	}
	if Log != nil {
		_ = Log.Sync()
	}
}

// InitConfig 加载配置文件并做必填校验。ENV 由环境变量 APP_ENV 控制（dev/uat/prod，默认 dev）。
// 配置文件内可用 ${VAR} / ${VAR:-default} 占位符注入敏感字段。
func InitConfig(cfgPath string) error {
	config.Init(cfgPath)
	return validateConfig()
}

// InitTimezone 设置进程级时区，保证日志 / JWT / GORM / MySQL loc=Local 一致。
func InitTimezone() error {
	// 默认 Asia/Shanghai；如需配置化可在 Config 增加 timezone 字段
	loc, err := time.LoadLocation("Asia/Shanghai")
	if err != nil {
		return fmt.Errorf("load timezone failed: %w", err)
	}
	time.Local = loc
	return nil
}

// validateConfig 必填项快速校验，启动即失败，避免运行期才暴露配置缺失。
func validateConfig() error {
	cfg := config.Get()
	if cfg.MySQL.DSN == "" {
		return fmt.Errorf("mysql.dsn 不能为空")
	}
	if cfg.JWT.JwtSecret == "" {
		return fmt.Errorf("jwt.jwt_secret 不能为空")
	}
	return nil
}
