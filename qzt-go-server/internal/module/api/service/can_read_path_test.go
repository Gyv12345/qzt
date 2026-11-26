package service

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/casbin/casbin/v2"

	"qzt-go-server/internal/app"
	sysmodel "qzt-go-server/internal/model"
)

// can_read_path_test.go JWT-only 的 AI 接口在服务内自测路由权限(canReadPath),
// 这里用与生产同款的 matcher 搭一份最小策略,证明「有该路由策略的角色放行、其余拒绝」。

func TestCanReadPath(t *testing.T) {
	orig := app.Enforcer
	t.Cleanup(func() { app.Enforcer = orig })

	// 策略引擎不可用时一律拒绝:不能因为引擎缺失而放行
	app.Enforcer = nil
	if canReadPath([]string{"sale"}, rbacPathSalesTrend) {
		t.Fatal("策略引擎不可用时不应放行")
	}

	// 最小策略:只有 sale 角色能看销售趋势
	csv := filepath.Join(t.TempDir(), "policy.csv")
	if err := os.WriteFile(csv, []byte("p, sale, /api/dashboard/sales-trend, GET\n"), 0o600); err != nil {
		t.Fatal(err)
	}
	enforcer, err := casbin.NewEnforcer("../../../../config/rbac_model.conf", csv)
	if err != nil {
		t.Fatal(err)
	}
	app.Enforcer = enforcer

	if !canReadPath([]string{"sale"}, rbacPathSalesTrend) {
		t.Error("有销售趋势策略的角色应放行")
	}
	if canReadPath([]string{"hr"}, rbacPathSalesTrend) {
		t.Error("没有策略的角色应拒绝")
	}
	if canReadPath(nil, rbacPathSalesTrend) {
		t.Error("没有角色应拒绝")
	}
	// 角色列表里任一角色有策略即放行;超管直通
	if !canReadPath([]string{"hr", "sale"}, rbacPathSalesTrend) {
		t.Error("多角色中有一个具备策略应放行")
	}
	if !canReadPath([]string{"hr", sysmodel.SuperAdminRoleCode}, rbacPathSalesTrend) {
		t.Error("超管应直通")
	}
}
