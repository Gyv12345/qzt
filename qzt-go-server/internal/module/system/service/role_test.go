// role_test.go RoleService 权限策略重建(RBAC 写路径)测试。
//
// 覆盖 SetMenus/SetAPIs 的核心行为:
//   - 策略被整体重建为菜单关联 API 的集合(旧策略清除、跨菜单共享 API 去重、
//     菜单集合收缩/清空时策略同步收缩/清空);
//   - SetAPIs 直接重建 + GetAPIs 回读;
//   - casbin 清除/写入/保存任一步失败时返回包装错误并触发回滚 LoadPolicy,
//     保证内存策略与持久层一致(role.go 中三处 app.Enforcer.LoadPolicy())。
//
// Casbin 用 config/rbac_model.conf + 内存 adapter(见 testenv_test.go),不依赖 MySQL gorm-adapter。
package service

import (
	"context"
	"errors"
	"sort"
	"strings"
	"testing"

	"qzt-go-server/internal/app"
	"qzt-go-server/internal/model"
	"qzt-go-server/internal/repository"
)

func TestDedupPolicies(t *testing.T) {
	cases := []struct {
		name string
		in   [][]string
		want [][]string
	}{
		{"空输入原样返回", nil, nil},
		{"无重复保序", [][]string{{"a", "/x", "GET"}, {"a", "/y", "POST"}}, [][]string{{"a", "/x", "GET"}, {"a", "/y", "POST"}}},
		{"完全重复只留首个", [][]string{{"a", "/x", "GET"}, {"a", "/x", "GET"}}, [][]string{{"a", "/x", "GET"}}},
		{
			"多菜单共享 API 去重(保留首次出现顺序)",
			[][]string{{"r", "/a", "GET"}, {"r", "/shared", "GET"}, {"r", "/shared", "GET"}, {"r", "/b", "POST"}},
			[][]string{{"r", "/a", "GET"}, {"r", "/shared", "GET"}, {"r", "/b", "POST"}},
		},
		{"同 path 不同 method 不算重复", [][]string{{"r", "/x", "GET"}, {"r", "/x", "POST"}}, [][]string{{"r", "/x", "GET"}, {"r", "/x", "POST"}}},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got := dedupPolicies(c.in)
			if len(got) != len(c.want) {
				t.Fatalf("去重后长度 %d != 期望 %d, got=%v", len(got), len(c.want), got)
			}
			for i := range got {
				if strings.Join(got[i], "|") != strings.Join(c.want[i], "|") {
					t.Fatalf("第 %d 条策略不符: got=%v want=%v", i, got, c.want)
				}
			}
		})
	}
}

// TestSetMenus_RebuildsRolePolicies SetMenus 后该角色的策略必须重建为
// 所选菜单关联 API 的集合:旧策略清除、跨菜单共享 API 去重、其他角色不受影响、
// 菜单集合收缩时策略同步收缩、清空菜单清空策略(含 DB 关联)。
func TestSetMenus_RebuildsRolePolicies(t *testing.T) {
	env := newTestEnv(t, [][]string{
		{"tester", "/legacy", "GET"}, // 角色既有旧策略,验证被清除
		{"other", "/keep", "GET"},    // 别的角色策略不受影响
	})
	ctx := context.Background()

	role := env.seedRole(t, 7, "tester", "测试角色")
	// m1 挂 a1、shared;m2 挂 shared、a3 —— shared 由两个菜单共享,必须去重。
	m1 := env.seedMenuWithAPIs(t, 101, "菜单1", []model.SysAPI{
		{ID: 11, Path: "/a1", Method: "GET"},
		{ID: 12, Path: "/shared", Method: "GET"},
	})
	m2 := env.seedMenuWithAPIs(t, 102, "菜单2", []model.SysAPI{
		{ID: 13, Path: "/shared", Method: "GET"},
		{ID: 14, Path: "/a3", Method: "POST"},
	})

	svc := NewRoleService()

	// 1. 同时授权 m1+m2:旧 /legacy 清除,/shared 只出现一次。
	if err := svc.SetMenus(ctx, role.ID, []uint{m1, m2}); err != nil {
		t.Fatalf("SetMenus(m1,m2) 失败: %v", err)
	}
	wantPoliciesEqual(t, app.Enforcer.GetFilteredPolicy(0, "tester"), [][]string{
		{"tester", "/a1", "GET"},
		{"tester", "/shared", "GET"},
		{"tester", "/a3", "POST"},
	}, "SetMenus(m1,m2) 后")
	wantPoliciesEqual(t, app.Enforcer.GetFilteredPolicy(0, "other"), [][]string{{"other", "/keep", "GET"}}, "其他角色策略应保留")

	// 2. 菜单收缩为仅 m1:a3 消失,a1/shared 仍在。
	if err := svc.SetMenus(ctx, role.ID, []uint{m1}); err != nil {
		t.Fatalf("SetMenus(m1) 失败: %v", err)
	}
	wantPoliciesEqual(t, app.Enforcer.GetFilteredPolicy(0, "tester"), [][]string{
		{"tester", "/a1", "GET"},
		{"tester", "/shared", "GET"},
	}, "SetMenus(m1) 后")

	// 3. 菜单清空:角色策略与 DB 关联随之清空。
	if err := svc.SetMenus(ctx, role.ID, nil); err != nil {
		t.Fatalf("SetMenus(nil) 失败: %v", err)
	}
	if got := app.Enforcer.GetFilteredPolicy(0, "tester"); len(got) != 0 {
		t.Fatalf("清空菜单后策略应为空, got=%v", got)
	}
	menus, err := repository.NewRoleRepo().GetMenusByRoleID(ctx, role.ID)
	if err != nil {
		t.Fatalf("回读角色菜单失败: %v", err)
	}
	if len(menus) != 0 {
		t.Fatalf("清空后角色菜单关联应为空, got=%d 条", len(menus))
	}
}

