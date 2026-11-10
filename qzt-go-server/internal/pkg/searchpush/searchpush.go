// Package searchpush 搜索引擎主动推送网关(SEO/GEO 收录加速)。
//
// 支持两条通道:
//   - 百度主动推送(data.zz.baidu.com,每日配额制,逐条调用便于精确记账与配额保护)
//   - IndexNow(api.indexnow.org 单入口,一次提交自动分发 Bing/Yandex/Seznam 等)
//
// 两条通道都只接受"自有站点域名"的 URL——百度 site 参数绑定验证站点,
// IndexNow 要求 key 文件挂在被提交 host 上,外站 URL 必被拒。
// FilterOwnURLs 在出站前做域名白名单过滤,杜绝误推外站/内网地址。
//
// 配置:config.{env}.yaml 的 seo 节,baidu_token / indexnow_key 只走
// gitignored .env 注入(GEO_BAIDU_TOKEN / SEO_INDEXNOW_KEY),
// 任一未配置即对应通道禁用(调用方用 BaiduEnabled/IndexNowEnabled 预判)。
package searchpush

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// 各通道未配置时的错误(.env 对应变量为空)。
var (
	ErrBaiduNotConfigured    = errors.New("searchpush: baidu token not configured, set GEO_BAIDU_TOKEN in .env")
	ErrIndexNowNotConfigured = errors.New("searchpush: indexnow key not configured, set SEO_INDEXNOW_KEY in .env")
)

const defaultTimeout = 15 * time.Second

// 端点用 var 而非 const,便于单测替换为 httptest 桩。
var (
	baiduPushEndpoint   = "http://data.zz.baidu.com/urls"
	indexNowAPIEndpoint = "https://api.indexnow.org/indexnow"
)

// Config 推送配置(来自 config.Get().SEO)。
type Config struct {
	// Site 站点根地址,如 https://devlovecode.com(结尾斜杠可带可不带)。
	Site string
	// BaiduToken 百度搜索资源平台 API 推送 token。
	BaiduToken string
	// IndexNowKey IndexNow 密钥,须与站点 https://<site>/<key>.txt 文件内容一致。
	IndexNowKey string
	// Timeout 单次 HTTP 调用超时,0 用默认 15s。
	Timeout time.Duration
}

// Client 搜索引擎推送客户端。
type Client struct {
	cfg  Config
	http *http.Client
}

// NewClient 创建客户端。
func NewClient(cfg Config) *Client {
	timeout := cfg.Timeout
	if timeout <= 0 {
		timeout = defaultTimeout
	}
	return &Client{cfg: cfg, http: &http.Client{Timeout: timeout}}
}

// BaiduEnabled 百度通道是否可用。
func (c *Client) BaiduEnabled() bool { return c.cfg.Site != "" && c.cfg.BaiduToken != "" }

// IndexNowEnabled IndexNow 通道是否可用。
func (c *Client) IndexNowEnabled() bool { return c.cfg.Site != "" && c.cfg.IndexNowKey != "" }

// BaiduResult 百度主动推送响应。成功:{"remain":48,"success":1};
// 失败:{"error":401,"message":"token is not valid"}。
type BaiduResult struct {
	Success int    `json:"success"`
	Remain  int    `json:"remain"`
	Error   int    `json:"error,omitempty"`
	Message string `json:"message,omitempty"`
}

// OK 是否成功。
func (r *BaiduResult) OK() bool { return r != nil && r.Error == 0 }

// OverQuota 是否因当日配额用尽而失败(调用方可停止后续推送,保护配额语义)。
func (r *BaiduResult) OverQuota() bool {
	return r != nil && strings.Contains(strings.ToLower(r.Message), "quota")
}

// PushBaidu 推送单条 URL 到百度(逐条调用,结果精确到 URL,便于配额保护与记账)。
func (c *Client) PushBaidu(ctx context.Context, rawURL string) (*BaiduResult, error) {
	if !c.BaiduEnabled() {
		return nil, ErrBaiduNotConfigured
	}
	api := fmt.Sprintf("%s?site=%s&token=%s", baiduPushEndpoint, url.QueryEscape(c.cfg.Site), url.QueryEscape(c.cfg.BaiduToken))
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, api, strings.NewReader(rawURL+"\n"))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "text/plain")

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close() //nolint:errcheck
	body, err := io.ReadAll(io.LimitReader(resp.Body, 4<<10))
	if err != nil {
		return nil, err
	}
	var result BaiduResult
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("searchpush: baidu 响应解析失败 http=%d body=%s", resp.StatusCode, truncate(string(body), 200))
	}
	return &result, nil
}

// PushIndexNow 批量提交 URL 到 IndexNow(一次调用,自动分发到 Bing/Yandex 等)。
// 返回 HTTP 状态码与响应体;200/202 均为提交成功。
func (c *Client) PushIndexNow(ctx context.Context, urls []string) (int, string, error) {
	if !c.IndexNowEnabled() {
		return 0, "", ErrIndexNowNotConfigured
	}
	host := SiteHost(c.cfg.Site)
	if host == "" {
		return 0, "", errors.New("searchpush: seo.site 未配置")
	}
	payload, err := json.Marshal(map[string]any{
		"host":        host,
		"key":         c.cfg.IndexNowKey,
		"keyLocation": strings.TrimRight(c.cfg.Site, "/") + "/" + c.cfg.IndexNowKey + ".txt",
		"urlList":     urls,
	})
	if err != nil {
		return 0, "", err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, indexNowAPIEndpoint, strings.NewReader(string(payload)))
	if err != nil {
		return 0, "", err
	}
	req.Header.Set("Content-Type", "application/json; charset=utf-8")

	resp, err := c.http.Do(req)
	if err != nil {
		return 0, "", err
	}
	defer resp.Body.Close() //nolint:errcheck
	body, err := io.ReadAll(io.LimitReader(resp.Body, 4<<10))
	if err != nil {
		return 0, "", err
	}
	return resp.StatusCode, truncate(string(body), 200), nil
}

// SiteHost 从站点根地址提取主机名(去 scheme、去端口语义仅保留 hostname,统一小写)。
// 如 https://devlovecode.com → devlovecode.com;解析失败返回空串。
func SiteHost(site string) string {
	site = strings.TrimSpace(site)
	if site == "" {
		return ""
	}
	if !strings.Contains(site, "://") {
		site = "https://" + site
	}
	u, err := url.Parse(site)
	if err != nil {
		return ""
	}
	return strings.ToLower(u.Hostname())
}

// FilterOwnURLs 只保留 scheme 为 http/https 且 host 与站点域名一致的 URL。
// 站点域名按 host 严格匹配(www. 前缀视为等价),其余一律丢弃——
// 这是防止把外站/内网地址推给搜索引擎的唯一防线,宁漏勿错。
func FilterOwnURLs(rawURLs []string, site string) []string {
	allowed := strings.TrimPrefix(SiteHost(site), "www.")
	if allowed == "" {
		return nil
	}
	out := make([]string, 0, len(rawURLs))
	for _, raw := range rawURLs {
		raw = strings.TrimSpace(raw)
		if raw == "" {
			continue
		}
		u, err := url.Parse(raw)
		if err != nil || u.Host == "" {
			continue
		}
		if u.Scheme != "http" && u.Scheme != "https" {
			continue
		}
		// 带端口的 URL 视为非规范站点地址,一律丢弃
		if u.Port() != "" {
			continue
		}
		if strings.TrimPrefix(strings.ToLower(u.Hostname()), "www.") != allowed {
			continue
		}
		out = append(out, raw)
	}
	return out
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n]
}
