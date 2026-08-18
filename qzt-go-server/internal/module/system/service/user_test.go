// user_test.go UserService 关键守卫测试(近期安全修复的回归):
//   - Delete:超管账户(id=1)不可删、不能删自己、持超管角色者不可删;
//   - Update:admin(id=1) 密码/状态/角色不可变更(防篡改硬保护),
//     无变化回填(编辑表单回填相同 status/role_ids)放行;
//   - ResetPassword:根账户不可被重置密码(接管直达通道);
//   - TokenVersion 只在密码/状态/角色真正变化时 +1(编辑资料不应踢人会话);
//   - UpdateProfile 仅允许改昵称/头像/邮箱/手机。
//
// 用户删除/落库走内存 sqlite;repo 软删使用的 MySQL CONCAT/LEFT 方言无法在
// sqlite 执行,故只测守卫路径(守卫均在方言 SQL 之前生效)。
package service

import (
	"context"
	"strings"
	"testing"

	"qzt-go-server/internal/model"
	"qzt-go-server/internal/pkg/cache"
	"qzt-go-server/pkg/xcryption"
)

func ptrInt8(v int8) *int8 { return &v }

func TestUserDelete_Guards(t *testing.T) {
	env := newTestEnv(t, nil)
	ctx := context.Background()
	env.seedRole(t, 10, model.SuperAdminRoleCode, "超级管理员")
	env.seedRole(t, 11, "ops", "运维")
	env.seedUser(t, 200, "victim", 1, 10) // 持 super_admin 角色的普通 ID 用户
	env.seedUser(t, 201, "normal", 1, 11)
	svc := NewUserService()

	cases := []struct {
		name        string
		id          uint
		currentUser uint
		wantErrSub  string
	}{
		{"超管账户 id=1 不可删", 1, 201, "超级管理员账户不可删除"},
		{"不能删除当前登录用户", 201, 201, "不能删除当前登录用户"},
		{"持 super_admin 角色的用户不可删", 200, 201, "不能删除超级管理员"},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			err := svc.Delete(ctx, c.id, c.currentUser)
			if err == nil {
				t.Fatal("期望删除被拒绝, 实际成功")
			}
			if !strings.Contains(err.Error(), c.wantErrSub) {
				t.Fatalf("错误信息应包含 %q, 实际 %q", c.wantErrSub, err.Error())
			}
		})
	}
}

// TestUserUpdate_AdminImmutability admin(id=1) 防篡改硬保护回归:
// 密码/状态/角色经由 Update 一律不可变更(无论怎么变),仅资料字段放行;
// 前端编辑表单回填的相同 status/role_ids 属于无变化回填,必须放行。
func TestUserUpdate_AdminImmutability(t *testing.T) {
	env := newTestEnv(t, nil)
	ctx := context.Background()
	env.seedRole(t, 1, model.SuperAdminRoleCode, "超级管理员")
	env.seedRole(t, 2, "ops", "运维")
	env.seedUser(t, 1, "admin", 1, 1)
	svc := NewUserService()

	rejectCases := []struct {
		name       string
		req        *UpdateUserRequest
		wantErrSub string
	}{
		{"改密码被拒", &UpdateUserRequest{Password: "NewPass123"}, "超级管理员密码仅可在个人中心修改"},
		{"禁用被拒", &UpdateUserRequest{Status: ptrInt8(0)}, "超级管理员账户状态不可修改"},
		{"摘掉超管角色被拒", &UpdateUserRequest{RoleIDs: []uint{2}}, "超级管理员账户角色不可修改"},
		{"清空角色被拒", &UpdateUserRequest{RoleIDs: []uint{}}, "超级管理员账户角色不可修改"},
		{"新增角色被拒(即使保留超管角色)", &UpdateUserRequest{RoleIDs: []uint{1, 2}}, "超级管理员账户角色不可修改"},
	}
	for _, c := range rejectCases {
		t.Run(c.name, func(t *testing.T) {
			before, _ := svc.GetByID(ctx, 1)
			err := svc.Update(ctx, 1, c.req)
			if err == nil || !strings.Contains(err.Error(), c.wantErrSub) {
				t.Fatalf("应拒绝并提示 %q, 实际 err=%v", c.wantErrSub, err)
			}
			got, _ := svc.GetByID(ctx, 1)
			if got.TokenVersion != before.TokenVersion {
				t.Fatalf("被拒的更新不应落库, TokenVersion before=%d after=%d", before.TokenVersion, got.TokenVersion)
			}
			if len(got.Roles) != 1 || got.Roles[0].ID != 1 {
				t.Fatalf("被拒后 admin 角色应保持不变, got=%v", got.Roles)
			}
			if c.req.Password != "" && xcryption.CheckPassword(got.Password, c.req.Password) {
				t.Fatal("被拒后密码不应被改动")
			}
		})
	}

	// 编辑表单回填场景:带相同 status/role_ids(无变化)+ 改昵称,应放行且不踢会话。
	before, _ := svc.GetByID(ctx, 1)
	err := svc.Update(ctx, 1, &UpdateUserRequest{
		Nickname: "新昵称", Status: ptrInt8(1), RoleIDs: []uint{1},
	})
	if err != nil {
		t.Fatalf("无变化回填+资料编辑应成功: %v", err)
	}
	got, _ := svc.GetByID(ctx, 1)
	if got.Nickname != "新昵称" {
		t.Fatalf("昵称应已更新, got %q", got.Nickname)
	}
	if got.TokenVersion != before.TokenVersion {
		t.Fatalf("无变化回填不应 bump TokenVersion: before=%d after=%d", before.TokenVersion, got.TokenVersion)
	}
	if len(got.Roles) != 1 || got.Roles[0].ID != 1 {
		t.Fatalf("admin 角色应保持不变, got=%v", got.Roles)
	}
}

