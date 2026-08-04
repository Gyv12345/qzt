package setting

import (
	"context"

	"qzt-go-server/internal/pkg/cache"
	"qzt-go-server/internal/repository"
)

// setting 提供运行时配置(sys_config)的缓存层。
// 读路径：Redis hash → DB 回填 → 空串。写路径由 ConfigService 在更新后调用 Refresh* 同步缓存。
//
// 因每个实例读同一 Redis，多实例间无需 pub/sub 即可保持一致；
// 缓存刷新是显式的管理动作（保存配置 / 调用 refresh 接口）。

const configHashKey = "config"

// Get 读取某个配置键的值：先查 Redis 缓存，未命中则查 DB 并回填，再未命中返回空串。
func Get(ctx context.Context, key string) string {
	if v, ok := cache.GetConfigCache(key); ok {
		return v
	}
	c, err := repository.NewConfigRepo().GetByKey(ctx, key)
	if err != nil {
		return ""
	}
	_ = cache.SetConfigCache(key, c.Value)
	return c.Value
}

// RefreshKey 重新从 DB 读取单个 key 并刷新缓存（用于该 key 被更新后）。
func RefreshKey(ctx context.Context, key string) error {
	c, err := repository.NewConfigRepo().GetByKey(ctx, key)
	if err != nil {
		// 配置可能已被删除：清除缓存字段
		_ = cache.DelConfigCache(key)
		return nil
	}
	return cache.SetConfigCache(key, c.Value)
}

// RefreshAll 用全量 sys_config 重建缓存 hash（启动预热或"刷新全部"管理动作）。
func RefreshAll(ctx context.Context) error {
	list, err := repository.NewConfigRepo().ListAll(ctx)
	if err != nil {
		return err
	}
	kv := make(map[string]string, len(list))
	for _, c := range list {
		kv[c.Key] = c.Value
	}
	return cache.RebuildConfigCache(kv)
}

// Warm 在启动时调用，预热缓存（失败仅记录，不阻断启动）。
func Warm(ctx context.Context) {
	_ = RefreshAll(ctx)
}
