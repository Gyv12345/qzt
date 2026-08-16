// auth_test.go AuthService 认证测试:登录失败计数与锁定、禁用用户统一文案、
// 登出拉黑、Refresh 轮换拉黑与 token_version 会话撤销、改密。
//
// cache 计数逻辑用内存 Store 替身覆盖(等价 Redis 语义,无需真实 Redis);
// 用户数据落内存 sqlite。依赖真实 Redis 的 TTL 过期自动解锁路径不在单测范围。
package service

import (
	"context"
	"fmt"
	"strings"
	"testing"
	"time"

	"qzt-go-server/internal/app"
	"qzt-go-server/internal/pkg/cache"
	"qzt-go-server/pkg/xcryption"
)

func TestLogin_Success(t *testing.T) {
	env := newTestEnv(t, nil)
	ctx := context.Background()
	env.seedUser(t, 100, "alice", 1)
	svc := NewAuthService()

	// 先制造 1 次失败计数,验证成功登录会清零
	if _, err := svc.Login(ctx, &LoginRequest{Username: "alice", Password: "wrong"}, testLoginIP); err == nil {
		t.Fatal("期望错误密码登录失败")
	}

	resp, err := svc.Login(ctx, &LoginRequest{Username: "alice", Password: testPassword}, testLoginIP)
	if err != nil {
		t.Fatalf("正确密码登录失败: %v", err)
	}
	if resp.AccessToken == "" || resp.RefreshToken == "" {
		t.Fatalf("应返回非空令牌对, got %+v", resp)
	}
	if resp.UserID != 100 || resp.Username != "alice" || resp.Nickname != "alice-昵称" {
		t.Fatalf("登录返回的用户信息不符: %+v", resp)
	}
	if resp.AccessExpire <= time.Now().Unix() {
		t.Fatalf("access 过期时间应晚于当前: %d", resp.AccessExpire)
	}
	if cache.IsLoginLocked("alice", testLoginIP) {
		t.Fatal("成功登录后不应处于锁定状态")
	}

	// 计数已清零:再次失败从满额 5 次重新倒数
	_, err = svc.Login(ctx, &LoginRequest{Username: "alice", Password: "wrong"}, testLoginIP)
	if err == nil || err.Error() != "用户名或密码错误，还可尝试 4 次" {
		t.Fatalf("成功登录应清空失败计数(重新从 5 次倒数), 实际 err=%v", err)
	}
}

// TestLogin_WrongPasswordCountdownAndLock (username, ip) 维度计数:
// 前 4 次失败提示剩余次数,第 5 次锁定,锁定后即使密码正确也拒绝。
func TestLogin_WrongPasswordCountdownAndLock(t *testing.T) {
	env := newTestEnv(t, nil)
	ctx := context.Background()
	env.seedUser(t, 101, "alice", 1)
	svc := NewAuthService()

	for i := 1; i < testLoginMaxCnt; i++ {
		_, err := svc.Login(ctx, &LoginRequest{Username: "alice", Password: "wrong"}, testLoginIP)
		want := fmt.Sprintf("用户名或密码错误，还可尝试 %d 次", testLoginMaxCnt-i)
		if err == nil || err.Error() != want {
			t.Fatalf("第 %d 次失败应提示 %q, 实际 err=%v", i, want, err)
		}
	}

	// 第 5 次失败:计数耗尽,临时锁定
	_, err := svc.Login(ctx, &LoginRequest{Username: "alice", Password: "wrong"}, testLoginIP)
	if err == nil || err.Error() != "登录失败次数过多，账户已被临时锁定" {
		t.Fatalf("第 %d 次失败应提示临时锁定, 实际 err=%v", testLoginMaxCnt, err)
	}

	// 锁定后:正确密码也被拒(IsLoginLocked 先于密码校验),提示带分钟数
	resp, err := svc.Login(ctx, &LoginRequest{Username: "alice", Password: testPassword}, testLoginIP)
	if err == nil {
		t.Fatalf("锁定后正确密码也不应登录成功, got %+v", resp)
	}
	msg := err.Error()
	if !strings.HasPrefix(msg, "登录失败次数过多，请 ") || !strings.HasSuffix(msg, " 分钟后重试") {
		t.Fatalf("锁定提示应为「登录失败次数过多，请 N 分钟后重试」, 实际 %q", msg)
	}
}

