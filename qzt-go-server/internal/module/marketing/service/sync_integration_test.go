//go:build integration

// 营销线索同步集成测试:httptest mock 巨量 API → SyncAccount → 断言库内状态。
// 覆盖:正常入库、幂等(重复拉取)、手机号重复跳过、token 刷新失败→授权失效、刷新成功。
// 前置:qztgo_test 库已执行 docs/sql/marketing.sql(建 marketing_account / marketing_lead_log / crm_lead)。
// 运行:go test -tags=integration -v -run TestFeiyuSync ./internal/module/marketing/service/
//
// 注意:必须是外部测试包(service_test)——内部包经 testutil → system → mcp → 本 service 会构成循环导入。
package service_test

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	crmmodel "qzt-go-server/internal/model/crm"
	mktmodel "qzt-go-server/internal/model/marketing"
	mktsvc "qzt-go-server/internal/module/marketing/service"
	"qzt-go-server/internal/pkg/oceanengine"
	"qzt-go-server/internal/repository"
	mktrepo "qzt-go-server/internal/repository/marketing"
	"qzt-go-server/internal/testutil"
	"qzt-go-server/pkg/xtime"
)

// mockOcean 起 mock 巨量服务器,返回可注入 SyncService 的客户端工厂与清理函数。
// leads 为线索列表响应体(data.list 内容);refreshErr 为 true 时刷新接口返回错误。
func mockOcean(t *testing.T, leads []map[string]any, refreshErr bool) (factory func(oceanengine.Config) *oceanengine.Client, cleanup func()) {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/oauth2/access_token/":
			if refreshErr {
				_ = json.NewEncoder(w).Encode(map[string]any{"code": 40106, "message": "refresh_token expired"})
				return
			}
			_ = json.NewEncoder(w).Encode(map[string]any{
				"code": 0,
				"data": map[string]any{
					"access_token":             "at_new",
					"refresh_token":            "rt_new",
					"expires_in":               86400,
					"refresh_token_expires_in": 2592000,
				},
			})
		case "/oauth2/advertiser/get/":
			_ = json.NewEncoder(w).Encode(map[string]any{"code": 0, "data": map[string]any{"list": []int64{777}}})
		case "/2/tools/clue_info/get/":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"code": 0,
				"data": map[string]any{"page": 1, "page_size": 100, "total_number": len(leads), "list": leads},
			})
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	factory = func(cfg oceanengine.Config) *oceanengine.Client {
		return oceanengine.NewClientWithBaseURL(cfg, srv.URL)
	}
	return factory, srv.Close
}

// seedAccount 造一个「已授权」账号(token 12h 后才过期),返回账号与清理函数。
func seedAccount(t *testing.T, name string) (*mktmodel.MarketingAccount, func()) {
	t.Helper()
	ctx := context.Background()
	far := time.Now().Add(12 * time.Hour)
	tokenAt := xtime.NewDateTime(far)
	refreshAt := xtime.NewDateTime(far.Add(30 * 24 * time.Hour))
	account := &mktmodel.MarketingAccount{
		Name:             name,
		Channel:          mktmodel.ChannelOceanEngine,
		AppID:            "app_itest",
		AppSecret:        "secret_itest",
		AccessToken:      "at_old",
		RefreshToken:     "rt_old",
		TokenExpiresAt:   &tokenAt,
		RefreshExpiresAt: &refreshAt,
		AdvertiserIDs:    "777",
		Status:           mktmodel.AccountStatusAuthed,
		Enabled:          1,
	}
	require.NoError(t, mktrepo.NewAccountRepo().Create(ctx, account))
	return account, func() {
		_ = mktrepo.NewAccountRepo().HardDelete(ctx, account.ID)
		repository.DBFrom(ctx).Unscoped().Where("account_id = ?", account.ID).Delete(&mktmodel.MarketingLeadLog{})
	}
}

// expireToken 把账号 token 改为已过期(触发同步时的刷新分支)。
func expireToken(t *testing.T, account *mktmodel.MarketingAccount) {
	t.Helper()
	past := xtime.NewDateTime(time.Now().Add(-time.Hour))
	account.TokenExpiresAt = &past
	require.NoError(t, mktrepo.NewAccountRepo().Update(context.Background(), account))
}

// cleanupLeads 按手机号硬删测试产生的线索。
func cleanupLeads(ctx context.Context, phones ...string) {
	repository.DBFrom(ctx).Unscoped().Where("phone IN ?", phones).Delete(&crmmodel.CrmLead{})
}

func clueJSON(id int64, name, phone, company string) map[string]any {
	return map[string]any{
		"clue_id": id, "clue_name": name, "clue_phone": phone,
		"company": company, "campaign_name": "集成测试计划", "ad_name": "集成测试广告",
		"create_time": "2026-08-19 10:30:00",
	}
}

