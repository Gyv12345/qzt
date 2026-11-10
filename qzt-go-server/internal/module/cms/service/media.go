package service

import (
	"context"
	"errors"
	"path/filepath"
	"strings"

	"qzt-go-server/config"
	"qzt-go-server/internal/app"
	"qzt-go-server/internal/pkg/storage"
	"qzt-go-server/pkg/xlogger"
)

// media.go P22 CMS 媒体库：公共桶对象浏览/检索/删除。
// 复用 app.Uploader 的 List/Delete（OSS ListObjectsV2 / local 目录遍历,删除幂等）；
// 直链由 storage.resource_domain 拼 key 得到(与上传返回口径一致)。

// MediaService 媒体库服务。
type MediaService struct{}

func NewMediaService() *MediaService { return &MediaService{} }

// MediaItem 媒体库条目(对象元信息+直链)。
type MediaItem struct {
	Key  string `json:"key"`
	Size int64  `json:"size"`
	// 最后修改时间(RFC3339)
	LastModified string `json:"last_modified"`
	// 可直链访问的 URL
	URL string `json:"url"`
	// 是否图片(前端决定渲染缩略图或文件图标)
	IsImage bool `json:"is_image"`
}

// mediaImageExts 判定为图片的扩展名。
var mediaImageExts = map[string]bool{
	".jpg": true, ".jpeg": true, ".png": true, ".webp": true, ".gif": true, ".svg": true,
}

// List 列举公共桶对象并拼直链。keyword 过滤 key 子串(忽略大小写)。
func (s *MediaService) List(ctx context.Context, keyword string, maxKeys int) ([]MediaItem, error) {
	uploader := app.GetUploader()
	if uploader == nil {
		return nil, errors.New("文件存储服务未初始化")
	}
	objs, err := uploader.List("", maxKeys)
	if err != nil {
		return nil, err
	}
	domain := strings.TrimRight(config.Get().Storage.ResourceDomain, "/")
	keyword = strings.ToLower(strings.TrimSpace(keyword))
	out := make([]MediaItem, 0, len(objs))
	for _, o := range objs {
		if keyword != "" && !strings.Contains(strings.ToLower(o.Key), keyword) {
			continue
		}
		out = append(out, MediaItem{
			Key:          o.Key,
			Size:         o.Size,
			LastModified: o.LastModified.Format("2006-01-02 15:04:05"),
			URL:          domain + "/" + o.Key,
			IsImage:      mediaImageExts[strings.ToLower(filepath.Ext(o.Key))],
		})
	}
	return out, nil
}

// Delete 删除公共桶对象(幂等),返回删除成功与失败的 key 清单。
func (s *MediaService) Delete(ctx context.Context, keys []string) (deleted []string, failed []string, err error) {
	uploader := app.GetUploader()
	if uploader == nil {
		return nil, nil, errors.New("文件存储服务未初始化")
	}
	for _, k := range keys {
		k = strings.TrimSpace(k)
		if k == "" {
			continue
		}
		if dErr := uploader.Delete(k, storage.VisibilityPublic); dErr != nil {
			xlogger.ErrorfCtx(ctx, "cms: 媒体删除失败 key=%s: %v", k, dErr)
			failed = append(failed, k)
			continue
		}
		deleted = append(deleted, k)
	}
	return deleted, failed, nil
}