// TestLogin_UnknownUser 用户不存在:与密码错误统一文案(防枚举),且计入失败计数。
func TestLogin_UnknownUser(t *testing.T) {
	newTestEnv(t, nil) // 仅需注入全局,无种子数据
	ctx := context.Background()
	svc := NewAuthService()

	_, err := svc.Login(ctx, &LoginRequest{Username: "ghost", Password: "whatever"}, testLoginIP)
	if err == nil || err.Error() != "用户名或密码错误" {
		t.Fatalf("用户不存在应返回统一文案, 实际 err=%v", err)
	}
	// 计数确实发生:同 (username, ip) 累计 5 次后,下一次登录被锁定
	// (用户不存在路径每次都返回统一文案,不展示倒数,锁定提示出现在第 6 次)
	for i := 1; i < testLoginMaxCnt; i++ {
		if _, err := svc.Login(ctx, &LoginRequest{Username: "ghost", Password: "whatever"}, testLoginIP); err == nil {
			t.Fatal("用户不存在登录应失败")
		}
	}
	resp, err := svc.Login(ctx, &LoginRequest{Username: "ghost", Password: "whatever"}, testLoginIP)
	if err == nil {
		t.Fatalf("计数满额后应锁定, got %+v", resp)
	}
	if !strings.HasPrefix(err.Error(), "登录失败次数过多，请 ") {
		t.Fatalf("第 %d 次之后应提示锁定, 实际 err=%v", testLoginMaxCnt, err)
	}
}

// TestLogin_DisabledUserUnifiedMessage 禁用用户:无论密码对错都返回统一文案
// (不确认账号存在性,防用户名枚举),且不计入失败计数(不产生 login:fail 计数 key)。
func TestLogin_DisabledUserUnifiedMessage(t *testing.T) {
	env := newTestEnv(t, nil)
	ctx := context.Background()
	env.seedUser(t, 102, "bob", 0) // status=0 禁用
	svc := NewAuthService()

	const wantMsg = "登录失败: 用户名、密码错误或账号已被禁用"
	cases := []struct {
		name string
		pwd  string
	}{
		{"密码正确", testPassword},
		{"密码错误", "wrong"},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			resp, err := svc.Login(ctx, &LoginRequest{Username: "bob", Password: c.pwd}, testLoginIP)
			if err == nil {
				t.Fatalf("禁用用户不应登录成功, got %+v", resp)
			}
			if err.Error() != wantMsg {
				t.Fatalf("禁用用户应返回统一文案 %q, 实际 %q", wantMsg, err.Error())
			}
		})
	}

	// 多次尝试后不产生计数 key → 不会误锁定
	for i := 0; i < testLoginMaxCnt*2; i++ {
		if _, err := svc.Login(ctx, &LoginRequest{Username: "bob", Password: "wrong"}, testLoginIP); err == nil {
			t.Fatal("禁用用户登录应失败")
		}
	}
	if cache.IsLoginLocked("bob", testLoginIP) {
		t.Fatal("禁用用户登录不应累计失败计数导致锁定")
	}
	for _, k := range env.store.snapshotKeys() {
		if strings.HasPrefix(k, "login:fail:") && strings.Contains(k, "bob") {
			t.Fatalf("禁用用户登录不应产生失败计数 key, 发现 %q", k)
		}
	}
}

// TestLogin_UsernameDimensionLock 纯用户名维度阈值(15 次):攻击者换 IP 也绕不过;
// 且锁定只影响该用户名,不影响其他用户名。
func TestLogin_UsernameDimensionLock(t *testing.T) {
	newTestEnv(t, nil) // 仅需注入全局(app.DB/JwtManager/cache store)
	ctx := context.Background()
	svc := NewAuthService()

	// 每次换 IP,IP 维度计数永不达 5;15 次后用户名维度达阈值
	for i := 0; i < 15; i++ {
		ip := fmt.Sprintf("10.0.%d.%d", i/250, i%250+1)
		if _, err := svc.Login(ctx, &LoginRequest{Username: "ghost", Password: "x"}, ip); err == nil {
			t.Fatalf("用户不存在登录应失败(ip=%s)", ip)
		}
	}
	// 第 16 次换新 IP 仍被拒(用户名维度锁定)
	resp, err := svc.Login(ctx, &LoginRequest{Username: "ghost", Password: "x"}, "172.16.0.1")
	if err == nil {
		t.Fatalf("用户名维度锁定后换 IP 也不应放行, got %+v", resp)
	}
	if !strings.HasPrefix(err.Error(), "登录失败次数过多") {
		t.Fatalf("应提示锁定, 实际 %q", err.Error())
	}

	// 其他用户名不受牵连
	if _, err := svc.Login(ctx, &LoginRequest{Username: "another", Password: "x"}, "172.16.0.1"); err == nil || err.Error() != "用户名或密码错误" {
		t.Fatalf("其他用户名不应被连带锁定, 实际 err=%v", err)
	}
}

