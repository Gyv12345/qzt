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

// loginUserLimitMax 纯用户名维度阈值:攻击者按用户名换 IP 爆破时 (username, ip)
// 维度拦不住,叠加该维度防同一账号被分布式爆破;阈值放宽避免 NAT 出口多人
// 共享 IP 时正常用户互相累加误锁。
const loginUserLimitMax = 15

// LoginUserLimitMax 用户名维度锁定阈值(导出供登录失败告警判断)。
const LoginUserLimitMax = loginUserLimitMax

// loginIpBanUsernames 同一 IP 在窗口内失败命中的不同用户名数阈值:命中即封禁该 IP。
// 以"不同用户名数"而非失败总次数判定,是因为 NAT 出口多人共享 IP 时,同一真人
// 错输自己账号密码只会命中 1 个用户名,不会被误伤;而爆破工具扫用户名时必然
// 命中多个不同用户名,是该模式的强特征。
const loginIpBanUsernames = 5

// loginIpBanTTL IP 封禁时长。封禁期间该 IP 的任何登录尝试直接拒绝。
const loginIpBanTTL = 30 * time.Minute

// loginIpHashWindow IP 维度用户名集合的统计窗口。
const loginIpHashWindow = 15 * time.Minute

func loginKey(username, ip string) string {
	return "login:fail:" + username + ":" + ip
}

func loginUserKey(username string) string {
	return "login:fail:u:" + username
}

func loginIpKey(ip string) string {
	return "login:ip:" + ip
}

func loginIpBanKey(ip string) string {
	return "login:ban:ip:" + ip
}

// IncrLoginFail 登录失败计数,含三个维度:
//  1. (username, ip) 维度 —— 展示"还可尝试 N 次"的口径,5 次锁定;
//  2. username 维度 —— 防多 IP 分布式爆破同一账号,15 次锁定;
//  3. ip 维度 —— 记录该 IP 失败命中的不同用户名集合,≥5 个即封禁 IP 30 分钟。
//     NAT 出口共享 IP 的正常用户错输密码只命中自己 1 个用户名,不会误伤。
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
	// IP 维度:按用户名去重的失败集合(HLen 即不同用户名数)
	if ip != "" && ip != "127.0.0.1" {
		ipKey := loginIpKey(ip)
		_, _ = store.HIncrBy(ipKey, username, 1)
		_ = store.Expire(ipKey, loginIpHashWindow)
		if n, _ := store.HLen(ipKey); n >= loginIpBanUsernames {
			_ = store.Set(loginIpBanKey(ip), "1", loginIpBanTTL)
		}
	}
	return count, nil
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
	// IP 维度封禁:该 IP 窗口内失败命中过 ≥5 个不同用户名
	if banned, _ := store.Exists(loginIpBanKey(ip)); banned {
		return true
	}
	return false
}

func ClearLoginFail(username, ip string) {
	store.Del(loginKey(username, ip))
	store.Del(loginUserKey(username))
	// 成功登录清封禁(NAT 友好):能输对密码的人是合法用户,
	// 由其解除同 IP 下他人误触发的封禁
	store.Del(loginIpBanKey(ip))
}

// GetLoginUserFailCount 返回 username 维度的失败计数,供告警阈值判断。
func GetLoginUserFailCount(username string) int64 {
	val, err := store.Get(loginUserKey(username))
	if err != nil {
		return 0
	}
	var n int64
	fmt.Sscanf(val, "%d", &n)
	return n
}

// IsIpBanned 该 IP 是否处于封禁期。
func IsIpBanned(ip string) bool {
	banned, _ := store.Exists(loginIpBanKey(ip))
	return banned
}

// MarkLoginAlertSent 窗口内告警去重标记:返回 true 表示首次,应发送告警。
func MarkLoginAlertSent(username string, ttl time.Duration) bool {
	k := "login:alert:" + username
	if sent, _ := store.Exists(k); sent {
		return false
	}
	if err := store.Set(k, "1", ttl); err != nil {
		return false
	}
	return true
}

func GetLoginLockTTL(username, ip string) time.Duration {
	ttlIP, _ := store.TTL(loginKey(username, ip))
	ttlUser, _ := store.TTL(loginUserKey(username))
	ttlBan, _ := store.TTL(loginIpBanKey(ip))
	ttl := ttlIP
	if ttlUser > ttl {
		ttl = ttlUser
	}
	if ttlBan > ttl {
		ttl = ttlBan
	}
	return ttl
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
