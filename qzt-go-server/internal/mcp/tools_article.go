package mcp

import (
	"context"
	"fmt"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"

	cmssvc "qzt-go-server/internal/module/cms/service"
)

// tools_article.go CMS 文章相关 MCP tools。
// 文章正文为 Markdown 格式,官网通过 react-markdown 渲染。

func registerArticleTools(s *server.MCPServer) {
	// cms_article_list — 查询文章列表
	s.AddTool(
		mcp.NewTool("cms_article_list",
			mcp.WithDescription("查询CMS文章列表(支持分页/关键词/分类/状态过滤)"),
			mcp.WithString("keyword", mcp.Description("标题关键词")),
			mcp.WithNumber("category_id", mcp.Description("分类ID")),
			mcp.WithNumber("status", mcp.Description("状态: 0草稿 1已发布, 不传查全部")),
			mcp.WithNumber("page", mcp.Description("页码(默认1)")),
			mcp.WithNumber("page_size", mcp.Description("每页条数(默认20)")),
		),
		handleArticleList,
	)

	// cms_article_get — 查询文章详情
	s.AddTool(
		mcp.NewTool("cms_article_get",
			mcp.WithDescription("查询CMS文章详情(含正文Markdown)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("文章ID")),
		),
		handleArticleGet,
	)

	// cms_article_create — 创建文章
	s.AddTool(
		mcp.NewTool("cms_article_create",
			mcp.WithDescription("创建CMS文章(正文为Markdown格式)"),
			mcp.WithString("title", mcp.Required(), mcp.Description("文章标题")),
			mcp.WithString("slug", mcp.Description("URL别名(小写字母/数字/中划线, 如 crm-lifecycle)")),
			mcp.WithString("summary", mcp.Description("摘要(500字以内)")),
			mcp.WithString("content", mcp.Description("正文(Markdown格式, 支持标题/表格/图片/代码块)")),
			mcp.WithString("cover_url", mcp.Description("封面图URL")),
			mcp.WithNumber("category_id", mcp.Description("分类ID")),
			mcp.WithString("author_name", mcp.Description("作者昵称(默认: 企智通团队)")),
			mcp.WithNumber("status", mcp.Description("状态: 0草稿 1发布(默认1)")),
			mcp.WithNumber("is_top", mcp.Description("置顶: 0否 1是")),
			mcp.WithNumber("is_hot", mcp.Description("热门: 0否 1是")),
			mcp.WithNumber("sort", mcp.Description("排序值, 越小越靠前")),
		),
		handleArticleCreate,
	)

	// cms_article_update — 更新文章
	s.AddTool(
		mcp.NewTool("cms_article_update",
			mcp.WithDescription("更新CMS文章(只更新传入的字段)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("文章ID")),
			mcp.WithString("title", mcp.Description("文章标题")),
			mcp.WithString("slug", mcp.Description("URL别名")),
			mcp.WithString("summary", mcp.Description("摘要")),
			mcp.WithString("content", mcp.Description("正文(Markdown格式)")),
			mcp.WithString("cover_url", mcp.Description("封面图URL")),
			mcp.WithNumber("category_id", mcp.Description("分类ID")),
			mcp.WithNumber("status", mcp.Description("状态: 0草稿 1发布")),
			mcp.WithNumber("is_top", mcp.Description("置顶: 0否 1是")),
			mcp.WithNumber("is_hot", mcp.Description("热门: 0否 1是")),
			mcp.WithNumber("sort", mcp.Description("排序值")),
		),
		handleArticleUpdate,
	)
}

// ── handlers ──

func handleArticleList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := cmssvc.NewArticleService()
	page := int(req.GetFloat("page", 1))
	pageSize := int(req.GetFloat("page_size", 20))
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 || pageSize > 100 {
		pageSize = 20
	}

	q := &cmssvc.ListArticleQuery{
		Keyword:    req.GetString("keyword", ""),
		CategoryID: uint(req.GetFloat("category_id", 0)),
	}
	if req.GetString("status", "") != "" {
		status := int8(req.GetFloat("status", 1))
		q.Status = &status
	}

	list, total, err := svc.List(ctx, page, pageSize, q)
	if err != nil {
		return resultError(fmt.Sprintf("查询文章列表失败: %v", err))
	}
	return resultText(map[string]interface{}{
		"list":  list,
		"total": total,
		"page":  page,
		"size":  pageSize,
	})
}

func handleArticleGet(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := cmssvc.NewArticleService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("文章ID(id)必填")
	}
	article, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("查询文章失败: %v", err))
	}
	return resultText(article)
}

func handleArticleCreate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := cmssvc.NewArticleService()
	title := req.GetString("title", "")
	if title == "" {
		return resultError("文章标题(title)必填")
	}

	status := int8(req.GetFloat("status", 1))
	isTop := int8(req.GetFloat("is_top", 0))
	isHot := int8(req.GetFloat("is_hot", 0))
	authorName := req.GetString("author_name", "企智通团队")

	article, err := svc.Create(ctx, &cmssvc.CreateArticleRequest{
		Title:      title,
		Slug:       req.GetString("slug", ""),
		Summary:    req.GetString("summary", ""),
		Content:    req.GetString("content", ""),
		CoverURL:   req.GetString("cover_url", ""),
		CategoryID: uint(req.GetFloat("category_id", 0)),
		Status:     &status,
		IsTop:      &isTop,
		IsHot:      &isHot,
		Sort:       int(req.GetFloat("sort", 0)),
	}, userIDFromContext(ctx), authorName)
	if err != nil {
		return resultError(fmt.Sprintf("创建文章失败: %v", err))
	}
	return resultText(article)
}

func handleArticleUpdate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := cmssvc.NewArticleService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("文章ID(id)必填")
	}

	// 先读出现有文章,未传字段保持原值(Update 接口整体覆盖)
	existing, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("文章不存在: %v", err))
	}

	updateReq := &cmssvc.UpdateArticleRequest{
		Title:      getStringOr(req, "title", existing.Title),
		Slug:       getStringOr(req, "slug", existing.Slug),
		Summary:    getStringOr(req, "summary", existing.Summary),
		Content:    getStringOr(req, "content", existing.Content),
		CoverURL:   getStringOr(req, "cover_url", existing.CoverURL),
		CategoryID: getUintOr(req, "category_id", existing.CategoryID),
		Status:     getInt8PtrOr(req, "status", existing.Status),
		IsTop:      getInt8PtrOr(req, "is_top", existing.IsTop),
		IsHot:      getInt8PtrOr(req, "is_hot", existing.IsHot),
		Sort:       int(getUintOr(req, "sort", uint(existing.Sort))),
	}

	if err := svc.Update(ctx, id, updateReq, userIDFromContext(ctx), existing.AuthorName); err != nil {
		return resultError(fmt.Sprintf("更新文章失败: %v", err))
	}
	return resultText(map[string]interface{}{"id": id, "message": "更新成功"})
}

// ── 辅助:参数缺省回退 ──

func getStringOr(req mcp.CallToolRequest, key, fallback string) string {
	if v := req.GetString(key, ""); v != "" {
		return v
	}
	return fallback
}

func getUintOr(req mcp.CallToolRequest, key string, fallback uint) uint {
	if req.GetString(key, "") != "" {
		return uint(req.GetFloat(key, float64(fallback)))
	}
	return fallback
}

func getInt8PtrOr(req mcp.CallToolRequest, key string, fallback int8) *int8 {
	if req.GetString(key, "") != "" {
		v := int8(req.GetFloat(key, float64(fallback)))
		return &v
	}
	return &fallback
}
