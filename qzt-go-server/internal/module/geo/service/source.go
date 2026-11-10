package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	model "qzt-go-server/internal/model"
	geo "qzt-go-server/internal/model/geo"
	"qzt-go-server/internal/pkg/douyin"
	"qzt-go-server/internal/pkg/wxmp"
	"qzt-go-server/internal/repository"
	georepo "qzt-go-server/internal/repository/geo"
	"qzt-go-server/pkg/xlogger"
	"qzt-go-server/pkg/xtime"

	"gorm.io/gorm"
)

// source.go 稿件库：CRUD + 投递（公众号草稿箱/freepublish、抖音直发）
// + 平台授权账号管理。分层约束：handler 只进这里，不直接碰 repository。

// 投递状态口径：generated(已生成待推送) → pushed(已进草稿箱) → published(已发布)。
// failed 保留 error 摘要可重试；分发稿（variant_of>0）默认停在 generated 等人工发布。

// SourceService 信源产线服务（选题/稿件/投递/产线入口都在这组方法上）。
type SourceService struct{}

func NewSourceService() *SourceService { return &SourceService{} }

// SourcePayload 稿件新增/编辑入参。
type SourcePayload struct {
	TopicID     uint   `json:"topic_id"`
	ContentType string `json:"content_type"`
	Platform    string `json:"platform"`
	Genre       string `json:"genre"`
	Title       string `json:"title"`
	Digest      string `json:"digest"`
	ContentMd   string `json:"content_md"`
}

// SourceView 稿件对外视图（拼选题问题，前端少一次查询）。
type SourceView struct {
	geo.GeoSource
	TopicQuestion string `json:"topic_question"`
}

// ListSources 稿件分页。
func (s *SourceService) ListSources(ctx context.Context, page, pageSize int, contentType, platform, status, qcStatus string) ([]SourceView, int64, error) {
	list, total, err := georepo.NewSourceRepo().PageList(ctx, page, pageSize, contentType, platform, status, qcStatus)
	if err != nil {
		return nil, 0, err
	}
	views := make([]SourceView, 0, len(list))
	for _, src := range list {
		views = append(views, SourceView{GeoSource: src})
	}
	// 拼选题问题（单页涉及的选题一次查齐）
	topicIDs := make(map[uint]struct{})
	for _, v := range views {
		if v.TopicID > 0 {
			topicIDs[v.TopicID] = struct{}{}
		}
	}
	if len(topicIDs) == 0 {
		return views, total, nil
	}
	topics, err := georepo.NewTopicRepo().List(ctx, repoQueryInIDs(topicIDs))
	if err != nil {
		return views, total, nil // 选题名拼接失败不阻塞列表
	}
	names := make(map[uint]string, len(topics))
	for _, t := range topics {
		names[t.ID] = t.Question
	}
	for i := range views {
		views[i].TopicQuestion = names[views[i].TopicID]
	}
	return views, total, nil
}

// CreateSource 手工新增稿件。
func (s *SourceService) CreateSource(ctx context.Context, p *SourcePayload) (*geo.GeoSource, error) {
	m, err := p.toModel()
	if err != nil {
		return nil, err
	}
	if err := georepo.NewSourceRepo().Create(ctx, m); err != nil {
		return nil, fmt.Errorf("新增稿件失败: %w", err)
	}
	return m, nil
}

// UpdateSource 编辑稿件标题/摘要/正文。
func (s *SourceService) UpdateSource(ctx context.Context, id uint, p *SourcePayload) error {
	old, err := georepo.NewSourceRepo().GetByID(ctx, id)
	if err != nil {
		return errors.New("稿件不存在")
	}
	m, err := p.toModel()
	if err != nil {
		return err
	}
	m.ID = old.ID
	m.CreatedAt = old.CreatedAt // 全量 Save 会落库 CreatedAt,零值会写 NULL(Err 1048)
	m.Status = old.Status
	m.MediaID = old.MediaID
	m.PublishID = old.PublishID
	m.PublishURL = old.PublishURL
	m.VideoURL = old.VideoURL
	m.VideoTaskID = old.VideoTaskID
	// P18：改稿后旧质检结论作废（内容已变），重置为未质检
	m.QcStatus = "none"
	m.QcResult = ""
	return georepo.NewSourceRepo().Update(ctx, m)
}

