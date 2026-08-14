package cms

import "qzt-go-server/internal/model/base"

// article.go CMS 文章。归属一个分类(CategoryID),关联多个标签(many2many)。

// 文章状态。
const (
	ArticleStatusDraft     int8 = 0 // 草稿
	ArticleStatusPublished int8 = 1 // 已发布
)

// CmsArticle 文章。
type CmsArticle struct {
	ID         uint   `json:"id" gorm:"primaryKey"`
	// 标题
	Title      string `json:"title" gorm:"size:255;not null;comment:标题"`
	// URL别名
	Slug       string `json:"slug" gorm:"index;size:255;comment:URL别名"`
	// 摘要
	Summary    string `json:"summary" gorm:"size:500;comment:摘要"`
	// 正文
	Content    string `json:"content" gorm:"type:longtext;comment:正文"`
	// 封面图URL
	CoverURL   string `json:"cover_url" gorm:"size:500;comment:封面图URL"`
	// 分类ID
	CategoryID uint   `json:"category_id" gorm:"index;comment:分类ID"`
	// AuthorID/AuthorName 为作者快照,避免跨模块预加载 sys_user。
	AuthorID   uint   `json:"author_id" gorm:"index;comment:作者用户ID"`
	// 作者昵称(快照)
	AuthorName string `json:"author_name" gorm:"size:64;comment:作者昵称(快照)"`
	// 0草稿 1已发布
	Status     int8   `json:"status" gorm:"default:0;index;comment:0草稿 1已发布"`
	// 0否 1置顶
	IsTop      int8   `json:"is_top" gorm:"default:0;comment:0否 1置顶"`
	// 0否 1热门
	IsHot      int8   `json:"is_hot" gorm:"default:0;comment:0否 1热门"`
	// 浏览量
	ViewCount  int    `json:"view_count" gorm:"default:0;comment:浏览量"`
	// 排序
	Sort       int    `json:"sort" gorm:"default:0;comment:排序"`
	// 关联：分类(belongs to)与标签(many2many)。GORM 自动建关联表 cms_article_tag。
	Category CmsCategory `json:"category,omitempty" gorm:"foreignKey:CategoryID"`
	Tags     []CmsTag    `json:"tags,omitempty" gorm:"many2many:cms_article_tag;"`
	base.BaseModel
}

func (CmsArticle) TableName() string { return "cms_article" }
