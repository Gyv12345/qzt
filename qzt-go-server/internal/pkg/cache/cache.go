package cache

import (
	"encoding/json"
	"fmt"
	"time"
)

// Global store instance, initialized via InitStore.
var store Store

func InitStore(s Store) {
	store = s
}

func GetStore() Store {
	return store
}

// ── Token Blacklist ──

func BlacklistToken(token string, expiration time.Duration) error {
	return store.Set("token:blacklist:"+token, "1", expiration)
}

func IsTokenBlacklisted(token string) bool {
	val, err := store.Get("token:blacklist:" + token)
	return err == nil && val == "1"
}

// ── User Permission Cache ──

const permCacheTTL = 10 * time.Minute

func permKey(userID uint) string {
	return fmt.Sprintf("perm:user:%d", userID)
}

func SetUserPermissions(userID uint, perms []string) error {
	data, err := json.Marshal(perms)
	if err != nil {
		return err
	}
	return store.Set(permKey(userID), string(data), permCacheTTL)
}

func GetUserPermissions(userID uint) ([]string, bool) {
	val, err := store.Get(permKey(userID))
	if err != nil {
		return nil, false
	}
	var perms []string
	if err := json.Unmarshal([]byte(val), &perms); err != nil {
		return nil, false
	}
	return perms, true
}

func ClearUserPermissions(userID uint) {
	store.Del(permKey(userID))
}

func ClearAllPermissionCache() {
	keys, err := store.Scan("perm:user:*")
	if err != nil {
		return
	}
	for _, k := range keys {
		// keys from Scan already have the prefix, use raw client Del
		// but since our store.Del adds prefix again, we need to strip it
		// Instead, just delete by known user pattern
		store.Del(k)
	}
}

// ── Login Rate Limit ──

const loginLimitMax = 5
const loginLimitWindow = 15 * time.Minute
// loginUserLimitMax 纯用户名维度阈值:攻击者换 IP 可绕过 (username, ip)
// 维度计数,叠加该维度防同一账号被分布式爆破;阈值放宽避免 NAT 出口多人
// 共享 IP 时正常用户互相累加误锁。
const loginUserLimitMax = 15

func loginKey(username, ip string) string {
	return "login:fail:" + username + ":" + ip
}

func loginUserKey(username string) string {
	return "login:fail:u:" + username
}

func IncrLoginFail(username, ip string) (int64, error) {
	k := loginKey(username, ip)
	count, err := store.Incr(k)
	if err != nil {
		return 0, err
	}
	store.Expire(k, loginLimitWindow)
	// 用户名维度同步计数(不返回,展示"还可尝试 N 次"仍以 IP 维度为准)
	if _, err := store.Incr(loginUserKey(username)); err == nil {
		store.Expire(loginUserKey(username), loginLimitWindow)
	}
	return count, nil
}

func IsLoginLocked(username, ip string) bool {
	val, err := store.Get(loginKey(username, ip))
	if err == nil {
		var count int64
		fmt.Sscanf(val, "%d", &count)
		if count >= loginLimitMax {
			return true
		}
	}
	uval, err := store.Get(loginUserKey(username))
	if err == nil {
		var ucount int64
		fmt.Sscanf(uval, "%d", &ucount)
		if ucount >= loginUserLimitMax {
			return true
		}
	}
	return false
}

func ClearLoginFail(username, ip string) {
	store.Del(loginKey(username, ip))
	store.Del(loginUserKey(username))
}

// ClearLoginFailByUsername 清除某用户名全部维度的登录失败计数。管理员重置密码时
// 不知道该用户历史登录的来源 IP,无法逐 IP 清除,故按 login:fail:<username>:* 模式
// 扫删。清理失败静默忽略——锁本身有 15 分钟 TTL,不应阻断重置密码主流程。
// Scan 返回已去前缀的 key,直接传给 Del 即可。
func ClearLoginFailByUsername(username string) {
	keys, err := store.Scan("login:fail:" + username + ":*")
	if err != nil {
		return
	}
	for _, k := range keys {
		store.Del(k)
	}
	store.Del(loginUserKey(username))
}

func GetLoginLockTTL(username, ip string) time.Duration {
	ttlIP, _ := store.TTL(loginKey(username, ip))
	ttlUser, _ := store.TTL(loginUserKey(username))
	if ttlUser > ttlIP {
		return ttlUser
	}
	return ttlIP
}

// ── System Config Cache ──
// All runtime configs share one Redis hash; each field is a config key. Reads go
// here first and fall back to DB on miss (see internal/pkg/setting).

const configHashKey = "config"

// GetConfigCache returns (value, true) on a cache hit. A miss or any Redis error
// returns ("", false) so the caller falls back to the DB.
func GetConfigCache(key string) (string, bool) {
	val, err := store.HGet(configHashKey, key)
	if err != nil {
		return "", false
	}
	return val, true
}

func SetConfigCache(key, value string) error {
	return store.HSet(configHashKey, key, value)
}

func DelConfigCache(key string) error {
	return store.HDel(configHashKey, key)
}

// RebuildConfigCache atomically-ish replaces the whole config hash with kv
// (used by the "refresh all" maintenance action and startup warm-up).
func RebuildConfigCache(kv map[string]string) error {
	if err := store.Del(configHashKey); err != nil {
		return err
	}
	if len(kv) == 0 {
		return nil
	}
	return store.HSet(configHashKey, kv)
}