// TestUserResetPassword_RootRejected 根账户(id=1)不可被管理员重置密码:
// 这是接管系统的直达通道,任何操作者都被拒绝,密码与 TokenVersion 均不变。
func TestUserResetPassword_RootRejected(t *testing.T) {
	env := newTestEnv(t, nil)
	ctx := context.Background()
	env.seedRole(t, 1, model.SuperAdminRoleCode, "超级管理员")
	before := env.seedUser(t, 1, "admin", 1, 1)
	svc := NewUserService()

	err := svc.ResetPassword(ctx, 1, &ResetPasswordRequest{Password: "hacked123"})
	if err == nil || !strings.Contains(err.Error(), "不可被重置") {
		t.Fatalf("重置根账户密码应被拒绝, 实际 err=%v", err)
	}
	got, _ := svc.GetByID(ctx, 1)
	if !xcryption.CheckPassword(got.Password, testPassword) {
		t.Fatal("被拒后根账户密码不应被改动")
	}
	if got.TokenVersion != before.TokenVersion {
		t.Fatalf("被拒后不应 bump TokenVersion: before=%d after=%d", before.TokenVersion, got.TokenVersion)
	}
}

// TestUserUpdate_TokenVersionBump 会话撤销粒度回归:仅密码/状态/角色"真正变化"时
// TokenVersion+1;仅改资料、回填相同状态、角色集合重排等不应踢出用户会话。
func TestUserUpdate_TokenVersionBump(t *testing.T) {
	cases := []struct {
		name     string
		seedIDs  []uint // 初始角色
		req      func() *UpdateUserRequest
		wantBump bool
	}{
		{
			name:     "仅改昵称不踢会话",
			seedIDs:  []uint{2, 3},
			req:      func() *UpdateUserRequest { return &UpdateUserRequest{Nickname: "只改昵称"} },
			wantBump: false,
		},
		{
			name:     "回填相同状态不踢会话",
			seedIDs:  []uint{2, 3},
			req:      func() *UpdateUserRequest { return &UpdateUserRequest{Status: ptrInt8(1)} },
			wantBump: false,
		},
		{
			name:     "状态由启用改禁用踢会话",
			seedIDs:  []uint{2, 3},
			req:      func() *UpdateUserRequest { return &UpdateUserRequest{Status: ptrInt8(0)} },
			wantBump: true,
		},
		{
			name:     "修改密码踢会话",
			seedIDs:  []uint{2, 3},
			req:      func() *UpdateUserRequest { return &UpdateUserRequest{Password: "NewPass123"} },
			wantBump: true,
		},
		{
			name:     "角色集合重排(相同集合)不踢会话",
			seedIDs:  []uint{2, 3},
			req:      func() *UpdateUserRequest { return &UpdateUserRequest{RoleIDs: []uint{3, 2}} },
			wantBump: false,
		},
		{
			name:     "新增角色踢会话",
			seedIDs:  []uint{2, 3},
			req:      func() *UpdateUserRequest { return &UpdateUserRequest{RoleIDs: []uint{2, 3, 4}} },
			wantBump: true,
		},
		{
			name:     "清空角色踢会话",
			seedIDs:  []uint{2},
			req:      func() *UpdateUserRequest { return &UpdateUserRequest{RoleIDs: []uint{}} },
			wantBump: true,
		},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			env := newTestEnv(t, nil)
			ctx := context.Background()
			env.seedRole(t, 2, "ops", "运维")
			env.seedRole(t, 3, "dev", "开发")
			env.seedRole(t, 4, "qa", "测试")
			u := env.seedUser(t, 500, "victim", 1, c.seedIDs...)

			svc := NewUserService()
			if err := svc.Update(ctx, u.ID, c.req()); err != nil {
				t.Fatalf("Update 失败: %v", err)
			}
			got, err := svc.GetByID(ctx, u.ID)
			if err != nil {
				t.Fatalf("回读失败: %v", err)
			}
			if c.wantBump && got.TokenVersion != u.TokenVersion+1 {
				t.Fatalf("应 TokenVersion+1: before=%d after=%d", u.TokenVersion, got.TokenVersion)
			}
			if !c.wantBump && got.TokenVersion != u.TokenVersion {
				t.Fatalf("不应变更 TokenVersion: before=%d after=%d", u.TokenVersion, got.TokenVersion)
			}
		})
	}
}

