package service

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"path"
	"regexp"
	"strings"
	"time"
	"unicode/utf8"

	"gorm.io/gorm"

	mpmodel "qzt-go-server/internal/model/mp"
	"qzt-go-server/internal/pkg/wxmp"
	"qzt-go-server/internal/repository"
	"qzt-go-server/pkg/xlogger"
	"qzt-go-server/pkg/xtime"
)

// article.go 公众号文章 CRUD + 推送微信草稿箱。
// 状态口径：draft(草稿) → pushed(已进草稿箱) / failed(推送失败,可改后重试)；
// 新建/编辑一律重置回 draft（改过稿允许重新推送）。发布动作仍在 mp 后台人工完成。

// ArticleService 公众号文章服务。
type ArticleService struct{}

func NewArticleService() *ArticleService { return &ArticleService{} }

// SaveArticleRequest 文章新增/编辑入参（author 空默认「行简」；status 恒置 draft）。
type SaveArticleRequest struct {
	AccountID uint   `json:"account_id"`
	Title     string `json:"title"`
	Digest    string `json:"digest"`
	Author    string `json:"author"`
	CoverURL  string `json:"cover_url"`
	Theme     string `json:"theme"`
	Points    string `json:"points"`
	ContentMd string `json:"content_md"`
}

// MpArticleItem 文章对外视图（列表与详情同构；account_name 批量拼装，查不到为空串）。
type MpArticleItem struct {
	mpmodel.Article
	AccountName string `json:"account_name"`
}

// List 文章分页列表（account_id/status/keyword 过滤，新建时间倒序）。
func (s *ArticleService) List(ctx context.Context, page, pageSize int, accountID uint, status, keyword string) ([]*MpArticleItem, int64, error) {
	list, total, err := repository.NewMpArticleRepo().ListPaged(ctx, page, pageSize, accountID, status, keyword)
	if err != nil {
		return nil, 0, err
	}
	items := make([]*MpArticleItem, 0, len(list))
	if len(list) == 0 {
		return items, total, nil
	}
	// 单页涉及账号一次查齐,拼账号名（拼接失败不阻塞列表）
	ids := make([]uint, 0, len(list))
	seen := make(map[uint]struct{})
	for i := range list {
		items = append(items, &MpArticleItem{Article: list[i]})
		if _, ok := seen[list[i].AccountID]; !ok {
			seen[list[i].AccountID] = struct{}{}
			ids = append(ids, list[i].AccountID)
		}
	}
	names, err := accountNameMap(ctx, ids)
	if err != nil {
		return items, total, nil
	}
	for _, item := range items {
		item.AccountName = names[item.AccountID]
	}
	return items, total, nil
}

// GetByID 文章详情。
func (s *ArticleService) GetByID(ctx context.Context, id uint) (*MpArticleItem, error) {
	art, err := loadArticle(ctx, id)
	if err != nil {
		return nil, err
	}
	return s.buildItem(ctx, art)
}

// Create 新建文章草稿（status 恒 draft）。
func (s *ArticleService) Create(ctx context.Context, req *SaveArticleRequest) (*MpArticleItem, error) {
	if req.AccountID == 0 {
		return nil, errors.New("请选择公众号账号")
	}
	if _, err := repository.NewMpAccountRepo().GetByID(ctx, req.AccountID); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("公众号账号不存在")
		}
		return nil, err
	}
	author := strings.TrimSpace(req.Author)
	if author == "" {
		author = "行简"
	}
	m := &mpmodel.Article{
		AccountID: req.AccountID,
		Title:     strings.TrimSpace(req.Title),
		Digest:    strings.TrimSpace(req.Digest),
		Author:    author,
		CoverURL:  strings.TrimSpace(req.CoverURL),
		Theme:     strings.TrimSpace(req.Theme),
		Points:    req.Points,
		ContentMd: req.ContentMd,
		Status:    "draft",
	}
	if err := repository.NewMpArticleRepo().Create(ctx, m); err != nil {
		return nil, fmt.Errorf("新建文章失败: %w", err)
	}
	return s.buildItem(ctx, m)
}

// Update 编辑文章（改稿一律重置回 draft；已推送的稿子改后允许重新推送）。
// wx_media_id/pushed_at/error_msg 保留原值不动。
func (s *ArticleService) Update(ctx context.Context, id uint, req *SaveArticleRequest) (*MpArticleItem, error) {
	art, err := loadArticle(ctx, id)
	if err != nil {
		return nil, err
	}
	if req.AccountID != 0 && req.AccountID != art.AccountID {
		if _, err := repository.NewMpAccountRepo().GetByID(ctx, req.AccountID); err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return nil, errors.New("公众号账号不存在")
			}
			return nil, err
		}
		art.AccountID = req.AccountID
	}
	author := strings.TrimSpace(req.Author)
	if author == "" {
		author = "行简"
	}
	art.Title = strings.TrimSpace(req.Title)
	art.Digest = strings.TrimSpace(req.Digest)
	art.Author = author
	art.CoverURL = strings.TrimSpace(req.CoverURL)
	art.Theme = strings.TrimSpace(req.Theme)
	art.Points = req.Points
	art.ContentMd = req.ContentMd
	art.Status = "draft"
	if err := repository.NewMpArticleRepo().Update(ctx, art,
		"account_id", "title", "digest", "author", "cover_url", "theme", "points", "content_md", "status"); err != nil {
		return nil, err
	}
	return s.buildItem(ctx, art)
}

