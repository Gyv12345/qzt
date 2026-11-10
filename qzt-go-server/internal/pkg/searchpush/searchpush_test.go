package searchpush

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestSiteHost(t *testing.T) {
	cases := []struct {
		in   string
		want string
	}{
		{"https://devlovecode.com", "devlovecode.com"},
		{"https://devlovecode.com/", "devlovecode.com"},
		{"http://www.devlovecode.com/md/news/x", "www.devlovecode.com"},
		{"devlovecode.com", "devlovecode.com"},
		{"", ""},
		{"https://", ""},
	}
	for _, c := range cases {
		if got := SiteHost(c.in); got != c.want {
			t.Errorf("SiteHost(%q) = %q, want %q", c.in, got, c.want)
		}
	}
}

func TestFilterOwnURLs(t *testing.T) {
	site := "https://devlovecode.com"
	keep := []string{
		"https://devlovecode.com/news/a",
		"https://devlovecode.com/md/news/a",
		"http://devlovecode.com/",
		"https://www.devlovecode.com/products/1",
	}
	drop := []string{
		"", "   ",
		"https://mp.weixin.qq.com/s/xxx",
		"https://blog.csdn.net/u013719791/article/details/1",
		"https://devlovecode.com.evil.com/news/a",
		"ftp://devlovecode.com/news/a",
		"file:///etc/passwd",
		"http://localhost/news/a",
		"http://127.0.0.1:9000/news/a",
		"http://192.168.1.10/news/a",
		"https://devlovecode.com:8443/news/a", // 端口不符视为不同 host,丢弃
		"not a url",
	}
	got := FilterOwnURLs(append(append([]string{}, keep...), drop...), site)
	if len(got) != len(keep) {
		t.Fatalf("FilterOwnURLs kept %d, want %d: %v", len(got), len(keep), got)
	}
	for i := range keep {
		if got[i] != keep[i] {
			t.Errorf("got[%d] = %q, want %q", i, got[i], keep[i])
		}
	}

	// site 为空时不放行任何 URL(唯一防线不可绕过)
	if got := FilterOwnURLs([]string{"https://devlovecode.com/"}, ""); len(got) != 0 {
		t.Errorf("FilterOwnURLs with empty site should drop all, got %v", got)
	}
}

func TestPushBaiduMock(t *testing.T) {
	// 未配置 token 时直接短路
	if _, err := NewClient(Config{Site: "https://devlovecode.com"}).PushBaidu(context.Background(), "https://devlovecode.com/news/a"); err != ErrBaiduNotConfigured {
		t.Fatalf("PushBaidu without token should return ErrBaiduNotConfigured, got %v", err)
	}

	orig := baiduPushEndpoint
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Content-Type") != "text/plain" {
			t.Errorf("Content-Type = %q", r.Header.Get("Content-Type"))
		}
		buf := make([]byte, 4096)
		n, _ := r.Body.Read(buf)
		if string(buf[:n]) != "https://devlovecode.com/news/a\n" {
			t.Errorf("body = %q", string(buf[:n]))
		}
		_, _ = w.Write([]byte(`{"remain":48,"success":1}`))
	}))
	defer srv.Close()
	baiduPushEndpoint = srv.URL
	defer func() { baiduPushEndpoint = orig }()

	c := NewClient(Config{Site: "https://devlovecode.com", BaiduToken: "tk"})
	res, err := c.PushBaidu(context.Background(), "https://devlovecode.com/news/a")
	if err != nil {
		t.Fatalf("PushBaidu error: %v", err)
	}
	if !res.OK() || res.Success != 1 || res.Remain != 48 {
		t.Errorf("unexpected result: %+v", res)
	}
}

func TestPushBaiduOverQuota(t *testing.T) {
	orig := baiduPushEndpoint
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(`{"error":40104,"message":"over quota"}`))
	}))
	defer srv.Close()
	baiduPushEndpoint = srv.URL
	defer func() { baiduPushEndpoint = orig }()

	c := NewClient(Config{Site: "https://devlovecode.com", BaiduToken: "tk"})
	res, err := c.PushBaidu(context.Background(), "https://devlovecode.com/news/a")
	if err != nil {
		t.Fatalf("PushBaidu error: %v", err)
	}
	if res.OK() || !res.OverQuota() {
		t.Errorf("expected over-quota failure, got %+v", res)
	}
}

func TestPushIndexNowMock(t *testing.T) {
	orig := indexNowAPIEndpoint
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			t.Errorf("method = %s", r.Method)
		}
		w.WriteHeader(http.StatusAccepted)
	}))
	defer srv.Close()
	indexNowAPIEndpoint = srv.URL
	defer func() { indexNowAPIEndpoint = orig }()

	c := NewClient(Config{Site: "https://devlovecode.com", IndexNowKey: "abc123"})
	code, _, err := c.PushIndexNow(context.Background(), []string{"https://devlovecode.com/news/a"})
	if err != nil {
		t.Fatalf("PushIndexNow error: %v", err)
	}
	if code != http.StatusAccepted {
		t.Errorf("status = %d, want 202", code)
	}

	if _, _, err := NewClient(Config{Site: "https://devlovecode.com"}).PushIndexNow(context.Background(), nil); err != ErrIndexNowNotConfigured {
		t.Fatalf("PushIndexNow without key should return ErrIndexNowNotConfigured, got %v", err)
	}
}
