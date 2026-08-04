package app

import (
	"fmt"

	"github.com/redis/go-redis/v9"

	"qzt-go-server/config"
	"qzt-go-server/internal/pkg/cache"
	xredis "qzt-go-server/pkg/xdatabase/redis"
)

// Redis 全局 Redis 客户端。
var Redis *redis.Client

// InitRedis 连接 Redis 并做 Ping 校验，同时初始化全局缓存 Store。
func InitRedis() error {
	cfg := config.Get().Redis
	rdb, err := xredis.NewRedis(cfg)
	if err != nil {
		return fmt.Errorf("connect redis failed: %w", err)
	}
	Redis = rdb
	// 业务缓存（token 黑名单、登录限流、权限缓存、运行时配置）统一经 Store 访问
	cache.InitStore(cache.NewRedisStore(rdb, "qzt:"))
	return nil
}
