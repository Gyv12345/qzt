package oceanengine

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// newTestClient 返回指向 httptest 服务器的客户端。
func newTestClient(t *testing.T, handler http.HandlerFunc) (*Client, func()) {
	t.Helper()
	srv := httptest.NewServer(handler)
	return NewClientWithBaseURL(Config{AppID: "app_123", AppSecret: "secret_abc"}, srv.URL), srv.Close
}

func TestBuildAuthorizeURL(t *testing.T) {
	c := NewClient(Config{AppID: "app_123", AppSecret: "s"})
	u := c.BuildAuthorizeURL("https://example.com/prod-api/marketing/oauth/callback", "mkt_7_deadbeef")
	assert.Contains(t, u, "open.oceanengine.com/audit/oauth.html")
	assert.Contains(t, u, "app_id=app_123")
	assert.Contains(t, u, "state=mkt_7_deadbeef")
	assert.Contains(t, u, "redirect_uri=")
}

func TestGetTokenByAuthCode(t *testing.T) {
	client, closeFn := newTestClient(t, func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, pathAccessToken, r.URL.Path)
		assert.Equal(t, http.MethodPost, r.Method)
		var body map[string]string
		require.NoError(t, json.NewDecoder(r.Body).Decode(&body))
		assert.Equal(t, "authorization_code", body["grant_type"])
		assert.Equal(t, "app_123", body["app_id"])
		assert.Equal(t, "secret_abc", body["secret"])
		assert.Equal(t, "code_xyz", body["auth_code"])

		_ = json.NewEncoder(w).Encode(map[string]any{
			"code": 0, "message": "success",
			"data": map[string]any{
				"access_token":             "at_1",
				"refresh_token":            "rt_1",
				"expires_in":               86400,
				"refresh_token_expires_in": 2592000,
				"advertiser_ids":           []int64{111, 222},
			},
		})
	})
	defer closeFn()

	bundle, err := client.GetTokenByAuthCode(context.Background(), "code_xyz")
	require.NoError(t, err)
	assert.Equal(t, "at_1", bundle.AccessToken)
	assert.Equal(t, "rt_1", bundle.RefreshToken)
	assert.Equal(t, 86400, bundle.ExpiresIn)
	assert.Equal(t, []string{"111", "222"}, bundle.AdvertiserIDs)
}

func TestRefreshToken(t *testing.T) {
	client, closeFn := newTestClient(t, func(w http.ResponseWriter, r *http.Request) {
		var body map[string]string
		require.NoError(t, json.NewDecoder(r.Body).Decode(&body))
		assert.Equal(t, "refresh_token", body["grant_type"])
		assert.Equal(t, "rt_old", body["refresh_token"])

		_ = json.NewEncoder(w).Encode(map[string]any{
			"code": 0,
			"data": map[string]any{"access_token": "at_2", "refresh_token": "rt_2", "expires_in": 86400},
		})
	})
	defer closeFn()

	bundle, err := client.RefreshToken(context.Background(), "rt_old")
	require.NoError(t, err)
	assert.Equal(t, "at_2", bundle.AccessToken)
	assert.Equal(t, "rt_2", bundle.RefreshToken)
}

func TestTokenAPIError(t *testing.T) {
	client, closeFn := newTestClient(t, func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewEncoder(w).Encode(map[string]any{"code": 40105, "message": "invalid auth_code"})
	})
	defer closeFn()

	_, err := client.GetTokenByAuthCode(context.Background(), "bad_code")
	require.Error(t, err)
	assert.Contains(t, err.Error(), "40105")
	assert.Contains(t, err.Error(), "invalid auth_code")
}

func TestGetAdvertisers(t *testing.T) {
	client, closeFn := newTestClient(t, func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, pathAdvertiserGet, r.URL.Path)
		assert.Equal(t, "at_1", r.URL.Query().Get("access_token"))
		_ = json.NewEncoder(w).Encode(map[string]any{
			"code": 0,
			"data": map[string]any{"list": []int64{333, 444}},
		})
	})
	defer closeFn()

	ids, err := client.GetAdvertisers(context.Background(), "at_1")
	require.NoError(t, err)
	assert.Equal(t, []string{"333", "444"}, ids)
}

func TestListLeads(t *testing.T) {
	client, closeFn := newTestClient(t, func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, pathClueLeadGet, r.URL.Path)
		q := r.URL.Query()
		assert.Equal(t, "at_1", q.Get("access_token"))
		assert.Equal(t, "777", q.Get("advertiser_id"))
		assert.Equal(t, "2026-08-19 10:00:00", q.Get("start_time"))
		assert.Equal(t, "1", q.Get("page"))

		_ = json.NewEncoder(w).Encode(map[string]any{
			"code": 0,
			"data": map[string]any{
				"page": 1, "page_size": 100, "total_number": 2,
				"list": []map[string]any{
					{
						"clue_id": 9001, "clue_name": "张三", "clue_phone": "13800001111",
						"company": "甲公司", "campaign_name": "春季大促", "ad_name": "信息流A",
						"create_time": "2026-08-19 10:30:00", "unknown_field": "x",
					},
					{
						"clue_id": 9002, "clue_name": "李四", "clue_phone": "13900002222",
						"campaign_name": "春季大促", "ad_name": "信息流B", "create_time": "",
					},
				},
			},
		})
	})
	defer closeFn()

	start := time.Date(2026, 8, 19, 10, 0, 0, 0, time.Local)
	end := time.Date(2026, 8, 19, 11, 0, 0, 0, time.Local)
	leads, total, err := client.ListLeads(context.Background(), "at_1", "777", start, end, 1, 100)
	require.NoError(t, err)
	assert.Equal(t, 2, total)
	require.Len(t, leads, 2)

	assert.Equal(t, "9001", leads[0].ExternalID)
	assert.Equal(t, "张三", leads[0].Name)
	assert.Equal(t, "13800001111", leads[0].Phone)
	assert.Equal(t, "甲公司", leads[0].Company)
	assert.Equal(t, "春季大促", leads[0].CampaignName)
	assert.Equal(t, "信息流A", leads[0].AdName)
	assert.Equal(t, "2026-08-19 10:30:00", leads[0].CreateTime.Format(TimeLayout))
	// 原始报文保留,未知字段不丢
	assert.Contains(t, string(leads[0].Raw), "unknown_field")

	// create_time 为空时零值,不报错
	assert.True(t, leads[1].CreateTime.IsZero())
}

func TestListLeadsHTTPError(t *testing.T) {
	client, closeFn := newTestClient(t, func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		_, _ = w.Write([]byte("boom"))
	})
	defer closeFn()

	_, _, err := client.ListLeads(context.Background(), "at", "1", time.Now(), time.Now(), 1, 10)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "HTTP 500")
}
