package service

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"regexp"
	"strings"
	"time"

	"qzt-go-server/internal/app"
	cloudmodel "qzt-go-server/internal/model/cloud"
	cloudrepo "qzt-go-server/internal/repository/cloud"
	"qzt-go-server/pkg/xtime"
)

// 分享业务约束。
const (
	// ShareExpireDays7 / ShareExpireDays30 有效期白名单(天)。
	ShareExpireDays7  = 7
	ShareExpireDays30 = 30
	// MaxActiveSharesPerUser 单用户活跃(未取消)分享上限。
	MaxActiveSharesPerUser = 200
	// DownloadURLTTL 公开下载签发 URL 有效期。
	DownloadURLTTL = 10 * time.Minute
)

// extractCodePattern 提取码:4-12 位字母数字。
var extractCodePattern = regexp.MustCompile(`^[a-zA-Z0-9]{4,12}$`)

// ErrShareInvalid 分享不存在/已过期/已取消/文件不可下载,统一按失效处理(公开侧 404 语义)。
var ErrShareInvalid = errors.New("分享链接已失效")

// ShareService 网盘分享服务。
// 不持有 Uploader 实例——签名下载一律 app.GetUploader() 懒取,
// 保证存储配置热切换后新分享下载即刻用新驱动签 URL(构造期注入会持有旧实例)。
type ShareService struct {
	shareRepo *cloudrepo.CloudShareRepo
	fileRepo  *cloudrepo.CloudRepo
}

func NewShareService() *ShareService {
	return &ShareService{
		shareRepo: cloudrepo.NewCloudShareRepo(),
		fileRepo:  cloudrepo.NewCloudRepo(),
	}
}

// generateShareToken 生成 43 位分享令牌:crypto/rand 32 字节 → base64url(Raw)。
func generateShareToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

type CreateShareRequest struct {
	FileID      uint   `json:"file_id" binding:"required"`
	ExpireDays  int    `json:"expire_days" binding:"required"`
	ExtractCode string `json:"extract_code"`
}

type ShareCreated struct {
	Token       string         `json:"token"`
	ExtractCode string         `json:"extract_code"`
	ExpireAt    xtime.DateTime `json:"expire_at"`
}

// Create 创建分享:校验文件属主(CreatorID=当前用户)、非文件夹、状态正常;
// expire_days 白名单 7/30;单用户活跃分享上限 200。
func (s *ShareService) Create(ctx context.Context, req *CreateShareRequest, userID uint) (*ShareCreated, error) {
	if req.ExpireDays != ShareExpireDays7 && req.ExpireDays != ShareExpireDays30 {
		return nil, errors.New("有效期仅支持 7 或 30 天")
	}
	req.ExtractCode = strings.TrimSpace(req.ExtractCode)
	if req.ExtractCode != "" && !extractCodePattern.MatchString(req.ExtractCode) {
		return nil, errors.New("提取码须为 4-12 位字母数字")
	}

	file, err := s.fileRepo.GetByID(ctx, req.FileID)
	if err != nil {
		return nil, errors.New("文件不存在")
	}
	if file.CreatorID != userID {
		return nil, errors.New("仅可分享自己上传的文件")
	}
	if file.IsDir == 1 {
		return nil, errors.New("文件夹不支持分享,请分享单个文件")
	}
	if file.Status != 1 {
		return nil, errors.New("文件已移入回收站,无法分享")
	}

	count, err := s.shareRepo.CountActiveByOwner(ctx, userID)
	if err != nil {
		return nil, err
	}
	if count >= MaxActiveSharesPerUser {
		return nil, errors.New("活跃分享已达上限(200 条),请先取消部分分享")
	}

	token, err := generateShareToken()
	if err != nil {
		return nil, err
	}
	share := &cloudmodel.CloudShare{
		Token:       token,
		FileID:      req.FileID,
		OwnerID:     userID,
		ExtractCode: req.ExtractCode,
		ExpireAt:    xtime.NewDateTime(time.Now().AddDate(0, 0, req.ExpireDays)),
		Disabled:    0,
	}
	if err := s.shareRepo.Create(ctx, share); err != nil {
		return nil, err
	}
	return &ShareCreated{
		Token:       share.Token,
		ExtractCode: share.ExtractCode,
		ExpireAt:    share.ExpireAt,
	}, nil
}

