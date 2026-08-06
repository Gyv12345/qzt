//go:build integration

// Package testutil 提供集成测试的公共基础设施:测试库连接、路由装配、鉴权 helper、断言工具。
// 所有测试文件需带 `//go:build integration` tag,通过 `go test -tags=integration` 运行。
//
// 数据库隔离:在现有阿里云 RDS 上建独立库 qztgo_test(首次自动建表+种子),Redis 用 db=15。
// 不清库(幂等种子安全),单测内用唯一前缀 + t.Cleanup 清理本次产生的数据。
package testutil

import (
	"bufio"
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/redis/go-redis/v9"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	gormlogger "gorm.io/gorm/logger"

	"qzt-go-server/config"
	"qzt-go-server/internal/app"
	"qzt-go-server/internal/pkg/cache"
	jwtpkg "qzt-go-server/pkg/xauth/jwt"
)

const (
	// TestDBName 测试库名
	TestDBName = "qztgo_test"
	// TestRedisDB 测试用 Redis db(与生产 db=8 隔离)
	TestRedisDB = 15
	// DefaultTestJWTSecret 测试用 JWT secret(≥32 字节,满足 Manager 校验)
	DefaultTestJWTSecret = "regression-test-secret-32bytes-min!!"
)

var (
	initOnce sync.Once
	initErr  error

	// TestDB 测试用 GORM 连接(进程内共享)
	TestDB *gorm.DB
	// TestRedis 测试用 Redis 客户端
	TestRedis *redis.Client
)

// SetupTestDB 初始化测试环境(进程级单例):建表 + 种子 + 注入 app 全局变量。
// 首次调用建表+种子,后续调用直接返回(幂等,不清库)。
// t 用于在初始化失败时 Fatal;实际只在第一个测试执行一次。
func SetupTestDB(t *testing.T) {
	t.Helper()
	initOnce.Do(func() {
		initErr = doInit()
	})
	if initErr != nil {
		t.Fatalf("测试环境初始化失败: %v", initErr)
	}
}

// doInit 执行实际初始化:加载配置 → 连接 MySQL/Redis → 建表+种子 → 注入 app 全局变量。
func doInit() error {
	// 0. 加载 config.dev.yaml(中间件/路由依赖 config.Get() 不 panic)。
	// 配置里的 MySQL DSN 不会被用到——我们下面直接覆盖 app.DB 指向测试库。
	if err := initConfig(); err != nil {
		return fmt.Errorf("加载配置失败: %w", err)
	}

	// 1. 连接测试库
	dsn := testDSN()
	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{
		SkipDefaultTransaction: true,
		Logger:                 gormlogger.Default.LogMode(gormlogger.Warn),
	})
	if err != nil {
		return fmt.Errorf("连接测试库失败: %w", err)
	}
	sqlDB, err := db.DB()
	if err != nil {
		return fmt.Errorf("获取 sqlDB 失败: %w", err)
	}
	sqlDB.SetMaxIdleConns(4)
	sqlDB.SetMaxOpenConns(20)
	sqlDB.SetConnMaxIdleTime(5 * time.Minute)

	// 2. 建表 + 种子已移除(走 SQL 文件),测试库需提前手动执行 docs/sql/ 下的脚本。
	// model.AutoMigrate 和 model.SeedData 已删除。

	// 3. 连接测试 Redis(用 config.RedisConfig 经现有 NewRedis 构造,行为与生产一致)
	rdb, err := connectTestRedis()
	if err != nil {
		return fmt.Errorf("连接测试 Redis 失败: %w", err)
	}

	// 4. 注入 app 全局变量(repository/middleware 从 app.DB / app.Redis / app.Enforcer 取)
	app.DB = db
	app.Redis = rdb
	cache.InitStore(cache.NewRedisStore(rdb, "qzt_test:"))

	// 5. 初始化 Casbin(从测试库加载策略)
	rbacPath := filepath.Join(findModuleRoot(), "config", "rbac_model.conf")
	if err := app.InitCasbin(rbacPath); err != nil {
		return fmt.Errorf("测试 Casbin 初始化失败: %w", err)
	}

	// 6. 初始化 JWT(直接构造 Manager,绕过 config 文件依赖)
	secret := os.Getenv("JWT_SECRET")
	if len(secret) < 32 {
		secret = DefaultTestJWTSecret
	}
	mgr, err := jwtpkg.NewJwtManager(&jwtpkg.Config{
		JwtSecret:             secret,
		Issuer:                "qzt-test",
		AccessExpirationTime:  2 * time.Hour,
		RefreshExpirationTime: 7 * 24 * time.Hour,
	})
	if err != nil {
		return fmt.Errorf("测试 JWT 初始化失败: %w", err)
	}
	app.JwtManager = mgr

	// 7. 初始化 logger(测试输出到 stdout)
	app.InitLogger("")

	TestDB = db
	TestRedis = rdb
	return nil
}

