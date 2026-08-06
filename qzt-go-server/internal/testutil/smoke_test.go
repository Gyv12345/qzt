//go:build integration

package testutil_test

import (
	"net/http"
	"testing"

	"qzt-go-server/internal/testutil"
)

// TestSmokeInfrastructure 验证测试基建端到端打通:
// 连接 qztgo_test 建表+种子 → 启动 httptest server → 公开接口可访问 → admin 登录拿 token。
// 若此用例通过,后续所有模块测试的前置条件都已满足。
func TestSmokeInfrastructure(t *testing.T) {
	baseURL := testutil.NewTestServer(t)

	// 1. 公开健康检查
	env := testutil.DoJSON(t, baseURL, http.MethodGet, "/api/health", "", nil)
	testutil.AssertOK(t, env)

	// 2. 公开站点配置(免鉴权)
	env = testutil.DoJSON(t, baseURL, http.MethodGet, "/system/site-config", "", nil)
	testutil.AssertOK(t, env)

	// 3. admin 登录拿 token(种子账号)
	token := testutil.LoginAdmin(t, baseURL)
	if token == "" {
		t.Fatal("admin 登录返回空 token")
	}

	// 4. 用 token 访问需要鉴权的接口(当前用户信息)
	env = testutil.DoJSON(t, baseURL, http.MethodGet, "/system/auth/profile", token, nil)
	testutil.AssertOK(t, env)

	t.Log("✅ 测试基建打通:建表/种子/server/登录/鉴权全部正常")
}
