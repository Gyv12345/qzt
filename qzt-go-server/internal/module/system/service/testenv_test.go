// testenv_test.go system 模块 service 层单测的公共测试环境。
//
// 不依赖真实 MySQL/Redis(与 internal/testutil 的 integration 环境互补,本文件无 build tag,
// 普通 `go test` 即可运行):
//   - DB:进程内 sqlite(github.com/glebarez/sqlite,纯 Go 驱动,已是 gorm-adapter 的间接依赖,
//     未向模块图引入新内容),单连接保证 :memory: 库共享;
//   - cache:内存版 cache.Store 替身(计数/TTL/Scan 语义对齐 Redis 用法);
//   - Casbin:config/rbac_model.conf + 内存 adapter(支持故障注入,验证失败回滚路径);
//   - JWT:真实 Manager(仅密钥/有效期用测试值)。
//
// 全部通过 app.* / cache.InitStore 全局注入,t.Cleanup 恢复原值;
// 同包测试顺序执行(无 t.Parallel),全局变量互换安全。
package service

import (
	"context"
	"errors"
	"os"
	"path"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/casbin/casbin/v2"
	casbinmodel "github.com/casbin/casbin/v2/model"
	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	gormlogger "gorm.io/gorm/logger"

	"qzt-go-server/internal/app"
	"qzt-go-server/internal/model"
	"qzt-go-server/internal/pkg/cache"
	jwtpkg "qzt-go-server/pkg/xauth/jwt"
	"qzt-go-server/pkg/xcryption"
)

const (
	testPassword    = "Passw0rd!"
	testJWTSecret   = "unit-test-secret-32bytes-minimum!!"
	testLoginIP     = "192.168.1.10"
	testLoginMaxCnt = 5 // 与 service.loginFailMax / cache.loginLimitMax 对齐
)

// ── bcrypt 哈希缓存(cost=12 单次数百毫秒,全包共享一次) ──

var (
	hashOnce  sync.Once
	hashedPwd string
	hashErr   error
)

// testPasswordHash 返回 testPassword 的 bcrypt 哈希(进程内只算一次,多个测试用户共用)。
func testPasswordHash() string {
	hashOnce.Do(func() {
		hashedPwd, hashErr = xcryption.HashPassword(testPassword)
	})
	if hashErr != nil {
		return ""
	}
	return hashedPwd
}

// ── 内存 cache.Store 替身 ──

type memStore struct {
	mu      sync.Mutex
	kv      map[string]string
	expires map[string]time.Time
}

func newMemStore() *memStore {
	return &memStore{kv: map[string]string{}, expires: map[string]time.Time{}}
}

func (m *memStore) liveLocked(key string) (string, bool) {
	if v, ok := m.kv[key]; ok {
		if exp, has := m.expires[key]; has && time.Now().After(exp) {
			return "", false
		}
		return v, true
	}
	return "", false
}

func (m *memStore) Get(key string) (string, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if v, ok := m.liveLocked(key); ok {
		return v, nil
	}
	return "", errors.New("redis: nil")
}

func (m *memStore) Set(key, value string, expiration time.Duration) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.kv[key] = value
	if expiration > 0 {
		m.expires[key] = time.Now().Add(expiration)
	} else {
		delete(m.expires, key)
	}
	return nil
}

func (m *memStore) Del(key string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.kv, key)
	delete(m.expires, key)
	return nil
}

func (m *memStore) Exists(key string) (bool, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	_, ok := m.liveLocked(key)
	return ok, nil
}

func (m *memStore) Incr(key string) (int64, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	v, _ := strconv.ParseInt(m.kv[key], 10, 64)
	v++
	m.kv[key] = strconv.FormatInt(v, 10)
	return v, nil
}

func (m *memStore) Decr(key string) (int64, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	v, _ := strconv.ParseInt(m.kv[key], 10, 64)
	v--
	m.kv[key] = strconv.FormatInt(v, 10)
	return v, nil
}

func (m *memStore) Expire(key string, expiration time.Duration) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if _, ok := m.kv[key]; !ok {
		return errors.New("redis: nil")
	}
	m.expires[key] = time.Now().Add(expiration)
	return nil
}

func (m *memStore) TTL(key string) (time.Duration, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if _, ok := m.liveLocked(key); !ok {
		return -2 * time.Second, nil // redis 语义:-2 key 不存在
	}
	if exp, has := m.expires[key]; has {
		return time.Until(exp), nil
	}
	return -1 * time.Second, nil // redis 语义:-1 永不过期
}

func (m *memStore) Scan(pattern string) ([]string, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	keys := make([]string, 0)
	for k := range m.kv {
		if ok, _ := path.Match(pattern, k); ok {
			keys = append(keys, k)
		}
	}
	return keys, nil
}