func TestLogout_BlacklistsToken(t *testing.T) {
	newTestEnv(t, nil) // 仅需注入全局(app.JwtManager/cache store)
	ctx := context.Background()
	svc := NewAuthService()

	tokens, err := app.JwtManager.GenerateTokens(300, "alice", 0)
	if err != nil {
		t.Fatalf("生成测试令牌失败: %v", err)
	}

	// 有效 access token:登出后进入黑名单(按剩余存活期过期)
	if err := svc.Logout(ctx, tokens.AccessToken); err != nil {
		t.Fatalf("Logout 有效 token 不应报错: %v", err)
	}
	if !cache.IsTokenBlacklisted(tokens.AccessToken) {
		t.Fatal("登出后 access token 应被拉黑")
	}
	if cache.IsTokenBlacklisted(tokens.RefreshToken) {
		t.Fatal("登出 access token 不应连带拉黑 refresh token")
	}

	// 无效 token:无需拉黑,不报错
	if err := svc.Logout(ctx, "not-a-jwt-token"); err != nil {
		t.Fatalf("Logout 无效 token 应静默返回 nil, 实际 %v", err)
	}
	if cache.IsTokenBlacklisted("not-a-jwt-token") {
		t.Fatal("无效 token 不应进黑名单")
	}
}

func TestRefresh_RotatesAndBlacklistsOld(t *testing.T) {
	env := newTestEnv(t, nil)
	ctx := context.Background()
	env.seedUser(t, 103, "alice", 1)
	svc := NewAuthService()

	login, err := svc.Login(ctx, &LoginRequest{Username: "alice", Password: testPassword}, testLoginIP)
	if err != nil {
		t.Fatalf("登录失败: %v", err)
	}

	resp, err := svc.Refresh(ctx, &RefreshRequest{RefreshToken: login.RefreshToken})
	if err != nil {
		t.Fatalf("Refresh 失败: %v", err)
	}
	if resp.AccessToken == "" || resp.RefreshToken == "" {
		t.Fatalf("刷新应返回新令牌对, got %+v", resp)
	}
	if resp.RefreshToken == login.RefreshToken {
		t.Fatal("刷新应轮换出新 refresh token, 不应复用旧值")
	}
	if resp.UserID != 103 || resp.Username != "alice" {
		t.Fatalf("刷新返回的用户信息不符: %+v", resp)
	}

	// 新 access token 是合法的访问令牌
	claims, err := app.JwtManager.ParseToken(resp.AccessToken)
	if err != nil || !claims.IsAccessToken() {
		t.Fatalf("新 access token 应可解析且为 access 类型, err=%v", err)
	}

	// 轮换拉黑:旧 refresh token 已进黑名单,新 refresh token 未被拉黑
	if !cache.IsTokenBlacklisted(login.RefreshToken) {
		t.Fatal("轮换后旧 refresh token 应立即拉黑")
	}
	if cache.IsTokenBlacklisted(resp.RefreshToken) {
		t.Fatal("新 refresh token 不应被拉黑")
	}
}

// TestRefresh_RejectsInvalidTokens 非法输入拒绝:垃圾串 / access token 冒充 refresh token。
func TestRefresh_RejectsInvalidTokens(t *testing.T) {
	newTestEnv(t, nil)
	ctx := context.Background()
	svc := NewAuthService()

	tokens, err := app.JwtManager.GenerateTokens(103, "alice", 0)
	if err != nil {
		t.Fatalf("生成测试令牌失败: %v", err)
	}

	cases := []struct {
		name string
		rt   string
	}{
		{"垃圾字符串", "garbage.token.value"},
		{"access token 冒充", tokens.AccessToken},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			resp, err := svc.Refresh(ctx, &RefreshRequest{RefreshToken: c.rt})
			if err == nil {
				t.Fatalf("应拒绝, 实际成功 %+v", resp)
			}
			if err.Error() != "refresh token 无效或已过期" {
				t.Fatalf("错误文案不符, 实际 %q", err.Error())
			}
		})
	}
}