// TestSetAPIs_RebuildsAndDedups SetAPIs 直接重建角色策略(输入去重),GetAPIs 能原样回读。
func TestSetAPIs_RebuildsAndDedups(t *testing.T) {
	env := newTestEnv(t, [][]string{{"ops", "/old", "GET"}})
	ctx := context.Background()

	role := env.seedRole(t, 8, "ops", "运维")
	svc := NewRoleService()

	// 重复输入 (path,method) 只保留一份;旧 /old 清除。
	in := []RoleAPIItem{
		{Path: "/x", Method: "GET"},
		{Path: "/x", Method: "GET"},
		{Path: "/x", Method: "POST"},
		{Path: "/y", Method: "DELETE"},
	}
	if err := svc.SetAPIs(ctx, role.ID, in); err != nil {
		t.Fatalf("SetAPIs 失败: %v", err)
	}
	want := [][]string{
		{"ops", "/x", "GET"},
		{"ops", "/x", "POST"},
		{"ops", "/y", "DELETE"},
	}
	wantPoliciesEqual(t, app.Enforcer.GetFilteredPolicy(0, "ops"), want, "SetAPIs 后")

	// GetAPIs 回读与写入集合一致。
	got, err := svc.GetAPIs(ctx, role.ID)
	if err != nil {
		t.Fatalf("GetAPIs 失败: %v", err)
	}
	wantStr := []string{"/x|GET", "/x|POST", "/y|DELETE"}
	if len(got) != len(wantStr) {
		t.Fatalf("GetAPIs 数量不符: got=%d want=%d", len(got), len(wantStr))
	}
	gotStr := make([]string, 0, len(got))
	for _, a := range got {
		gotStr = append(gotStr, a.Path+"|"+a.Method)
	}
	sort.Strings(gotStr)
	wantCp := append([]string(nil), wantStr...)
	sort.Strings(wantCp)
	for i := range gotStr {
		if gotStr[i] != wantCp[i] {
			t.Fatalf("GetAPIs 不符: got=%v want=%v", gotStr, wantCp)
		}
	}

	// 空列表清空角色策略。
	if err := svc.SetAPIs(ctx, role.ID, nil); err != nil {
		t.Fatalf("SetAPIs(nil) 失败: %v", err)
	}
	if got := app.Enforcer.GetFilteredPolicy(0, "ops"); len(got) != 0 {
		t.Fatalf("清空后策略应为空, got=%v", got)
	}
}

// TestRoleRebuild_FailureRollback casbin 清除/写入/保存任一步失败时:
// 返回包装错误,并触发回滚 LoadPolicy(内存策略重置为持久层状态,不残留中间态)。
func TestRoleRebuild_FailureRollback(t *testing.T) {
	cases := []struct {
		name          string
		failOp        string     // adapter 故障操作名
		assignMenus   bool       // true=带菜单触发新增分支;false=nil 只走清除分支
		wantErrSub    string     // 服务返回错误需包含的关键字
		afterPolicies [][]string // 回滚后 tester 的期望内存策略
	}{
		{
			name:          "清除旧策略失败",
			failOp:        "RemoveFilteredPolicy",
			assignMenus:   false,
			wantErrSub:    "清除旧权限策略失败",
			afterPolicies: [][]string{{"tester", "/old", "GET"}}, // 清除失败内存未动,旧策略保留
		},
		{
			name:          "写入新策略失败",
			failOp:        "AddPolicies",
			assignMenus:   true,
			wantErrSub:    "写入权限策略失败",
			afterPolicies: nil, // 清除已穿透 adapter(autoSave),新增失败内存未动 → LoadPolicy 后为空
		},
		{
			name:          "保存策略失败",
			failOp:        "SavePolicy",
			assignMenus:   true,
			wantErrSub:    "保存权限策略失败",
			afterPolicies: [][]string{{"tester", "/new", "GET"}}, // 清除+新增已穿透 adapter,LoadPolicy 后为新策略
		},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			env := newTestEnv(t, [][]string{
				{"tester", "/old", "GET"},
				{"other", "/keep", "GET"},
			})
			ctx := context.Background()
			role := env.seedRole(t, 9, "tester", "测试角色")

			env.adapter.failOn(c.failOp, errors.New("injected adapter failure"))
			svc := NewRoleService()

			var menuIDs []uint
			if c.assignMenus {
				menuIDs = []uint{env.seedMenuWithAPIs(t, 201, "菜单", []model.SysAPI{{ID: 31, Path: "/new", Method: "GET"}})}
			}
			err := svc.SetMenus(ctx, role.ID, menuIDs)
			if err == nil {
				t.Fatalf("期望 %s 失败返回错误, 实际成功", c.failOp)
			}
			if !strings.Contains(err.Error(), c.wantErrSub) {
				t.Fatalf("错误信息应包含 %q, 实际 %q", c.wantErrSub, err.Error())
			}

			// 回滚:LoadPolicy 被再次调用(首次发生在 NewEnforcer)
			if got := env.adapter.callCount("LoadPolicy"); got < 2 {
				t.Fatalf("失败路径应触发回滚 LoadPolicy(调用次数 >=2), 实际 %d", got)
			}
			// 回滚后内存策略与期望一致(无中间态残留)
			wantPoliciesEqual(t, app.Enforcer.GetFilteredPolicy(0, "tester"), c.afterPolicies, "回滚后")
			// 其他角色策略不受影响
			wantPoliciesEqual(t, app.Enforcer.GetFilteredPolicy(0, "other"), [][]string{{"other", "/keep", "GET"}}, "回滚后其他角色")
		})
	}
}