// initConfig 加载 .env(若存在)并初始化 config.dev.yaml。
// 中间件/路由依赖 config.Get() 不 panic;配置里的 MySQL DSN 不影响测试
// (测试直接覆盖 app.DB 指向 qztgo_test 库)。
func initConfig() error {
	// 先加载 .env,把 MYSQL_DSN/REDIS_ADDR/JWT_SECRET 等注入环境变量
	loadDotEnv()

	// config.Init 内部用 atomic CAS 保证只初始化一次,重复调用会 panic。
	// 用 recover 保护:若已被其他包初始化(同进程),忽略。
	defer func() { _ = recover() }()
	config.Init(findModuleRoot() + "/config")
	return nil
}

// findModuleRoot 从测试 CWD(internal/testutil/)向上查找 go.mod 所在目录(模块根)。
// 测试二进制的 CWD 是包目录而非模块根,故需定位。
func findModuleRoot() string {
	dir, err := os.Getwd()
	if err != nil {
		return "."
	}
	for i := 0; i < 10; i++ {
		if _, err := os.Stat(filepath.Join(dir, "go.mod")); err == nil {
			return dir
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			break
		}
		dir = parent
	}
	return "." // fallback
}

// loadDotEnv 读取 .env 文件并注入环境变量(不覆盖已存在的环境变量)。
// 模拟 `make run` 的 `set -a && . ./.env` 行为,让测试拿到与 dev 一致的连接信息。
func loadDotEnv() {
	envPath := filepath.Join(findModuleRoot(), ".env")
	f, err := os.Open(envPath)
	if err != nil {
		return // .env 不存在不报错(可能环境变量已由 shell 注入)
	}
	defer f.Close()
	scan := bufio.NewScanner(f)
	for scan.Scan() {
		line := strings.TrimSpace(scan.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		// 去掉 export 前缀
		line = strings.TrimPrefix(line, "export ")
		eq := strings.IndexByte(line, '=')
		if eq < 0 {
			continue
		}
		key := strings.TrimSpace(line[:eq])
		val := strings.TrimSpace(line[eq+1:])
		// 去掉引号
		val = strings.Trim(val, `"'`)
		// 不覆盖已存在的环境变量(shell 显式设置的优先)
		if _, ok := os.LookupEnv(key); !ok {
			os.Setenv(key, val)
		}
	}
}

// testDSN 构造测试库 DSN。优先用 TEST_MYSQL_DSN 环境变量;
// 否则读 MYSQL_DSN 环境变量,把 /qztgo? 替换成 /qztgo_test?。
func testDSN() string {
	if dsn := os.Getenv("TEST_MYSQL_DSN"); dsn != "" {
		return dsn
	}
	base := os.Getenv("MYSQL_DSN")
	if base == "" {
		base = "root:CHANGE_ME@tcp(127.0.0.1:3306)/qztgo?charset=utf8mb4&parseTime=true&loc=Local&timeout=3s"
	}
	return replaceDBName(base, TestDBName)
}

// replaceDBName 把 DSN 里的 /oldDB? 替换为 /newDB?
func replaceDBName(dsn, newDB string) string {
	// DSN 格式:user:pass@tcp(host:port)/dbname?params
	// 定位最后一个 / 和 ? 之间的库名
	slash := -1
	for i := len(dsn) - 1; i >= 0; i-- {
		if dsn[i] == '/' {
			slash = i
			break
		}
	}
	if slash < 0 {
		return dsn
	}
	tail := dsn[slash+1:]
	q := len(tail)
	for i, c := range tail {
		if c == '?' {
			q = i
			break
		}
	}
	return dsn[:slash+1] + newDB + tail[q:]
}

// connectTestRedis 连接测试 Redis(默认 db=15,可通过 TEST_REDIS_DB 覆盖)。
func connectTestRedis() (*redis.Client, error) {
	addr := os.Getenv("REDIS_ADDR")
	if addr == "" {
		addr = "127.0.0.1:6379"
	}
	password := os.Getenv("REDIS_PASSWORD")
	db := TestRedisDB
	if raw := os.Getenv("TEST_REDIS_DB"); raw != "" {
		var v int
		if _, err := fmt.Sscanf(raw, "%d", &v); err == nil {
			db = v
		}
	}

	rdb := redis.NewClient(&redis.Options{
		Addr:         addr,
		Password:     password,
		DB:           db,
		DialTimeout:  5 * time.Second,
		PoolSize:     5,
		MinIdleConns: 1,
	})
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	if err := rdb.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("redis ping 失败: %w", err)
	}
	return rdb, nil
}