// DeleteSource 删除稿件。
func (s *SourceService) DeleteSource(ctx context.Context, id uint) error {
	return georepo.NewSourceRepo().Delete(ctx, id)
}

// GetSource 稿件详情。
func (s *SourceService) GetSource(ctx context.Context, id uint) (*geo.GeoSource, error) {
	src, err := georepo.NewSourceRepo().GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("稿件不存在")
		}
		return nil, err
	}
	return src, nil
}

func (p *SourcePayload) toModel() (*geo.GeoSource, error) {
	switch p.ContentType {
	case "":
		p.ContentType = "article"
	case "article", "video", "video_script":
	default:
		return nil, errors.New("content_type 必须是 article/video/video_script")
	}
	if p.Platform == "" {
		p.Platform = "wechat_mp"
	}
	if strings.TrimSpace(p.Title) == "" {
		return nil, errors.New("标题不能为空")
	}
	return &geo.GeoSource{
		TopicID:     p.TopicID,
		ContentType: p.ContentType,
		Platform:    p.Platform,
		Genre:       p.Genre,
		Title:       strings.TrimSpace(p.Title),
		Digest:      strings.TrimSpace(p.Digest),
		ContentMd:   p.ContentMd,
	}, nil
}

// ── 微信公众号投递 ──

// wechatMPExtra sys_oauth_config(provider=wechat_mp) Extra JSON 的扩展字段。
type wechatMPExtra struct {
	TemplateID         string `json:"template_id"`
	SourceThumbMediaID string `json:"source_thumb_media_id"` // 稿件默认封面永久素材
}

// assetHTTPClient 视频下载客户端（大文件放宽超时）。
var assetHTTPClient = &http.Client{Timeout: 3 * time.Minute}

// newWxmpClient 从 sys_oauth_config 构造公众号客户端（复用第三方登录配置）。
func newWxmpClient(ctx context.Context) (*wxmp.Client, error) {
	cfg, err := repository.NewOauthConfigRepo().GetEnabledByProvider(ctx, model.OAuthProviderWechatMP)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("微信服务号未启用，请在「第三方登录配置」中填写 AppID/Secret 并启用")
		}
		return nil, fmt.Errorf("读取微信服务号配置失败: %w", err)
	}
	var extra wechatMPExtra
	_ = json.Unmarshal([]byte(cfg.Extra), &extra)
	client := wxmp.NewClient(wxmp.Config{
		AppID:        cfg.AppID,
		Secret:       cfg.AppSecret,
		RedirectURI:  cfg.RedirectURI,
		TemplateID:   extra.TemplateID,
		ThumbMediaID: extra.SourceThumbMediaID,
	})
	if !client.IsConfigured() {
		return nil, errors.New("微信服务号配置不完整(AppID/Secret 未填写)")
	}
	return client, nil
}

// PushToDraft 把图文稿推送进公众号草稿箱（Markdown → 内联样式 HTML → draft/add）。
func (s *SourceService) PushToDraft(ctx context.Context, id uint) (*geo.GeoSource, error) {
	src, err := s.GetSource(ctx, id)
	if err != nil {
		return nil, err
	}
	if src.ContentType != "article" {
		return nil, errors.New("仅图文稿支持推送草稿箱")
	}
	if strings.TrimSpace(src.ContentMd) == "" {
		return nil, errors.New("稿件正文为空")
	}
	// P18 质检门禁：blocked 稿件不进推送队列（改稿重检通过后才可推送）
	if src.QcStatus == "blocked" {
		return nil, fmt.Errorf("稿件质检未通过（blocked），暂不可推送；请按质检建议改稿后重新质检")
	}
	client, err := newWxmpClient(ctx)
	if err != nil {
		return nil, err
	}
	thumb, err := client.ThumbMediaIDFor(ctx)
	if err != nil {
		return nil, err
	}
	mediaID, err := client.AddDraft(ctx, wxmp.DraftArticle{
		Title:        truncateBytesUTF8(src.Title, 192), // 微信标题上限 64 字（192 字节）
		Author:       sourceAuthor,
		Digest:       src.Digest,
		Content:      wxmp.MarkdownToWechatHTML(src.ContentMd),
		ThumbMediaID: thumb,
	})
	if err != nil {
		s.markFailed(ctx, src, err)
		return nil, err
	}
	src.MediaID = mediaID
	src.Status = "pushed"
	src.Error = ""
	if err := georepo.NewSourceRepo().Update(ctx, src, "media_id", "status", "error"); err != nil {
		return nil, err
	}
	return src, nil
}

