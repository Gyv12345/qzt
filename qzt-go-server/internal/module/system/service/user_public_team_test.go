// user_public_team_test.go ListTeam(官网公开团队成员)精选过滤回归:
// 公开接口只允许露出「官网内容→官网首页配置→团队成员」显式精选的用户,
// 板块关闭/未配置精选一律返回空,绝不回退为全量用户(员工隐私红线)。
package service

import (
	"context"
	"testing"

	"qzt-go-server/internal/model"
)

// newTeamTestEnv 在通用测试环境上补建首页配置两张表。
func newTeamTestEnv(t *testing.T) *testEnv {
	t.Helper()
	env := newTestEnv(t, nil)
	if err := env.db.AutoMigrate(&model.CmsHomepageModule{}, &model.CmsHomepageFeature{}); err != nil {
		t.Fatalf("建首页配置表失败: %v", err)
	}
	return env
}

// seedTeamModule 建团队板块开关。Enabled 带 gorm default:true 标签,
// 零值 false 会被 Create 跳过,必须显式 Update 写入(同 seedUser 的 Status)。
func seedTeamModule(t *testing.T, env *testEnv, enabled bool) {
	t.Helper()
	m := &model.CmsHomepageModule{ID: 1, Module: "team", ModuleName: "团队成员", Sort: 3}
	if err := env.db.Create(m).Error; err != nil {
		t.Fatalf("种子板块失败: %v", err)
	}
	if err := env.db.Model(&model.CmsHomepageModule{}).Where("id = ?", 1).
		Update("enabled", enabled).Error; err != nil {
		t.Fatalf("写入板块开关失败: %v", err)
	}
}

func seedTeamFeatures(t *testing.T, env *testEnv, itemIDs ...uint) {
	t.Helper()
	for i, id := range itemIDs {
		f := &model.CmsHomepageFeature{Module: "team", ItemID: id, Sort: i}
		if err := env.db.Create(f).Error; err != nil {
			t.Fatalf("种子精选条目 %d 失败: %v", id, err)
		}
	}
}

func TestListTeam_CuratedOnly(t *testing.T) {
	env := newTeamTestEnv(t)
	ctx := context.Background()
	env.seedRole(t, 10, "dev", "研发")
	env.seedUser(t, 300, "alice", 1, 10)
	env.seedUser(t, 301, "bob", 1)
	env.seedUser(t, 302, "carol", 0) // 已停用,即使被精选也不可露出

	seedTeamModule(t, env, true)
	seedTeamFeatures(t, env, 301, 300, 302) // 精选顺序: bob, alice, carol

	got, total, err := NewUserService().ListTeam(ctx)
	if err != nil {
		t.Fatalf("ListTeam: %v", err)
	}
	if total != 2 || len(got) != 2 {
		t.Fatalf("应只返回 2 名精选且在用的成员, got total=%d len=%d", total, len(got))
	}
	if got[0].ID != 301 || got[1].ID != 300 {
		t.Fatalf("应按精选顺序 [bob, alice] 返回, got [%d %d]", got[0].ID, got[1].ID)
	}
	if got[0].Position != "" {
		t.Fatalf("bob 无角色,职位应为空, got %q", got[0].Position)
	}
	if got[1].Position != "研发" {
		t.Fatalf("alice 职位应为角色名「研发」, got %q", got[1].Position)
	}
}

func TestListTeam_EmptyWhenNotCurated(t *testing.T) {
	env := newTeamTestEnv(t)
	env.seedUser(t, 300, "alice", 1)
	env.seedUser(t, 301, "bob", 1)
	seedTeamModule(t, env, true) // 板块开但未配置精选

	got, total, err := NewUserService().ListTeam(context.Background())
	if err != nil {
		t.Fatalf("ListTeam: %v", err)
	}
	// 回归守卫:旧行为会返回全量用户,等于把全部员工暴露到官网
	if total != 0 || len(got) != 0 {
		t.Fatalf("未配置精选应返回空列表, got total=%d len=%d", total, len(got))
	}
}

func TestListTeam_EmptyWhenModuleDisabled(t *testing.T) {
	env := newTeamTestEnv(t)
	env.seedUser(t, 300, "alice", 1)
	seedTeamModule(t, env, false) // 「在官网展示」关闭
	seedTeamFeatures(t, env, 300)

	got, total, err := NewUserService().ListTeam(context.Background())
	if err != nil {
		t.Fatalf("ListTeam: %v", err)
	}
	if total != 0 || len(got) != 0 {
		t.Fatalf("板块关闭应返回空列表, got total=%d len=%d", total, len(got))
	}
}
