package app

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"runtime"
	"time"

	mysqlDriver "github.com/go-sql-driver/mysql"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	"gorm.io/plugin/dbresolver"

	"qzt-go-server/config"
)

// DB 全局 GORM 客户端，整个进程共享。repository.dbFrom(ctx) 默认从这里取。
var DB *gorm.DB

// InitDatabase 连接 MySQL 并设置连接池、SQL 日志、可选读写分离。
func InitDatabase() error {
	cfg := config.Get().MySQL

	db, err := connectMySQL(cfg)
	if err != nil {
		return err
	}
	DB = db
	return nil
}

// connectMySQL 根据 config.MysqlConfig 建立 GORM 连接。
func connectMySQL(cfg config.MysqlConfig) (*gorm.DB, error) {
	if cfg.DSN == "" {
		return nil, errors.New("mysql dsn is empty")
	}
	cfg = processConfig(cfg)

	gormCfg := &gorm.Config{
		// 关闭默认事务包装：单条写操作无需事务，减少一次往返；显式事务通过 repository.Transaction 使用
		SkipDefaultTransaction: true,
		// 把驱动层错误翻译成 gorm 哨兵错误，便于 errors.Is(err, gorm.ErrDuplicatedKey) 等
		TranslateError: true,
		Logger:         newGormLogger(gormLogLevel(cfg), cfg.SlowSqlThresholdTime),
	}

	dsn := ensureTimeout(cfg.DSN)
	db, err := gorm.Open(mysql.Open(dsn), gormCfg)
	if err != nil {
		return nil, fmt.Errorf("connect mysql failed: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("get sql.DB failed: %w", err)
	}
	sqlDB.SetMaxIdleConns(cfg.MaxIdleConns)
	sqlDB.SetMaxOpenConns(cfg.MaxOpenConns)
	sqlDB.SetConnMaxLifetime(cfg.ConnMaxLifeTime)
	sqlDB.SetConnMaxIdleTime(cfg.ConnMaxIdleTime)

	// 读写分离
	if !cfg.EnableReadWriteSeparation {
		return db, nil
	}
	if len(cfg.MainsDSN) == 0 {
		return nil, errors.New("read-write separation requires mains_dsn")
	}
	if len(cfg.SlavesDSN) == 0 {
		cfg.SlavesDSN = cfg.MainsDSN
	}
	var sources, replicas []gorm.Dialector
	for _, uri := range cfg.MainsDSN {
		sources = append(sources, mysql.Open(ensureTimeout(uri)))
	}
	for _, uri := range cfg.SlavesDSN {
		replicas = append(replicas, mysql.Open(ensureTimeout(uri)))
	}
	if err := db.Use(dbresolver.Register(dbresolver.Config{
		Sources:  sources,
		Replicas: replicas,
		Policy:   dbresolver.RandomPolicy{},
	}).SetMaxOpenConns(cfg.MaxOpenConns).
		SetMaxIdleConns(cfg.MaxIdleConns).
		SetConnMaxIdleTime(cfg.ConnMaxIdleTime).
		SetConnMaxLifetime(cfg.ConnMaxLifeTime)); err != nil {
		return nil, fmt.Errorf("apply dbresolver failed: %w", err)
	}
	return db, nil
}

// processConfig 补全连接池与慢 SQL 阈值的合理默认值，并保证 idle <= open 等不变式。
func processConfig(cfg config.MysqlConfig) config.MysqlConfig {
	if cfg.MaxOpenConns <= 0 {
		cfg.MaxOpenConns = 100
	}
	if cfg.MaxIdleConns <= 0 {
		cfg.MaxIdleConns = runtime.NumCPU()*2 + 1
	}
	if cfg.MaxIdleConns > cfg.MaxOpenConns {
		cfg.MaxIdleConns = cfg.MaxOpenConns
	}
	if cfg.ConnMaxLifeTime <= 0 {
		cfg.ConnMaxLifeTime = 60 * time.Minute
	}
	if cfg.ConnMaxIdleTime <= 0 {
		cfg.ConnMaxIdleTime = 10 * time.Minute
	}
	if cfg.ConnMaxIdleTime > cfg.ConnMaxLifeTime {
		cfg.ConnMaxIdleTime = cfg.ConnMaxLifeTime
	}
	if cfg.SlowSqlThresholdTime <= 0 {
		cfg.SlowSqlThresholdTime = 2 * time.Second
	}
	return cfg
}

// ensureTimeout 补充 DSN 中缺失的读写超时，避免零值无限等待。
func ensureTimeout(dsn string) string {
	u, err := url.Parse(dsn)
	if err != nil {
		return dsn
	}
	q := u.Query()
	if q.Get("timeout") == "" {
		q.Set("timeout", "5s")
	}
	if q.Get("readTimeout") == "" {
		q.Set("readTimeout", "10s")
	}
	if q.Get("writeTimeout") == "" {
		q.Set("writeTimeout", "10s")
	}
	u.RawQuery = q.Encode()
	return u.String()
}

// gormLogLevel 根据 EnableSqlLog 选择 GORM 日志级别：开启时打印全部，否则只打错误。
func gormLogLevel(cfg config.MysqlConfig) logger.LogLevel {
	if cfg.EnableSqlLog {
		return logger.Info
	}
	return logger.Warn
}

// CheckDBAlive 通过 Ping 检查数据库连接是否存活（用于就绪探针）。
func CheckDBAlive(ctx context.Context) error {
	if DB == nil {
		return errors.New("database not initialized")
	}
	sqlDB, err := DB.DB()
	if err != nil {
		return err
	}
	return sqlDB.PingContext(ctx)
}

// IsDuplicateKeyErr 判断是否为 MySQL 唯一索引冲突（Error 1062），
// 用于事务内并发竞争的兜底判断。
func IsDuplicateKeyErr(err error) bool {
	var mysqlErr *mysqlDriver.MySQLError
	if errors.As(err, &mysqlErr) {
		return mysqlErr.Number == 1062
	}
	return false
}
