//go:build integration

package testutil

import (
	"net/http/httptest"
	"sync"
	"testing"

	"github.com/gin-gonic/gin"

	apimod "qzt-go-server/internal/module/api"
	apprmod "qzt-go-server/internal/module/approval"
	"qzt-go-server/internal/module/cms"
	crmmod "qzt-go-server/internal/module/crm"
	finmod "qzt-go-server/internal/module/finance"
	entmod "qzt-go-server/internal/module/enterprise"
	hrmmod "qzt-go-server/internal/module/hrm"
	oamod "qzt-go-server/internal/module/oa"
	projmod "qzt-go-server/internal/module/project"
	psimod "qzt-go-server/internal/module/psi"
	"qzt-go-server/internal/module/system"
	"qzt-go-server/internal/server"
)

var (
	testServerOnce sync.Once
	testServer     *httptest.Server
)

// NewTestServer 返回进程内 httptest.Server(挂载全部模块,与 cmd/server/main.go 对齐)。
// 进程级单例:同一进程所有测试共享一个 server,baseURL 一致。
// 调用方无需 Close,进程退出自动回收。
func NewTestServer(t *testing.T) (baseURL string) {
	t.Helper()
	SetupTestDB(t) // 确保环境已初始化

	testServerOnce.Do(func() {
		gin.SetMode(gin.TestMode)
		engine := server.NewRouter(
			system.New(),
			apimod.New(),
			cms.New(),
			crmmod.New(),
			entmod.New(),
			apprmod.New(),
			hrmmod.New(),
			psimod.New(),
			finmod.New(),
			oamod.New(),
			projmod.New(),
		)
		testServer = httptest.NewServer(engine)
	})
	if testServer == nil {
		t.Fatal("测试服务器未启动")
	}
	return testServer.URL
}

// TestServer 返回已启动的测试服务器(需先调 NewTestServer)。
func TestServer() *httptest.Server {
	return testServer
}
