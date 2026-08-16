// user_test.go UserService 关键守卫测试(近期安全修复的回归):
//   - Delete:超管账户(id=1)不可删、不能删自己、持超管角色者不可删;
//   - Update:admin(id=1) 必须保留超管角色(id=1),不带角色字段时不误拦;
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

// TestUserUpdate_AdminKeepsSuperAdminRole admin(id=1) 的角色保护:
// 带 role_ids 但不含超管角色(含清空)一律拒绝;保留超管角色的变更放行;
// 不带 role_ids 的普通编辑不触发该校验、也不动角色。
func TestUserUpdate_AdminKeepsSuperAdminRole(t *testing.T) {
	env := newTestEnv(t, nil)
	ctx := context.Background()
	env.seedRole(t, 1, model.SuperAdminRoleCode, "超级管理员")
	env.seedRole(t, 2, "ops", "运维")
	env.seedUser(t, 1, "admin", 1, 1)
	svc := NewUserService()

	rejectCases := []struct {
		name    string
		roleIDs []uint
	}{
		{"摘掉超管角色", []uint{2}},
		{"清空角色", []uint{}},
	}
	for _, c := range rejectCases {
		t.Run(c.name, func(t *testing.T) {
			err := svc.Update(ctx, 1, &UpdateUserRequest{RoleIDs: c.roleIDs})
			if err == nil || err.Error() != "超级管理员账户必须保留超级管理员角色" {
				t.Fatalf("应拒绝 %s, 实际 err=%v", c.name, err)
			}
			got, _ := svc.GetByID(ctx, 1)
			if len(got.Roles) != 1 || got.Roles[0].ID != 1 {
				t.Fatalf("被拒后 admin 角色应保持不变, got=%v", got.Roles)
			}
		})
	}

	// 保留超管角色的变更放行
	if err := svc.Update(ctx, 1, &UpdateUserRequest{RoleIDs: []uint{1, 2}}); err != nil {
		t.Fatalf("保留超管角色的更新应成功: %v", err)
	}
	got, _ := svc.GetByID(ctx, 1)
	if len(got.Roles) != 2 {
		t.Fatalf("admin 应持有 2 个角色, got=%v", got.Roles)
	}
	versionAfterRoleChange := got.TokenVersion // 新增角色会 +1,后续以此次为基线

	// 不带 role_ids:守卫跳过,角色不动,也不踢会话
	if err := svc.Update(ctx, 1, &UpdateUserRequest{Nickname: "新昵称"}); err != nil {
		t.Fatalf("不带角色的普通编辑应成功: %v", err)
	}
	got, _ = svc.GetByID(ctx, 1)
	if got.Nickname != "新昵称" {
		t.Fatalf("昵称应已更新, got %q", got.Nickname)
	}
	if len(got.Roles) != 2 {
		t.Fatalf("不带 role_ids 的编辑不应改动角色, got=%v", got.Roles)
	}
	if got.TokenVersion != versionAfterRoleChange {
		t.Fatalf("角色集合未变的编辑不应 bump TokenVersion: before=%d after=%d", versionAfterRoleChange, got.TokenVersion)
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