// snapshotKeys 返回当前存活 key 列表(测试断言用,如"禁用用户登录不产生计数 key")。
func (m *memStore) snapshotKeys() []string {
	m.mu.Lock()
	defer m.mu.Unlock()
	keys := make([]string, 0, len(m.kv))
	for k := range m.kv {
		if _, ok := m.liveLocked(k); ok {
			keys = append(keys, k)
		}
	}
	return keys
}

// 未用到的 Hash/List/Set 族方法:满足接口即可,system 服务路径不会触达。
func (m *memStore) HGet(key, field string) (string, error) { return "", errors.New("not implemented") }
func (m *memStore) HSet(key string, values ...any) error   { return errors.New("not implemented") }
func (m *memStore) HDel(key string, fields ...string) error {
	return errors.New("not implemented")
}
func (m *memStore) HGetAll(key string) (map[string]string, error) {
	return nil, errors.New("not implemented")
}
func (m *memStore) HExists(key, field string) (bool, error) {
	return false, errors.New("not implemented")
}
func (m *memStore) HIncrBy(key, field string, incr int64) (int64, error) {
	return 0, errors.New("not implemented")
}
func (m *memStore) HKeys(key string) ([]string, error) { return nil, errors.New("not implemented") }
func (m *memStore) HLen(key string) (int64, error)     { return 0, errors.New("not implemented") }
func (m *memStore) HMGet(key string, fields ...string) ([]any, error) {
	return nil, errors.New("not implemented")
}
func (m *memStore) LPush(key string, values ...any) (int64, error) {
	return 0, errors.New("not implemented")
}
func (m *memStore) RPush(key string, values ...any) (int64, error) {
	return 0, errors.New("not implemented")
}
func (m *memStore) LPop(key string) (string, error) { return "", errors.New("not implemented") }
func (m *memStore) RPop(key string) (string, error) { return "", errors.New("not implemented") }
func (m *memStore) LRange(key string, start, stop int64) ([]string, error) {
	return nil, errors.New("not implemented")
}
func (m *memStore) LLen(key string) (int64, error) { return 0, errors.New("not implemented") }
func (m *memStore) LRem(key string, count int64, value any) (int64, error) {
	return 0, errors.New("not implemented")
}
func (m *memStore) LIndex(key string, index int64) (string, error) {
	return "", errors.New("not implemented")
}
func (m *memStore) LTrim(key string, start, stop int64) error {
	return errors.New("not implemented")
}
func (m *memStore) SAdd(key string, members ...any) (int64, error) {
	return 0, errors.New("not implemented")
}
func (m *memStore) SRem(key string, members ...any) (int64, error) {
	return 0, errors.New("not implemented")
}
func (m *memStore) SMembers(key string) ([]string, error) {
	return nil, errors.New("not implemented")
}
func (m *memStore) SIsMember(key string, member any) (bool, error) {
	return false, errors.New("not implemented")
}
func (m *memStore) SCard(key string) (int64, error) { return 0, errors.New("not implemented") }

// ── 内存 Casbin adapter(支持故障注入) ──

// memCasbinAdapter 实现 persist.Adapter + persist.BatchAdapter。
// 只承载 p 规则(sub,obj,act);fails 按操作名注入错误,calls 统计调用次数
// (用于断言失败路径确实触发了回滚 LoadPolicy)。
type memCasbinAdapter struct {
	mu       sync.Mutex
	policies [][]string
	fails    map[string]error
	calls    map[string]int
}

func newMemCasbinAdapter(initial [][]string) *memCasbinAdapter {
	return &memCasbinAdapter{
		policies: initial,
		fails:    map[string]error{},
		calls:    map[string]int{},
	}
}

func (a *memCasbinAdapter) failOn(op string, err error) {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.fails[op] = err
}

func (a *memCasbinAdapter) callCount(op string) int {
	a.mu.Lock()
	defer a.mu.Unlock()
	return a.calls[op]
}

func (a *memCasbinAdapter) load(model casbinmodel.Model) error {
	model.ClearPolicy()
	a.mu.Lock()
	defer a.mu.Unlock()
	for _, p := range a.policies {
		model.AddPolicy("p", "p", p)
	}
	return nil
}

func (a *memCasbinAdapter) LoadPolicy(model casbinmodel.Model) error {
	a.mu.Lock()
	a.calls["LoadPolicy"]++
	err := a.fails["LoadPolicy"]
	a.mu.Unlock()
	if err != nil {
		return err
	}
	return a.load(model)
}