// TestUpdateProfile_OnlyAllowedFields 个人资料修改只允许昵称/头像/邮箱/手机,
// 用户名/密码/状态/角色不受影响。
func TestUpdateProfile_OnlyAllowedFields(t *testing.T) {
	env := newTestEnv(t, nil)
	ctx := context.Background()
	env.seedRole(t, 21, "ops", "运维")
	u := env.seedUser(t, 300, "alice", 1, 21)
	svc := NewAuthService()

	got, err := svc.UpdateProfile(ctx, u.ID, &UpdateProfileRequest{
		Nickname: "新昵称",
		Avatar:   "https://cdn.example.com/a.png",
		Email:    "new@example.com",
		Phone:    "13800000000",
	})
	if err != nil {
		t.Fatalf("UpdateProfile 失败: %v", err)
	}
	if got.Nickname != "新昵称" || got.Avatar != "https://cdn.example.com/a.png" ||
		got.Email != "new@example.com" || got.Phone != "13800000000" {
		t.Fatalf("资料字段应全部更新: %+v", got)
	}
	if got.Username != "alice" || got.Status != 1 || len(got.Roles) != 1 || got.Roles[0].ID != 21 {
		t.Fatalf("用户名/状态/角色不应被改动: %+v", got)
	}
	if !xcryption.CheckPassword(got.Password, testPassword) {
		t.Fatal("UpdateProfile 不应改动密码")
	}
}

// TestUserResetPassword 管理员重置密码三要素:新密码落库可校验、TokenVersion+1
// (撤销旧会话)、该用户名全部维度的登录失败计数被清除(重置完立即可登录)。
func TestUserResetPassword(t *testing.T) {
	env := newTestEnv(t, nil)
	ctx := context.Background()
	env.seedRole(t, 11, "ops", "运维")
	env.seedUser(t, 201, "locked", 1, 11)
	svc := NewUserService()

	// 制造失败计数:两个 IP 维度 + 用户名维度(IncrLoginFail 内部同步累加)
	cache.IncrLoginFail("locked", "1.1.1.1")
	cache.IncrLoginFail("locked", "1.1.1.1")
	cache.IncrLoginFail("locked", "2.2.2.2")

	before, err := svc.GetByID(ctx, 201)
	if err != nil {
		t.Fatalf("获取用户失败: %v", err)
	}
	if err := svc.ResetPassword(ctx, 201, &ResetPasswordRequest{Password: "newpass123"}); err != nil {
		t.Fatalf("重置密码应成功: %v", err)
	}

	got, _ := svc.GetByID(ctx, 201)
	if !xcryption.CheckPassword(got.Password, "newpass123") {
		t.Fatal("重置后新密码应校验通过")
	}
	if got.TokenVersion != before.TokenVersion+1 {
		t.Fatalf("重置密码应 bump TokenVersion: before=%d after=%d", before.TokenVersion, got.TokenVersion)
	}
	for _, k := range env.store.snapshotKeys() {
		if strings.HasPrefix(k, "login:fail:") {
			t.Fatalf("重置密码应清除该用户全部登录失败计数, 残留 key=%q", k)
		}
	}
}
