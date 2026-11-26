package repository

import (
	"context"

	mpmodel "qzt-go-server/internal/model/mp"
)

// mp_article.go 公众号文章草稿 repository(mp 运营中心,docs/sql/mp_ops.sql)。

// MpArticleRepo 公众号文章 repository。
type MpArticleRepo struct {
	BaseRepo[mpmodel.Article]
}

func NewMpArticleRepo() *MpArticleRepo { return &MpArticleRepo{} }

// ListPaged 分页列表(account_id/status/keyword 过滤,新建时间倒序)。
func (r *MpArticleRepo) ListPaged(ctx context.Context, page, pageSize int, accountID uint, status, keyword string) ([]mpmodel.Article, int64, error) {
	opt := &QueryOptions{Order: []string{"id DESC"}}
	if accountID > 0 {
		opt.Where = map[string]any{"account_id": accountID}
	}
	if status != "" {
		if opt.Where == nil {
			opt.Where = map[string]any{}
		}
		opt.Where["status"] = status
	}
	if keyword != "" {
		opt.Search = map[string]string{"title": keyword}
	}
	return r.PageList(ctx, page, pageSize, opt)
}