// Delete 删除文章（软删）。
func (s *ArticleService) Delete(ctx context.Context, id uint) error {
	return repository.NewMpArticleRepo().Delete(ctx, id)
}

// ── 推送微信草稿箱 ──

// 微信标题 64 字 / 摘要 120 字节上限；正文外链图下载参数（15s 超时/5MB 上限）。
const (
	imageDownloadTimeout = 15 * time.Second
	imageMaxBytes        = 5 << 20
)

// imageHTTPClient 外链图片下载客户端。
var imageHTTPClient = &http.Client{Timeout: imageDownloadTimeout}

// mdImageRe 提取 Markdown 图片 URL（![alt](https://host/path)）。
var mdImageRe = regexp.MustCompile(`!\[[^\]]*\]\((https?://[^)\s]+)\)`)

// PushDraft 把文章推送进微信草稿箱：正文外链图先逐张转 mmbiz 内链（任何一张失败
// 都终止整次推送——静默跳过会留死图），封面自动取 cover_url/正文首图/内置默认图，
// 最后 draft/add。发布仍在 mp 后台人工预览后点。返回草稿 media_id。
func (s *ArticleService) PushDraft(ctx context.Context, id uint) (string, error) {
	art, err := loadArticle(ctx, id)
	if err != nil {
		return "", err
	}
	if strings.TrimSpace(art.ContentMd) == "" {
		return "", errors.New("文章正文为空，请先生成或填写正文")
	}
	client, err := loadAccountClient(ctx, art.AccountID)
	if err != nil {
		return "", err
	}

	title := truncateRunesPlain(art.Title, 64)   // 微信标题上限 64 字
	digest := truncateBytesUTF8(art.Digest, 120) // 微信摘要上限 120 字节（UTF-8 安全截断）

	content, err := externalizeImages(ctx, client, art.ContentMd)
	if err != nil {
		s.markFailed(ctx, art, err)
		return "", err
	}
	html := wxmp.MarkdownToWechatHTML(content)

	thumb, err := resolveThumb(ctx, client, art.CoverURL, firstImageURL(art.ContentMd))
	if err != nil {
		s.markFailed(ctx, art, err)
		return "", err
	}

	mediaID, err := client.AddDraft(ctx, wxmp.DraftArticle{
		Title:        title,
		Author:       art.Author,
		Digest:       digest,
		Content:      html,
		ThumbMediaID: thumb,
	})
	if err != nil {
		s.markFailed(ctx, art, err)
		return "", err
	}

	now := xtime.NewDateTime(time.Now())
	art.WxMediaID = mediaID
	art.Status = "pushed"
	art.PushedAt = &now
	art.ErrorMsg = ""
	if err := repository.NewMpArticleRepo().Update(ctx, art, "wx_media_id", "status", "pushed_at", "error_msg"); err != nil {
		return "", fmt.Errorf("回写推送状态失败: %w", err)
	}
	return mediaID, nil
}

// markFailed 记录推送失败（status=failed + 错误摘要截 500 字节，改稿后可重试）。
func (s *ArticleService) markFailed(ctx context.Context, art *mpmodel.Article, cause error) {
	art.Status = "failed"
	art.ErrorMsg = truncateBytesUTF8(cause.Error(), 500)
	if uerr := repository.NewMpArticleRepo().Update(ctx, art, "status", "error_msg"); uerr != nil {
		xlogger.ErrorfCtx(ctx, "mp: 记录文章推送失败状态出错 article=%d: %v", art.ID, uerr)
	}
}

// externalizeImages 把正文里的外链图逐张换成微信 mmbiz 内链（公众号正文只认自家 CDN）。
// 同一 URL 多次引用只下载/上传一次；任何一张失败都返回错误终止整次推送。
func externalizeImages(ctx context.Context, client *wxmp.Client, content string) (string, error) {
	matches := mdImageRe.FindAllStringSubmatch(content, -1)
	if len(matches) == 0 {
		return content, nil
	}
	replaced := make(map[string]string) // 外链URL -> mmbiz内链URL
	out := content
	for _, m := range matches {
		rawURL := m[1]
		if _, done := replaced[rawURL]; done {
			continue
		}
		if strings.Contains(rawURL, "mmbiz.qpic.cn") {
			continue // 已是微信内链，跳过
		}
		data, err := downloadImage(ctx, rawURL)
		if err != nil {
			return "", err
		}
		innerURL, err := client.UploadContentImage(ctx, imageFileName(rawURL), data)
		if err != nil {
			return "", err
		}
		replaced[rawURL] = innerURL
	}
	for old, neu := range replaced {
		out = strings.ReplaceAll(out, old, neu)
	}
	return out, nil
}