// TestRoleDelete_Guards 角色删除守卫:系统内置超管角色不可删(id=1 或 code=super_admin 判定)。
// 实际删除执行路径使用 MySQL CONCAT/LEFT 方言(user/role 的软删改名),sqlite 无法覆盖,不在此测。
func TestRoleDelete_Guards(t *testing.T) {
	env := newTestEnv(t, nil)
	ctx := context.Background()
	env.seedRole(t, 3, model.SuperAdminRoleCode, "冒名的超管角色")
	svc := NewRoleService()

	cases := []struct {
		name       string
		id         uint
		wantErrSub string
	}{
		{"id=1 系统根角色不可删(无需查库即拒绝)", 1, "超级管理员角色不可删除"},
		{"code=super_admin 的角色不可删", 3, "系统内置超级管理员角色不可删除"},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			err := svc.Delete(ctx, c.id)
			if err == nil {
				t.Fatalf("期望删除被拒绝, 实际成功")
			}
			if !strings.Contains(err.Error(), c.wantErrSub) {
				t.Fatalf("错误信息应包含 %q, 实际 %q", c.wantErrSub, err.Error())
			}
		})
	}
}

// TestRoleUpdate_BuiltinRoleGuards 内置超管角色(id=1)更新守卫:
// 状态与数据权限不可改(防篡改),名称/排序可改;相同值回填放行;
// 普通角色的状态修改不受影响。
func TestRoleUpdate_BuiltinRoleGuards(t *testing.T) {
	env := newTestEnv(t, nil)
	ctx := context.Background()
	env.seedRole(t, 1, model.SuperAdminRoleCode, "超级管理员")
	env.seedRole(t, 2, "ops", "运维")
	svc := NewRoleService()

	rejectCases := []struct {
		name       string
		req        *UpdateRoleRequest
		wantErrSub string
	}{
		{"禁用内置角色被拒", &UpdateRoleRequest{Status: ptrInt8(0)}, "超级管理员角色状态不可修改"},
		{"收窄内置角色数据权限被拒", &UpdateRoleRequest{DataScope: ptrInt8(5)}, "超级管理员角色数据权限不可修改"},
	}
	for _, c := range rejectCases {
		t.Run(c.name, func(t *testing.T) {
			err := svc.Update(ctx, 1, c.req)
			if err == nil || !strings.Contains(err.Error(), c.wantErrSub) {
				t.Fatalf("应拒绝并提示 %q, 实际 err=%v", c.wantErrSub, err)
			}
		})
	}

	// 名称/排序/相同值回填可改(回填值取自当前落库值,避免依赖列默认值)
	cur, err := svc.GetByID(ctx, 1)
	if err != nil {
		t.Fatalf("回读内置角色失败: %v", err)
	}
	if err := svc.Update(ctx, 1, &UpdateRoleRequest{Name: "超级管理员", Sort: cur.Sort, Status: ptrInt8(cur.Status), DataScope: ptrInt8(cur.DataScope)}); err != nil {
		t.Fatalf("名称/排序/相同值回填应成功: %v", err)
	}

	// 普通角色状态修改不受守卫影响
	if err := svc.Update(ctx, 2, &UpdateRoleRequest{Status: ptrInt8(0)}); err != nil {
		t.Fatalf("普通角色改状态应成功: %v", err)
	}
	got, err := svc.GetByID(ctx, 2)
	if err != nil || got.Status != 0 {
		t.Fatalf("普通角色状态应已禁用, got=%+v err=%v", got, err)
	}
}