// PublishNow 对已进草稿箱的稿件提交 API 直接发布（freepublish，仅认证账号）。
func (s *SourceService) PublishNow(ctx context.Context, id uint) (*geo.GeoSource, error) {
	src, err := s.GetSource(ctx, id)
	if err != nil {
		return nil, err
	}
	if src.MediaID == "" {
		return nil, errors.New("稿件尚未推送草稿箱，请先推送")
	}
	client, err := newWxmpClient(ctx)
	if err != nil {
		return nil, err
	}
	publishID, err := client.PublishDraft(ctx, src.MediaID)
	if err != nil {
		s.markFailed(ctx, src, err)
		return nil, err
	}
	src.PublishID = publishID
	if err := georepo.NewSourceRepo().Update(ctx, src, "publish_id"); err != nil {
		return nil, err
	}
	return src, nil
}

// RefreshPublish 拉取 freepublish 发布状态，成功时回填发布 URL。
func (s *SourceService) RefreshPublish(ctx context.Context, id uint) (*geo.GeoSource, error) {
	src, err := s.GetSource(ctx, id)
	if err != nil {
		return nil, err
	}
	if src.PublishID == "" {
		return nil, errors.New("稿件没有发布任务，请先「直接发布」")
	}
	client, err := newWxmpClient(ctx)
	if err != nil {
		return nil, err
	}
	st, err := client.GetPublishStatus(ctx, src.PublishID)
	if err != nil {
		return nil, err
	}
	if st.Status == 0 && st.URL != "" {
		src.Status = "published"
		src.PublishURL = st.URL
		if err := georepo.NewSourceRepo().Update(ctx, src, "status", "publish_url"); err != nil {
			return nil, err
		}
	}
	return src, nil
}

// markFailed 记录投递失败（保留原状态字段语义：failed + 原因，可重试）。
func (s *SourceService) markFailed(ctx context.Context, src *geo.GeoSource, err error) {
	src.Status = "failed"
	src.Error = truncateRunes(err.Error(), 480)
	if uerr := georepo.NewSourceRepo().Update(ctx, src, "status", "error"); uerr != nil {
		xlogger.ErrorfCtx(ctx, "geo: 记录稿件失败状态出错 source=%d: %v", src.ID, uerr)
	}
}

// ── 多平台分发稿 ──

// GenerateVariant 基于母稿生成另一平台的差异化分发稿（人工发布后回填 URL）。
func (s *SourceService) GenerateVariant(ctx context.Context, id uint, platform string) (*geo.GeoSource, error) {
	if _, ok := platformInstructions[platform]; !ok {
		return nil, fmt.Errorf("不支持的分发平台: %s（可选 zhihu/csdn/xhs/toutiao/douyin）", platform)
	}
	mother, err := s.GetSource(ctx, id)
	if err != nil {
		return nil, err
	}
	if strings.TrimSpace(mother.ContentMd) == "" {
		return nil, errors.New("母稿正文为空")
	}
	client, err := writerLLMClient(ctx)
	if err != nil {
		return nil, err
	}
	draft, err := writeVariant(ctx, client, mother.Title, mother.ContentMd, platform)
	if err != nil {
		return nil, err
	}
	variant := &geo.GeoSource{
		TopicID:     mother.TopicID,
		ContentType: "article",
		Platform:    platform,
		Genre:       mother.Genre,
		Title:       draft.Title,
		Digest:      draft.Digest,
		ContentMd:   draft.ContentMd,
		Status:      "generated",
		VariantOf:   mother.ID,
	}
	if err := georepo.NewSourceRepo().Create(ctx, variant); err != nil {
		return nil, fmt.Errorf("分发稿入库失败: %w", err)
	}
	return variant, nil
}

// ── 抖音账号与视频直发 ──

// DouyinAccountView 抖音授权账号对外视图（token 不回显）。
type DouyinAccountView struct {
	ID        uint           `json:"id"`
	OpenID    string         `json:"open_id"`
	Nickname  string         `json:"nickname"`
	ExpiresAt xtime.DateTime `json:"expires_at"`
	Enabled   bool           `json:"enabled"`
}

