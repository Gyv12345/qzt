// draft.go 微信公众号草稿箱与发布能力（GEO 信源产线的投递端）。
//
// 链路：Markdown →(mdhtml) 公众号 HTML → draft/add 进草稿箱（封面自动用内置图
// 或 Extra 里配置的 source_thumb_media_id）→ 需要直发时 freepublish/submit
// （仅认证账号开放，未认证报 48001）→ freepublish/get 轮询取发布 URL。
//
// 权限口径：草稿箱接口全量开放；freepublish 仅认证订阅号/服务号可用。
// 群发永远不在 API 侧做——草稿进箱后由运营在 mp 后台预览群发。
package wxmp

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/url"
	"time"

	_ "embed"

	"qzt-go-server/internal/pkg/cache"
)

//go:embed assets/default_cover.png
var defaultCover []byte

// 素材上传的 HTTP 超时比常规调用长（封面图片体积较大）。
const mediaHTTPTimeout = 30 * time.Second

// withToken 拼接带 access_token 的接口地址（本文件各发布接口共用）。
func withToken(path, token string) string {
	return path + "?access_token=" + url.QueryEscape(token)
}

// ── 草稿箱 ──

// DraftArticle 一篇草稿文章（draft/add 的 articles 单元）。
// json tag 必须显式小写——缺省时 encoding/json 按字段名输出 "ThumbMediaID"，
// 微信不认会报 40007 invalid media_id（2026-10-24 排查实录）。
type DraftArticle struct {
	Title        string `json:"title"`                 // 标题（微信限 64 字，超长由调用方截断）
	Author       string `json:"author,omitempty"`      // 作者
	Digest       string `json:"digest,omitempty"`      // 摘要（单图文不填则默认取正文前 54 字）
	Content      string `json:"content"`               // 正文 HTML（公众号支持子集，须内联样式）
	ThumbMediaID string `json:"thumb_media_id"`        // 封面图永久素材 media_id（必填）
}

type draftAddRequest struct {
	Articles []DraftArticle `json:"articles"`
}

// AddDraft 提交一篇图文到草稿箱，返回草稿 media_id。
// 草稿不公开、可随时删除——这是信源产线的默认投递终点。
func (c *Client) AddDraft(ctx context.Context, article DraftArticle) (string, error) {
	token, err := c.GetAccessToken(ctx)
	if err != nil {
		return "", err
	}
	var resp struct {
		ErrCode int    `json:"errcode"`
		ErrMsg  string `json:"errmsg"`
		MediaID string `json:"media_id"`
	}
	if err := c.httpPostJSON(ctx, withToken(apiBase+"/cgi-bin/draft/add", token),
		draftAddRequest{Articles: []DraftArticle{article}}, &resp); err != nil {
		return "", fmt.Errorf("提交公众号草稿失败: %w", err)
	}
	if resp.ErrCode != 0 {
		return "", translateWxErr("提交公众号草稿", resp.ErrCode, resp.ErrMsg)
	}
	if resp.MediaID == "" {
		return "", fmt.Errorf("提交公众号草稿失败: 未返回 media_id")
	}
	return resp.MediaID, nil
}

// ── 发布（freepublish，仅认证账号） ──

// PublishStatus 发布状态查询结果。
type PublishStatus struct {
	// 0=成功 1=发布中 2=原创失败 3=发布失败 4=审核中 5=审核失败 8=待发布
	Status    int
	StatusMsg string
	URL       string // 发布成功后的文章 URL（成功时才有）
}

// PublishDraft 把草稿箱中的图文提交发布（异步），返回发布任务 publish_id。
// 发布后文章进入公众号发表记录，可被搜索引擎与 AI 引擎抓取。
func (c *Client) PublishDraft(ctx context.Context, mediaID string) (string, error) {
	token, err := c.GetAccessToken(ctx)
	if err != nil {
		return "", err
	}
	var resp struct {
		ErrCode   int    `json:"errcode"`
		ErrMsg    string `json:"errmsg"`
		PublishID string `json:"publish_id"`
	}
	if err := c.httpPostJSON(ctx, withToken(apiBase+"/cgi-bin/freepublish/submit", token),
		map[string]string{"media_id": mediaID}, &resp); err != nil {
		return "", fmt.Errorf("提交公众号发布失败: %w", err)
	}
	if resp.ErrCode != 0 {
		return "", translateWxErr("提交公众号发布", resp.ErrCode, resp.ErrMsg)
	}
	if resp.PublishID == "" {
		return "", fmt.Errorf("提交公众号发布失败: 未返回 publish_id")
	}
	return resp.PublishID, nil
}

// GetPublishStatus 轮询发布任务状态（发布是异步的，通常几秒到几分钟完成）。
func (c *Client) GetPublishStatus(ctx context.Context, publishID string) (*PublishStatus, error) {
	token, err := c.GetAccessToken(ctx)
	if err != nil {
		return nil, err
	}
	var resp struct {
		ErrCode     int    `json:"errcode"`
		ErrMsg      string `json:"errmsg"`
		PublishStat int    `json:"publish_status"`
		ArticleID   string `json:"article_id"`
		ArticleDetail struct {
			Item []struct {
				Idx        int    `json:"idx"`
				ArticleURL string `json:"article_url"`
			} `json:"item"`
		} `json:"article_detail"`
	}
	if err := c.httpPostJSON(ctx, withToken(apiBase+"/cgi-bin/freepublish/get", token),
		map[string]string{"publish_id": publishID}, &resp); err != nil {
		return nil, fmt.Errorf("查询公众号发布状态失败: %w", err)
	}
	if resp.ErrCode != 0 {
		return nil, translateWxErr("查询公众号发布状态", resp.ErrCode, resp.ErrMsg)
	}
	st := &PublishStatus{Status: resp.PublishStat, StatusMsg: publishStatusText(resp.PublishStat)}
	if resp.PublishStat == 0 {
		for _, item := range resp.ArticleDetail.Item {
			if item.ArticleURL != "" {
				st.URL = item.ArticleURL
				break
			}
		}
	}
	return st, nil
}