func (a *memCasbinAdapter) SavePolicy(model casbinmodel.Model) error {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.calls["SavePolicy"]++
	if err := a.fails["SavePolicy"]; err != nil {
		return err
	}
	a.policies = append([][]string{}, model.GetPolicy("p", "p")...)
	return nil
}

func (a *memCasbinAdapter) AddPolicy(sec, ptype string, rule []string) error {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.calls["AddPolicy"]++
	if err := a.fails["AddPolicy"]; err != nil {
		return err
	}
	a.policies = append(a.policies, append([]string{}, rule...))
	return nil
}

// AddPolicies BatchAdapter:casbin 的 Enforcer.AddPolicies 在有 adapter 时直接断言此方法。
func (a *memCasbinAdapter) AddPolicies(sec, ptype string, rules [][]string) error {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.calls["AddPolicies"]++
	if err := a.fails["AddPolicies"]; err != nil {
		return err
	}
	for _, r := range rules {
		a.policies = append(a.policies, append([]string{}, r...))
	}
	return nil
}

// RemovePolicies BatchAdapter 的另一半(接口完整性,system 服务路径未直接触达)。
func (a *memCasbinAdapter) RemovePolicies(sec, ptype string, rules [][]string) error {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.calls["RemovePolicies"]++
	if err := a.fails["RemovePolicies"]; err != nil {
		return err
	}
	remove := map[string]struct{}{}
	for _, r := range rules {
		remove[strings.Join(r, "\x00")] = struct{}{}
	}
	out := make([][]string, 0, len(a.policies))
	for _, p := range a.policies {
		if _, ok := remove[strings.Join(p, "\x00")]; !ok {
			out = append(out, p)
		}
	}
	a.policies = out
	return nil
}

func (a *memCasbinAdapter) RemovePolicy(sec, ptype string, rule []string) error {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.calls["RemovePolicy"]++
	if err := a.fails["RemovePolicy"]; err != nil {
		return err
	}
	out := a.policies[:0]
	for _, p := range a.policies {
		if strings.Join(p, "\x00") != strings.Join(rule, "\x00") {
			out = append(out, p)
		}
	}
	a.policies = out
	return nil
}

func (a *memCasbinAdapter) RemoveFilteredPolicy(sec, ptype string, fieldIndex int, fieldValues ...string) error {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.calls["RemoveFilteredPolicy"]++
	if err := a.fails["RemoveFilteredPolicy"]; err != nil {
		return err
	}
	out := make([][]string, 0, len(a.policies))
	for _, p := range a.policies {
		match := true
		for i, v := range fieldValues {
			if v == "" {
				continue
			}
			if fieldIndex+i >= len(p) || p[fieldIndex+i] != v {
				match = false
				break
			}
		}
		if !match {
			out = append(out, p)
		}
	}
	a.policies = out
	return nil
}

// storedPolicies 返回 adapter 当前持久化副本(排序后,断言用)。
func (a *memCasbinAdapter) storedPolicies() [][]string {
	a.mu.Lock()
	defer a.mu.Unlock()
	out := make([][]string, len(a.policies))
	copy(out, a.policies)
	return out
}

// ── 测试环境 ──

type testEnv struct {
	db      *gorm.DB
	store   *memStore
	adapter *memCasbinAdapter
}

// newTestEnv 每个测试一个全新环境:独立 sqlite 内存库 + 空 cache + 指定初始策略的 casbin。
// 注入 app.DB/app.Enforcer/app.JwtManager 与 cache store,并在 t.Cleanup 恢复原全局值。
func newTestEnv(t *testing.T, initialPolicies [][]string) *testEnv {
	t.Helper()

	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
		Logger: gormlogger.Default.LogMode(gormlogger.Silent),
	})
	if err != nil {
		t.Fatalf("打开内存 sqlite 失败: %v", err)
	}
	sqlDB, err := db.DB()
	if err != nil {
		t.Fatalf("获取 sqlDB 失败: %v", err)
	}
	sqlDB.SetMaxOpenConns(1) // :memory: 每个连接是独立库,必须单连接共享
	if err := db.AutoMigrate(&model.SysUser{}, &model.SysRole{}, &model.SysMenu{}, &model.SysAPI{}); err != nil {
		t.Fatalf("内存库建表失败: %v", err)
	}

	adapter := newMemCasbinAdapter(initialPolicies)
	enforcer, err := casbin.NewEnforcer(filepath.Join(findModuleRoot(), "config", "rbac_model.conf"), adapter)
	if err != nil {
		t.Fatalf("构建测试 enforcer 失败: %v", err)
	}

	mgr, err := jwtpkg.NewJwtManager(&jwtpkg.Config{
		JwtSecret:             testJWTSecret,
		Issuer:                "qzt-unit-test",
		AccessExpirationTime:  2 * time.Hour,
		RefreshExpirationTime: 7 * 24 * time.Hour,
	})
	if err != nil {
		t.Fatalf("构建测试 JWT Manager 失败: %v", err)
	}

	store := newMemStore()

	oldDB, oldEnforcer, oldJwt, oldStore := app.DB, app.Enforcer, app.JwtManager, cache.GetStore()
	app.DB, app.Enforcer, app.JwtManager = db, enforcer, mgr
	cache.InitStore(store)
	t.Cleanup(func() {
		app.DB, app.Enforcer, app.JwtManager = oldDB, oldEnforcer, oldJwt
		cache.InitStore(oldStore)
	})

	return &testEnv{db: db, store: store, adapter: adapter}
}