// newDouyinClient 从 sys_oauth_config(provider=douyin) 构造抖音客户端。
func newDouyinClient(ctx context.Context) (*douyin.Client, error) {
	cfg, err := repository.NewOauthConfigRepo().GetEnabledByProvider(ctx, model.OAuthProviderDouyin)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("抖音开放平台未配置，请在「第三方登录配置」新增 douyin 渠道（client_key/secret + 回调地址）并启用")
		}
		return nil, fmt.Errorf("读取抖音配置失败: %w", err)
	}
	client := douyin.NewClient(douyin.Config{
		ClientKey:    cfg.AppID,
		ClientSecret: cfg.AppSecret,
		RedirectURI:  cfg.RedirectURI,
	})
	if !client.IsConfigured() {
		return nil, errors.New("抖音配置不完整(client_key/secret 未填写)")
	}
	return client, nil
}

// DouyinAuthorizeURL 生成抖音授权链接（运营在浏览器打开并扫码授权）。
func (s *SourceService) DouyinAuthorizeURL(ctx context.Context) (string, error) {
	client, err := newDouyinClient(ctx)
	if err != nil {
		return "", err
	}
	return client.AuthorizeURL(randomState()), nil
}

// BindDouyin 用授权回调的 code 绑定账号（换 token → 拉昵称 → upsert）。
func (s *SourceService) BindDouyin(ctx context.Context, code string) (*DouyinAccountView, error) {
	if strings.TrimSpace(code) == "" {
		return nil, errors.New("缺少授权 code")
	}
	client, err := newDouyinClient(ctx)
	if err != nil {
		return nil, err
	}
	tok, err := client.ExchangeToken(ctx, code)
	if err != nil {
		return nil, err
	}
	// 昵称拉取失败不阻断绑定（可空）
	nickname, _, _ := client.Userinfo(ctx, tok.AccessToken, tok.OpenID)

	repo := georepo.NewPlatformAccountRepo()
	acc, err := repo.FindByOpenID(ctx, "douyin", tok.OpenID)
	if err != nil {
		return nil, err
	}
	if acc == nil {
		acc = &geo.GeoPlatformAccount{Platform: "douyin", OpenID: tok.OpenID}
	}
	acc.Nickname = nickname
	acc.AccessToken = tok.AccessToken
	acc.RefreshToken = tok.RefreshToken
	acc.ExpiresAt = xtime.DateTime(time.Now().Add(time.Duration(tok.ExpiresIn) * time.Second))
	acc.Scope = tok.Scope
	acc.Enabled = true
	if acc.ID > 0 {
		err = repo.Update(ctx, acc)
	} else {
		err = repo.Create(ctx, acc)
	}
	if err != nil {
		return nil, fmt.Errorf("保存抖音账号失败: %w", err)
	}
	return &DouyinAccountView{ID: acc.ID, OpenID: acc.OpenID, Nickname: acc.Nickname, ExpiresAt: acc.ExpiresAt, Enabled: acc.Enabled}, nil
}

// ListDouyinAccounts 已绑定的抖音账号列表。
func (s *SourceService) ListDouyinAccounts(ctx context.Context) ([]DouyinAccountView, error) {
	list, err := georepo.NewPlatformAccountRepo().ListEnabled(ctx, "douyin")
	if err != nil {
		return nil, err
	}
	views := make([]DouyinAccountView, 0, len(list))
	for _, a := range list {
		views = append(views, DouyinAccountView{ID: a.ID, OpenID: a.OpenID, Nickname: a.Nickname, ExpiresAt: a.ExpiresAt, Enabled: a.Enabled})
	}
	return views, nil
}

// DeleteDouyinAccount 解绑抖音账号。
func (s *SourceService) DeleteDouyinAccount(ctx context.Context, id uint) error {
	return georepo.NewPlatformAccountRepo().Delete(ctx, id)
}