// List 我创建的分享分页。
func (s *ShareService) List(ctx context.Context, userID uint, page, pageSize int) ([]cloudrepo.ShareListItem, int64, error) {
	return s.shareRepo.ListByOwner(ctx, userID, page, pageSize)
}

// Cancel 取消分享(仅本人)。
func (s *ShareService) Cancel(ctx context.Context, id uint, userID uint) error {
	share, err := s.shareRepo.GetByID(ctx, id)
	if err != nil {
		return errors.New("分享不存在")
	}
	if share.OwnerID != userID {
		return errors.New("仅可取消自己创建的分享")
	}
	if share.Disabled == 1 {
		return nil
	}
	return s.shareRepo.Cancel(ctx, id)
}

// ShareMeta 公开侧分享元信息。
type ShareMeta struct {
	FileName      string         `json:"file_name"`
	Size          int64          `json:"size"`
	ExpireAt      xtime.DateTime `json:"expire_at"`
	HasCode       bool           `json:"has_code"`
	DownloadCount int            `json:"download_count"`
}

// GetPublicMeta 公开侧按 token 取分享元信息。
// token 无效/已取消/已过期/文件非正常状态 → ErrShareInvalid(404 语义)。
func (s *ShareService) GetPublicMeta(ctx context.Context, token string) (*ShareMeta, error) {
	share, file, err := s.loadValid(ctx, token)
	if err != nil {
		return nil, err
	}
	return &ShareMeta{
		FileName:      file.Name,
		Size:          file.Size,
		ExpireAt:      share.ExpireAt,
		HasCode:       share.ExtractCode != "",
		DownloadCount: share.DownloadCount,
	}, nil
}

// PublicDownload 公开侧校验提取码并签出短期下载 URL(10 分钟),下载次数 +1。
func (s *ShareService) PublicDownload(ctx context.Context, token, code string) (string, error) {
	share, file, err := s.loadValid(ctx, token)
	if err != nil {
		return "", err
	}
	// 提取码校验:恒时比较,避免时序侧信道
	if share.ExtractCode != "" {
		if !hmac.Equal([]byte(share.ExtractCode), []byte(strings.TrimSpace(code))) {
			return "", errors.New("提取码错误")
		}
	}
	if file.ObjectKey == "" {
		return "", ErrShareInvalid
	}
	// 下载地址按文件存储形态解析:公共桶文件上传时已生成公开 CDN URL(URL 字段非空),
	// 分享即分发该地址;私有桶文件无公开 URL,走短期签名(提取码+过期+可撤销才有意义)。
	// 签名用当前 Uploader(懒取,热切换后即刻新驱动)。
	var url string
	if file.URL != "" {
		url = file.URL
	} else {
		uploader := app.GetUploader()
		if uploader == nil {
			return "", errors.New("文件存储服务未初始化")
		}
		signed, err := uploader.SignURL(file.ObjectKey, DownloadURLTTL)
		if err != nil {
			return "", err
		}
		url = signed
	}
	if err := s.shareRepo.IncrDownload(ctx, share.ID); err != nil {
		return "", err
	}
	return url, nil
}

// loadValid 按 token 加载有效的分享与文件:
// 分享存在(未删除)、未取消、未过期,且文件未删除、Status=1、非文件夹。
func (s *ShareService) loadValid(ctx context.Context, token string) (*cloudmodel.CloudShare, *cloudmodel.CloudFile, error) {
	share, err := s.shareRepo.GetByToken(ctx, token)
	if err != nil {
		return nil, nil, ErrShareInvalid
	}
	if share.Disabled == 1 || share.ExpireAt.Time().Before(time.Now()) {
		return nil, nil, ErrShareInvalid
	}
	file, err := s.fileRepo.GetByID(ctx, share.FileID)
	if err != nil || file.IsDir == 1 || file.Status != 1 {
		return nil, nil, ErrShareInvalid
	}
	return share, file, nil
}