// TestFeiyuSyncIngestAndIdempotent 正常入库 + 重复拉取幂等。
func TestFeiyuSyncIngestAndIdempotent(t *testing.T) {
	testutil.SetupTestDB(t)
	ctx := context.Background()

	phone := "13800009001"
	cleanupLeads(ctx, phone)
	t.Cleanup(func() { cleanupLeads(ctx, phone) })

	account, cleanupAcc := seedAccount(t, "集成测试-同步账号")
	defer cleanupAcc()
	factory, closeSrv := mockOcean(t, []map[string]any{clueJSON(90001, "测试客户甲", phone, "集成测试公司")}, false)
	defer closeSrv()

	svc := mktsvc.NewSyncServiceWithClientFactory(factory)

	// 第一轮:1 条入库
	result, err := svc.SyncAccount(ctx, account.ID)
	require.NoError(t, err)
	assert.Equal(t, 1, result.Inserted)
	assert.Equal(t, 0, result.Skipped)

	// 线索落库断言:公海 + 抖音广告来源 + 公司-姓名
	var lead crmmodel.CrmLead
	require.NoError(t, repository.DBFrom(ctx).Where("phone = ?", phone).First(&lead).Error)
	assert.Equal(t, "集成测试公司-测试客户甲", lead.Name)
	assert.Equal(t, "抖音广告", lead.Source)
	assert.Equal(t, crmmodel.InPoolPublic, lead.InPool)
	assert.Equal(t, crmmodel.LeadStatusNew, lead.Status)

	// 日志断言:已入库 + lead_id 回填
	var log mktmodel.MarketingLeadLog
	require.NoError(t, repository.DBFrom(ctx).
		Where("account_id = ? AND external_id = ?", account.ID, "90001").First(&log).Error)
	assert.Equal(t, mktmodel.LogStatusInserted, log.Status)
	require.NotNil(t, log.LeadID)
	assert.Equal(t, lead.ID, *log.LeadID)

	// 游标已推进
	updated, err := mktrepo.NewAccountRepo().GetByID(ctx, account.ID)
	require.NoError(t, err)
	require.NotNil(t, updated.LastSyncAt)

	// 第二轮(同一批线索):幂等,0 新增
	result, err = svc.SyncAccount(ctx, account.ID)
	require.NoError(t, err)
	assert.Equal(t, 0, result.Inserted)
	var leadCount int64
	repository.DBFrom(ctx).Model(&crmmodel.CrmLead{}).Where("phone = ?", phone).Count(&leadCount)
	assert.Equal(t, int64(1), leadCount)
}

// TestFeiyuSyncPhoneDupSkip 手机号已存在线索 → 跳过并记日志。
func TestFeiyuSyncPhoneDupSkip(t *testing.T) {
	testutil.SetupTestDB(t)
	ctx := context.Background()

	phone := "13800009002"
	cleanupLeads(ctx, phone)
	t.Cleanup(func() { cleanupLeads(ctx, phone) })

	// 先手工造一条同手机号线索(模拟历史已有)
	existing := &crmmodel.CrmLead{Name: "存量线索", Phone: phone, Source: "主动开发", Status: crmmodel.LeadStatusNew}
	require.NoError(t, repository.DBFrom(ctx).Create(existing).Error)

	account, cleanupAcc := seedAccount(t, "集成测试-查重账号")
	defer cleanupAcc()
	factory, closeSrv := mockOcean(t, []map[string]any{clueJSON(90002, "测试客户乙", phone, "乙公司")}, false)
	defer closeSrv()

	result, err := mktsvc.NewSyncServiceWithClientFactory(factory).SyncAccount(ctx, account.ID)
	require.NoError(t, err)
	assert.Equal(t, 0, result.Inserted)
	assert.Equal(t, 1, result.Skipped)

	// 线索仍只有 1 条(未新增)
	var leadCount int64
	repository.DBFrom(ctx).Model(&crmmodel.CrmLead{}).Where("phone = ?", phone).Count(&leadCount)
	assert.Equal(t, int64(1), leadCount)

	// 日志标记「重复跳过」
	var log mktmodel.MarketingLeadLog
	require.NoError(t, repository.DBFrom(ctx).
		Where("account_id = ? AND external_id = ?", account.ID, "90002").First(&log).Error)
	assert.Equal(t, mktmodel.LogStatusDup, log.Status)
	assert.Nil(t, log.LeadID)
}

// TestFeiyuSyncTokenExpired 刷新令牌失败 → 账号置「授权失效」。
func TestFeiyuSyncTokenExpired(t *testing.T) {
	testutil.SetupTestDB(t)
	ctx := context.Background()

	account, cleanupAcc := seedAccount(t, "集成测试-失效账号")
	defer cleanupAcc()
	expireToken(t, account)

	factory, closeSrv := mockOcean(t, nil, true)
	defer closeSrv()

	_, err := mktsvc.NewSyncServiceWithClientFactory(factory).SyncAccount(ctx, account.ID)
	require.Error(t, err)

	updated, getErr := mktrepo.NewAccountRepo().GetByID(ctx, account.ID)
	require.NoError(t, getErr)
	assert.Equal(t, mktmodel.AccountStatusExpired, updated.Status,
		"刷新失败后账号应置为授权失效")
}

// TestFeiyuSyncTokenRefreshSuccess token 临期自动刷新成功并持久化新 token。
func TestFeiyuSyncTokenRefreshSuccess(t *testing.T) {
	testutil.SetupTestDB(t)
	ctx := context.Background()

	account, cleanupAcc := seedAccount(t, "集成测试-刷新账号")
	defer cleanupAcc()
	expireToken(t, account)

	factory, closeSrv := mockOcean(t, []map[string]any{}, false)
	defer closeSrv()

	result, err := mktsvc.NewSyncServiceWithClientFactory(factory).SyncAccount(ctx, account.ID)
	require.NoError(t, err)
	assert.Equal(t, 0, result.Inserted)

	updated, getErr := mktrepo.NewAccountRepo().GetByID(ctx, account.ID)
	require.NoError(t, getErr)
	assert.Equal(t, "at_new", updated.AccessToken)
	assert.Equal(t, "rt_new", updated.RefreshToken)
	require.NotNil(t, updated.TokenExpiresAt)
	assert.True(t, updated.TokenExpiresAt.Time().After(time.Now()),
		fmt.Sprintf("token 过期时间应被推迟,实际 %v", updated.TokenExpiresAt))
}