// resolveThumb 封面 media_id：优先 cover_url；其次正文首图；都没有走内置默认封面兜底。
func resolveThumb(ctx context.Context, client *wxmp.Client, coverURL, firstImage string) (string, error) {
	coverURL = strings.TrimSpace(coverURL)
	if coverURL == "" {
		coverURL = strings.TrimSpace(firstImage)
	}
	if coverURL != "" {
		data, err := downloadImage(ctx, coverURL)
		if err != nil {
			return "", err
		}
		return client.UploadPermanentImage(ctx, imageFileName(coverURL), data)
	}
	return client.ThumbMediaIDFor(ctx)
}

// downloadImage 下载外链图片字节（15s 超时 / 5MB LimitReader / 仅 2xx / Content-Type 须 image/*）。
func downloadImage(ctx context.Context, rawURL string) ([]byte, error) {
	ctx, cancel := context.WithTimeout(ctx, imageDownloadTimeout)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, rawURL, nil)
	if err != nil {
		return nil, err
	}
	resp, err := imageHTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("下载图片失败(%s): %w", rawURL, err)
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode > 299 {
		return nil, fmt.Errorf("下载图片失败(%s): HTTP %d", rawURL, resp.StatusCode)
	}
	if ct := resp.Header.Get("Content-Type"); ct != "" && !strings.HasPrefix(ct, "image/") {
		return nil, fmt.Errorf("下载图片失败(%s): 返回的不是图片(Content-Type=%s)", rawURL, ct)
	}
	data, err := io.ReadAll(io.LimitReader(resp.Body, imageMaxBytes+1))
	if err != nil {
		return nil, fmt.Errorf("下载图片失败(%s): %w", rawURL, err)
	}
	if len(data) > imageMaxBytes {
		return nil, fmt.Errorf("图片超过大小上限 5MB: %s", rawURL)
	}
	return data, nil
}

// imageFileName 从 URL 推断文件名（扩展名留给微信识别格式），推断不出用 image.png。
func imageFileName(rawURL string) string {
	if u, err := url.Parse(rawURL); err == nil {
		if base := path.Base(u.Path); base != "" && base != "/" && base != "." {
			return base
		}
	}
	return "image.png"
}

// firstImageURL 取正文首个图片 URL（封面兜底用）。
func firstImageURL(md string) string {
	if m := mdImageRe.FindStringSubmatch(md); len(m) >= 2 {
		return m[1]
	}
	return ""
}

// ── 共用工具 ──

// loadArticle 载入文章（不存在给可读错误）。
func loadArticle(ctx context.Context, id uint) (*mpmodel.Article, error) {
	art, err := repository.NewMpArticleRepo().GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("文章不存在")
		}
		return nil, err
	}
	return art, nil
}

// buildItem 详情视图（拼账号名，查不到为空串）。
func (s *ArticleService) buildItem(ctx context.Context, art *mpmodel.Article) (*MpArticleItem, error) {
	item := &MpArticleItem{Article: *art}
	if art.AccountID > 0 {
		if acc, err := repository.NewMpAccountRepo().GetByID(ctx, art.AccountID); err == nil {
			item.AccountName = acc.Name
		}
	}
	return item, nil
}

// accountNameMap 批量查账号名（单页账号一次查齐）。
func accountNameMap(ctx context.Context, ids []uint) (map[uint]string, error) {
	names := make(map[uint]string, len(ids))
	if len(ids) == 0 {
		return names, nil
	}
	list, err := repository.NewMpAccountRepo().List(ctx, &repository.QueryOptions{
		Conds: []repository.Cond{{Query: "id IN ?", Args: []any{ids}}},
	})
	if err != nil {
		return names, err
	}
	for i := range list {
		names[list[i].ID] = list[i].Name
	}
	return names, nil
}

// truncateRunesPlain 按 rune 数截断（不补省略号）——标题 64 字上限用。
func truncateRunesPlain(s string, maxRunes int) string {
	runes := []rune(s)
	if len(runes) <= maxRunes {
		return s
	}
	return string(runes[:maxRunes])
}

// truncateBytesUTF8 按字节截断且不截破 UTF-8 字符，末尾补省略号——微信摘要
// 120 字节上限用（禁止把多字节字符截成半个）。
func truncateBytesUTF8(s string, maxBytes int) string {
	if len(s) <= maxBytes {
		return s
	}
	if maxBytes <= 3 {
		return s[:maxBytes]
	}
	b := s[:maxBytes-3] // 预留省略号
	for len(b) > 0 && !utf8.ValidString(b) {
		b = b[:len(b)-1]
	}
	return b + "…"
}
