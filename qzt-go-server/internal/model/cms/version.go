package cms

import "qzt-go-server/internal/model/base"

// version.go P20 CMS 文章修订版本快照。每次保存(更新)文章前快照旧内容,
// 回滚=历史版本写回正文并再快照当前态(版本链不断链),每篇保留最近 20 版。

// CmsArticleVersion 文章修订版本快照。
type CmsArticleVersion struct {
	ID uint `json:"id" gorm:"primaryKey"`
	// 文章ID
	ArticleID uint `json:"article_id" gorm:"index:idx_cav_article;comment:文章ID"`
	// 版本号(每篇递增)
	VersionNo int `json:"version_no" gorm:"index:idx_cav_article;comment:版本号(每篇递增)"`
	// 标题快照
	Title string `json:"title" gorm:"size:255;comment:标题快照"`
	// 摘要快照
	Summary string `json:"summary" gorm:"size:500;comment:摘要快照"`
	// 正文快照
	Content string `json:"content" gorm:"type:longtext;comment:正文快照"`
	// 封面快照
	CoverURL string `json:"cover_url" gorm:"size:500;comment:封面快照"`
	// 快照时操作人ID
	EditorID uint `json:"editor_id" gorm:"comment:快照时操作人ID"`
	// 快照时操作人昵称
	EditorName string `json:"editor_name" gorm:"size:64;comment:快照时操作人昵称"`
	base.BaseModel
}

func (CmsArticleVersion) TableName() string { return "cms_article_version" }