// TestRefresh_TokenVersionMismatch 改密后 token_version 变更,旧 refresh token 拒绝刷新(会话撤销)。
func TestRefresh_TokenVersionMismatch(t *testing.T) {
	env := newTestEnv(t, nil)
	ctx := context.Background()
	env.seedUser(t, 104, "alice", 1)
	svc := NewAuthService()

	login, err := svc.Login(ctx, &LoginRequest{Username: "alice", Password: testPassword}, testLoginIP)
	if err != nil {
		t.Fatalf("登录失败: %v", err)
	}

	// 改密使 TokenVersion+1
	if err := svc.ChangePassword(ctx, 104, &ChangePasswordRequest{OldPassword: testPassword, NewPassword: "NewPass123"}); err != nil {
		t.Fatalf("改密失败: %v", err)
	}

	resp, err := svc.Refresh(ctx, &RefreshRequest{RefreshToken: login.RefreshToken})
	if err == nil {
		t.Fatalf("改密后旧 refresh token 不应再刷新, got %+v", resp)
	}
	if err.Error() != "登录状态已失效，请重新登录" {
		t.Fatalf("错误文案不符, 实际 %q", err.Error())
	}
}

func TestChangePassword(t *testing.T) {
	ctx := context.Background()

	t.Run("新密码长度不合法", func(t *testing.T) {
		newTestEnv(t, nil)
		svc := NewAuthService()
		cases := []struct {
			name string
			pwd  string
		}{
			{"过短(5位)", "12345"},
			{"过长(73位)", strings.Repeat("a", 73)},
		}
		for _, c := range cases {
			t.Run(c.name, func(t *testing.T) {
				err := svc.ChangePassword(ctx, 1, &ChangePasswordRequest{OldPassword: testPassword, NewPassword: c.pwd})
				if err == nil || err.Error() != "新密码长度需在 6-72 之间" {
					t.Fatalf("应拒绝 %s, 实际 err=%v", c.name, err)
				}
			})
		}
	})

	t.Run("旧密码错误", func(t *testing.T) {
		env := newTestEnv(t, nil)
		u := env.seedUser(t, 105, "alice", 1)
		svc := NewAuthService()
		err := svc.ChangePassword(ctx, u.ID, &ChangePasswordRequest{OldPassword: "wrong-old", NewPassword: "NewPass123"})
		if err == nil || err.Error() != "旧密码错误" {
			t.Fatalf("应提示旧密码错误, 实际 err=%v", err)
		}
		got, _ := NewUserService().GetByID(ctx, u.ID)
		if got.TokenVersion != u.TokenVersion {
			t.Fatalf("旧密码校验失败不应变更 TokenVersion: before=%d after=%d", u.TokenVersion, got.TokenVersion)
		}
	})

	t.Run("成功改密并使旧会话失效", func(t *testing.T) {
		env := newTestEnv(t, nil)
		u := env.seedUser(t, 106, "alice", 1)
		svc := NewAuthService()

		login, err := svc.Login(ctx, &LoginRequest{Username: "alice", Password: testPassword}, testLoginIP)
		if err != nil {
			t.Fatalf("登录失败: %v", err)
		}
		if err := svc.ChangePassword(ctx, u.ID, &ChangePasswordRequest{OldPassword: testPassword, NewPassword: "NewPass123"}); err != nil {
			t.Fatalf("改密失败: %v", err)
		}

		got, _ := NewUserService().GetByID(ctx, u.ID)
		if got.TokenVersion != u.TokenVersion+1 {
			t.Fatalf("改密应使 TokenVersion+1: before=%d after=%d", u.TokenVersion, got.TokenVersion)
		}
		if !xcryption.CheckPassword(got.Password, "NewPass123") {
			t.Fatal("改密后库中哈希应对应新密码")
		}
		// 旧 refresh token 随版本失效
		if _, err := svc.Refresh(ctx, &RefreshRequest{RefreshToken: login.RefreshToken}); err == nil {
			t.Fatal("改密后旧 refresh token 应失效")
		}
		// 新密码可登录
		if _, err := svc.Login(ctx, &LoginRequest{Username: "alice", Password: "NewPass123"}, testLoginIP); err != nil {
			t.Fatalf("新密码登录应成功: %v", err)
		}
	})
}