// findModuleRoot 从测试 CWD(包目录)向上找 go.mod 所在的模块根。
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
	return "."
}

// ── 数据种子与断言辅助 ──

// seedUser 建一个用户(密码统一为 testPassword),绑定给定角色,返回落库后的实体。
// 注意 Status 带 gorm default:1 标签,零值 0 在 Create 时会被 GORM 跳过、落成默认 1,
// 因此状态列必须显式 Update 写入(禁用用户用例依赖真实 status=0)。
func (e *testEnv) seedUser(t *testing.T, id uint, username string, status int8, roleIDs ...uint) *model.SysUser {
	t.Helper()
	u := &model.SysUser{
		ID:       id,
		Username: username,
		Password: testPasswordHash(),
		Nickname: username + "-昵称",
		Status:   status,
	}
	if err := e.db.Create(u).Error; err != nil {
		t.Fatalf("种子用户 %s 失败: %v", username, err)
	}
	if err := e.db.Model(&model.SysUser{}).Where("id = ?", id).Update("status", status).Error; err != nil {
		t.Fatalf("写入用户 %s 状态失败: %v", username, err)
	}
	if len(roleIDs) > 0 {
		if err := e.db.Model(u).Association("Roles").Append(roleIDToRoles(roleIDs...)); err != nil {
			t.Fatalf("绑定用户 %s 角色失败: %v", username, err)
		}
	}
	got, err := NewUserService().GetByID(context.Background(), id)
	if err != nil {
		t.Fatalf("回读用户 %s 失败: %v", username, err)
	}
	return got
}

// seedRole 建一个角色。
func (e *testEnv) seedRole(t *testing.T, id uint, code, name string) *model.SysRole {
	t.Helper()
	r := &model.SysRole{ID: id, Code: code, Name: name, Status: 1}
	if err := e.db.Create(r).Error; err != nil {
		t.Fatalf("种子角色 %s 失败: %v", code, err)
	}
	return r
}

// seedMenuWithAPIs 建菜单并关联 API(返回菜单 ID)。
func (e *testEnv) seedMenuWithAPIs(t *testing.T, menuID uint, name string, apis []model.SysAPI) uint {
	t.Helper()
	for i := range apis {
		if err := e.db.Create(&apis[i]).Error; err != nil {
			t.Fatalf("种子 API %s %s 失败: %v", apis[i].Path, apis[i].Method, err)
		}
	}
	m := &model.SysMenu{ID: menuID, Name: name, Type: 1, Status: 1}
	if err := e.db.Create(m).Error; err != nil {
		t.Fatalf("种子菜单 %s 失败: %v", name, err)
	}
	if len(apis) > 0 {
		if err := e.db.Model(m).Association("APIs").Append(apis); err != nil {
			t.Fatalf("菜单 %s 关联 API 失败: %v", name, err)
		}
	}
	return menuID
}

func roleIDToRoles(ids ...uint) []model.SysRole {
	roles := make([]model.SysRole, 0, len(ids))
	for _, id := range ids {
		roles = append(roles, model.SysRole{ID: id})
	}
	return roles
}

// formatPolicies 把策略三元组列表排序后格式化成可比较的字符串列表。
func formatPolicies(policies [][]string) []string {
	out := make([]string, 0, len(policies))
	for _, p := range policies {
		out = append(out, strings.Join(p, "|"))
	}
	sort.Strings(out)
	return out
}

// wantPoliciesEqual 断言实际策略集合(排序后)与期望完全一致。
func wantPoliciesEqual(t *testing.T, got [][]string, want [][]string, context string) {
	t.Helper()
	g, w := formatPolicies(got), formatPolicies(want)
	if len(g) != len(w) {
		t.Fatalf("%s: 策略数量不符, got=%v want=%v", context, g, w)
	}
	for i := range g {
		if g[i] != w[i] {
			t.Fatalf("%s: 策略不符, got=%v want=%v", context, g, w)
		}
	}
}