// validAccessToken 取账号可用 token：临期(≤5 分钟)时用 refresh_token 续期并落库。
func (s *SourceService) validAccessToken(ctx context.Context, client *douyin.Client, acc *geo.GeoPlatformAccount) (string, error) {
	if time.Until(time.Time(acc.ExpiresAt)) > 5*time.Minute {
		return acc.AccessToken, nil
	}
	if acc.RefreshToken == "" {
		return "", errors.New("抖音 token 已过期且无 refresh_token，请重新授权绑定")
	}
	tok, err := client.RefreshAccessToken(ctx, acc.RefreshToken)
	if err != nil {
		return "", fmt.Errorf("刷新抖音 token 失败(可尝试重新授权): %w", err)
	}
	acc.AccessToken = tok.AccessToken
	acc.RefreshToken = tok.RefreshToken
	acc.ExpiresAt = xtime.DateTime(time.Now().Add(time.Duration(tok.ExpiresIn) * time.Second))
	if err := georepo.NewPlatformAccountRepo().Update(ctx, acc); err != nil {
		return "", err
	}
	return acc.AccessToken, nil
}

// PushVideoToDouyin 把视频稿直发抖音（下载成片 → 上传 → 创建内容）。
// accountID=0 时取第一个可用账号。
func (s *SourceService) PushVideoToDouyin(ctx context.Context, id, accountID uint) (*geo.GeoSource, error) {
	src, err := s.GetSource(ctx, id)
	if err != nil {
		return nil, err
	}
	if src.ContentType != "video" || strings.TrimSpace(src.VideoURL) == "" {
		return nil, errors.New("仅已出片的视频稿支持直发抖音")
	}
	client, err := newDouyinClient(ctx)
	if err != nil {
		return nil, err
	}
	acc, err := s.pickDouyinAccount(ctx, accountID)
	if err != nil {
		return nil, err
	}
	token, err := s.validAccessToken(ctx, client, acc)
	if err != nil {
		return nil, err
	}
	video, err := downloadAsset(ctx, src.VideoURL, maxVideoBytes)
	if err != nil {
		return nil, err
	}
	uploadID, err := client.UploadVideo(ctx, token, acc.OpenID, "geo_source.mp4", video)
	if err != nil {
		s.markFailed(ctx, src, err)
		return nil, err
	}
	itemID, err := client.CreateVideo(ctx, token, acc.OpenID, uploadID, src.Title)
	if err != nil {
		s.markFailed(ctx, src, err)
		return nil, err
	}
	src.Status = "published"
	src.PublishURL = "https://www.douyin.com/video/" + itemID
	src.Error = ""
	if err := georepo.NewSourceRepo().Update(ctx, src, "status", "publish_url", "error"); err != nil {
		return nil, err
	}
	return src, nil
}

// pickDouyinAccount 选定发布账号。
func (s *SourceService) pickDouyinAccount(ctx context.Context, accountID uint) (*geo.GeoPlatformAccount, error) {
	repo := georepo.NewPlatformAccountRepo()
	if accountID > 0 {
		acc, err := repo.GetByID(ctx, accountID)
		if err != nil {
			return nil, errors.New("抖音账号不存在")
		}
		return acc, nil
	}
	list, err := repo.ListEnabled(ctx, "douyin")
	if err != nil {
		return nil, err
	}
	if len(list) == 0 {
		return nil, errors.New("尚未绑定抖音账号，请先在信源库完成授权")
	}
	return &list[0], nil
}

// ── 工具 ──

// maxVideoBytes 视频下载上限（100MB；720p/5s 成片通常 3~10MB）。
const maxVideoBytes = 100 << 20

// downloadAsset 下载资源字节（带大小上限与超时）。
func downloadAsset(ctx context.Context, rawURL string, limit int64) ([]byte, error) {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Minute)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, rawURL, nil)
	if err != nil {
		return nil, err
	}
	resp, err := assetHTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("下载资源失败: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("下载资源失败: HTTP %d", resp.StatusCode)
	}
	data, err := io.ReadAll(io.LimitReader(resp.Body, limit+1))
	if err != nil {
		return nil, fmt.Errorf("下载资源失败: %w", err)
	}
	if int64(len(data)) > limit {
		return nil, fmt.Errorf("资源超过大小上限(%d MB)", limit>>20)
	}
	return data, nil
}

// randomState 生成 OAuth state 随机串。
func randomState() string {
	b := make([]byte, 8)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

// repoQueryInIDs 构造 id IN (...) 查询条件。
func repoQueryInIDs(ids map[uint]struct{}) *repository.QueryOptions {
	list := make([]uint, 0, len(ids))
	for id := range ids {
		list = append(list, id)
	}
	return &repository.QueryOptions{
		Conds: []repository.Cond{{Query: "id IN ?", Args: []any{list}}},
	}
}