func publishStatusText(s int) string {
	switch s {
	case 0:
		return "发布成功"
	case 1:
		return "发布中"
	case 2:
		return "原创校验失败"
	case 3:
		return "发布失败"
	case 4:
		return "审核中"
	case 5:
		return "审核失败"
	case 8:
		return "待发布"
	default:
		return fmt.Sprintf("未知状态(%d)", s)
	}
}

// ── 封面素材 ──

// thumbCacheKey 按 secret 派生默认封面素材的缓存 key（永久素材 media_id 不过期）。
func (c *Client) thumbCacheKey() string {
	sum := sha256.Sum256([]byte("thumb:" + c.cfg.Secret))
	return "wxmp:default_thumb:" + hex.EncodeToString(sum[:8])
}

// ThumbMediaIDFor 获取草稿封面 media_id：优先用配置的固定素材，否则懒上传内置
// 默认封面并缓存（永久素材 media_id 长期有效，只传一次）。
func (c *Client) ThumbMediaIDFor(ctx context.Context) (string, error) {
	if c.cfg.ThumbMediaID != "" {
		return c.cfg.ThumbMediaID, nil
	}
	store := cache.GetStore()
	if store != nil {
		if id, err := store.Get(c.thumbCacheKey()); err == nil && id != "" {
			return id, nil
		}
	}
	mediaID, err := c.UploadPermanentImage(ctx, "default_cover.png", defaultCover)
	if err != nil {
		return "", fmt.Errorf("上传默认封面失败: %w", err)
	}
	if store != nil {
		// 永久素材 media_id 不带有效期，缓存一年足够；失败不影响本次调用。
		_ = store.Set(c.thumbCacheKey(), mediaID, 365*24*time.Hour)
	}
	return mediaID, nil
}

// UploadPermanentImage 上传图片为永久素材（封面用），返回 media_id。
// type=image 走 material/add_material（临时素材 media/upload 的 media_id 三天过期，不能当封面）。
func (c *Client) UploadPermanentImage(ctx context.Context, filename string, data []byte) (string, error) {
	token, err := c.GetAccessToken(ctx)
	if err != nil {
		return "", err
	}

	var buf bytes.Buffer
	w := multipart.NewWriter(&buf)
	fw, err := w.CreateFormFile("media", filename)
	if err != nil {
		return "", err
	}
	if _, err := fw.Write(data); err != nil {
		return "", err
	}
	if err := w.Close(); err != nil {
		return "", err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, withToken(apiBase+"/cgi-bin/material/add_material", token)+"&type=image", &buf)
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", w.FormDataContentType())

	hc := *c.hc
	hc.Timeout = mediaHTTPTimeout
	respHTTP, err := hc.Do(req)
	if err != nil {
		return "", err
	}
	defer respHTTP.Body.Close()
	body, err := io.ReadAll(io.LimitReader(respHTTP.Body, 1<<20))
	if err != nil {
		return "", err
	}
	if respHTTP.StatusCode != http.StatusOK {
		return "", fmt.Errorf("HTTP %d: %s", respHTTP.StatusCode, string(body))
	}
	var resp struct {
		ErrCode int    `json:"errcode"`
		ErrMsg  string `json:"errmsg"`
		MediaID string `json:"media_id"`
		URL     string `json:"url"`
	}
	if err := json.Unmarshal(body, &resp); err != nil {
		return "", fmt.Errorf("解析素材上传响应失败: %w", err)
	}
	if resp.ErrCode != 0 {
		return "", translateWxErr("上传公众号封面素材", resp.ErrCode, resp.ErrMsg)
	}
	if resp.MediaID == "" {
		return "", fmt.Errorf("上传公众号封面素材失败: 未返回 media_id")
	}
	return resp.MediaID, nil
}

// ── 错误翻译 ──

// translateWxErr 把高频 errcode 翻成可操作的中文提示。
func translateWxErr(action string, errcode int, errmsg string) error {
	hint := ""
	switch errcode {
	case 48001:
		hint = "（账号未认证或无该接口权限；freepublish 仅认证订阅号/服务号可用）"
	case 40164:
		hint = "（服务器 IP 不在公众号后台白名单，请添加出口 IP）"
	case 40001, 40125:
		hint = "（AppSecret 无效，请在第三方登录配置中核对）"
	case 45009:
		hint = "（接口日限额已用完，次日再试）"
	case 53401:
		hint = "（封面尺寸不合规，建议 900x383）"
	case 53404:
		hint = "（封面非 jpg/png 格式）"
	}
	return fmt.Errorf("%s失败: errcode=%d errmsg=%s%s", action, errcode, errmsg, hint)
}
