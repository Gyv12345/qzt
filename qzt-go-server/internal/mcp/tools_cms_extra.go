package mcp

import (
	"context"
	"fmt"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"

	cmsmodel "qzt-go-server/internal/model/cms"
	cmssvc "qzt-go-server/internal/module/cms/service"
)

// tools_cms_extra.go CMS 分类/标签/单页 MCP tools。

func registerCmsExtraTools(s *server.MCPServer) {
	registerCategoryTools(s)
	registerTagTools(s)
	registerPageTools(s)
}

// ── 分类 ──

func registerCategoryTools(s *server.MCPServer) {
	s.AddTool(
		mcp.NewTool("cms_category_list",
			mcp.WithDescription("查询CMS分类列表(树形结构)"),
			mcp.WithNumber("page", mcp.Description("页码(默认1)")),
			mcp.WithNumber("page_size", mcp.Description("每页条数(默认20)")),
		),
		handleCategoryList,
	)

	s.AddTool(
		mcp.NewTool("cms_category_create",
			mcp.WithDescription("创建CMS分类"),
			mcp.WithString("name", mcp.Required(), mcp.Description("分类名称")),
			mcp.WithString("slug", mcp.Description("URL别名")),
			mcp.WithNumber("parent_id", mcp.Description("父分类ID(0为根分类)")),
			mcp.WithNumber("sort", mcp.Description("排序值")),
			mcp.WithString("remark", mcp.Description("备注")),
		),
		handleCategoryCreate,
	)

	s.AddTool(
		mcp.NewTool("cms_category_update",
			mcp.WithDescription("更新CMS分类"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("分类ID")),
			mcp.WithString("name", mcp.Required(), mcp.Description("分类名称")),
			mcp.WithString("slug", mcp.Description("URL别名")),
			mcp.WithNumber("parent_id", mcp.Description("父分类ID")),
			mcp.WithNumber("sort", mcp.Description("排序值")),
			mcp.WithString("remark", mcp.Description("备注")),
		),
		handleCategoryUpdate,
	)

	s.AddTool(
		mcp.NewTool("cms_category_delete",
			mcp.WithDescription("删除CMS分类"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("分类ID")),
		),
		handleCategoryDelete,
	)
}

func handleCategoryList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := cmssvc.NewCategoryService()
	// ListAll 返回全部(含树形),更适合 AI 使用
	tree, err := svc.ListAll(ctx)
	if err != nil {
		return resultError(fmt.Sprintf("查询分类失败: %v", err))
	}
	return resultText(tree)
}

func handleCategoryCreate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := cmssvc.NewCategoryService()
	name := req.GetString("name", "")
	if name == "" {
		return resultError("分类名称(name)必填")
	}
	status := cmsmodel.StatusEnabled
	err := svc.Create(ctx, &cmssvc.CreateCategoryRequest{
		Name:     name,
		Slug:     req.GetString("slug", ""),
		ParentID: uint(req.GetFloat("parent_id", 0)),
		Sort:     int(req.GetFloat("sort", 0)),
		Status:   &status,
		Remark:   req.GetString("remark", ""),
	})
	if err != nil {
		return resultError(fmt.Sprintf("创建分类失败: %v", err))
	}
	return resultText(map[string]interface{}{"message": "分类已创建"})
}

func handleCategoryUpdate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := cmssvc.NewCategoryService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("分类ID(id)必填")
	}
	name := req.GetString("name", "")
	if name == "" {
		return resultError("分类名称(name)必填")
	}
	status := cmsmodel.StatusEnabled
	err := svc.Update(ctx, id, &cmssvc.UpdateCategoryRequest{
		Name:     name,
		Slug:     req.GetString("slug", ""),
		ParentID: uint(req.GetFloat("parent_id", 0)),
		Sort:     int(req.GetFloat("sort", 0)),
		Status:   &status,
		Remark:   req.GetString("remark", ""),
	})
	if err != nil {
		return resultError(fmt.Sprintf("更新分类失败: %v", err))
	}
	return resultText(map[string]interface{}{"id": id, "message": "更新成功"})
}

func handleCategoryDelete(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := cmssvc.NewCategoryService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("分类ID(id)必填")
	}
	if err := svc.Delete(ctx, id); err != nil {
		return resultError(fmt.Sprintf("删除分类失败: %v", err))
	}
	return resultText(map[string]interface{}{"message": "已删除"})
}

// ── 标签 ──

func registerTagTools(s *server.MCPServer) {
	s.AddTool(
		mcp.NewTool("cms_tag_list",
			mcp.WithDescription("查询CMS标签列表(全部)"),
		),
		handleTagList,
	)

	s.AddTool(
		mcp.NewTool("cms_tag_create",
			mcp.WithDescription("创建CMS标签"),
			mcp.WithString("name", mcp.Required(), mcp.Description("标签名称")),
			mcp.WithString("slug", mcp.Description("URL别名")),
			mcp.WithNumber("sort", mcp.Description("排序值")),
		),
		handleTagCreate,
	)

	s.AddTool(
		mcp.NewTool("cms_tag_update",
			mcp.WithDescription("更新CMS标签"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("标签ID")),
			mcp.WithString("name", mcp.Required(), mcp.Description("标签名称")),
			mcp.WithString("slug", mcp.Description("URL别名")),
			mcp.WithNumber("sort", mcp.Description("排序值")),
		),
		handleTagUpdate,
	)

	s.AddTool(
		mcp.NewTool("cms_tag_delete",
			mcp.WithDescription("删除CMS标签"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("标签ID")),
		),
		handleTagDelete,
	)
}

func handleTagList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := cmssvc.NewTagService()
	list, err := svc.ListAll(ctx)
	if err != nil {
		return resultError(fmt.Sprintf("查询标签失败: %v", err))
	}
	return resultText(list)
}

func handleTagCreate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := cmssvc.NewTagService()
	name := req.GetString("name", "")
	if name == "" {
		return resultError("标签名称(name)必填")
	}
	status := cmsmodel.StatusEnabled
	err := svc.Create(ctx, &cmssvc.CreateTagRequest{
		Name:   name,
		Slug:   req.GetString("slug", ""),
		Sort:   int(req.GetFloat("sort", 0)),
		Status: &status,
	})
	if err != nil {
		return resultError(fmt.Sprintf("创建标签失败: %v", err))
	}
	return resultText(map[string]interface{}{"message": "标签已创建"})
}

func handleTagUpdate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := cmssvc.NewTagService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("标签ID(id)必填")
	}
	name := req.GetString("name", "")
	if name == "" {
		return resultError("标签名称(name)必填")
	}
	status := cmsmodel.StatusEnabled
	err := svc.Update(ctx, id, &cmssvc.UpdateTagRequest{
		Name:   name,
		Slug:   req.GetString("slug", ""),
		Sort:   int(req.GetFloat("sort", 0)),
		Status: &status,
	})
	if err != nil {
		return resultError(fmt.Sprintf("更新标签失败: %v", err))
	}
	return resultText(map[string]interface{}{"id": id, "message": "更新成功"})
}

func handleTagDelete(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := cmssvc.NewTagService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("标签ID(id)必填")
	}
	if err := svc.Delete(ctx, id); err != nil {
		return resultError(fmt.Sprintf("删除标签失败: %v", err))
	}
	return resultText(map[string]interface{}{"message": "已删除"})
}

// ── 单页 ──

func registerPageTools(s *server.MCPServer) {
	s.AddTool(
		mcp.NewTool("cms_page_list",
			mcp.WithDescription("查询CMS单页列表"),
			mcp.WithNumber("page", mcp.Description("页码(默认1)")),
			mcp.WithNumber("page_size", mcp.Description("每页条数(默认20)")),
		),
		handlePageList,
	)

	s.AddTool(
		mcp.NewTool("cms_page_get",
			mcp.WithDescription("查询CMS单页详情(含正文)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("单页ID")),
		),
		handlePageGet,
	)

	s.AddTool(
		mcp.NewTool("cms_page_create",
			mcp.WithDescription("创建CMS单页(正文为Markdown格式)"),
			mcp.WithString("title", mcp.Required(), mcp.Description("页面标题")),
			mcp.WithString("slug", mcp.Required(), mcp.Description("URL别名(如 about-us)")),
			mcp.WithString("content", mcp.Description("正文(Markdown格式)")),
			mcp.WithString("link_type", mcp.Description("page内部页/link外部链接(默认page)")),
			mcp.WithString("external_url", mcp.Description("外部链接URL(link_type=link时使用)")),
			mcp.WithNumber("sort", mcp.Description("排序值")),
		),
		handlePageCreate,
	)

	s.AddTool(
		mcp.NewTool("cms_page_update",
			mcp.WithDescription("更新CMS单页"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("单页ID")),
			mcp.WithString("title", mcp.Description("页面标题")),
			mcp.WithString("slug", mcp.Description("URL别名")),
			mcp.WithString("content", mcp.Description("正文")),
			mcp.WithString("link_type", mcp.Description("page/link")),
			mcp.WithString("external_url", mcp.Description("外部链接URL")),
			mcp.WithNumber("sort", mcp.Description("排序值")),
		),
		handlePageUpdate,
	)

	s.AddTool(
		mcp.NewTool("cms_page_delete",
			mcp.WithDescription("删除CMS单页"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("单页ID")),
		),
		handlePageDelete,
	)
}

func handlePageList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := cmssvc.NewPageService()
	page := int(req.GetFloat("page", 1))
	pageSize := int(req.GetFloat("page_size", 20))
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 || pageSize > 100 {
		pageSize = 20
	}
	list, total, err := svc.List(ctx, page, pageSize, "")
	if err != nil {
		return resultError(fmt.Sprintf("查询单页失败: %v", err))
	}
	return resultText(map[string]interface{}{"list": list, "total": total, "page": page, "size": pageSize})
}

func handlePageGet(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := cmssvc.NewPageService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("单页ID(id)必填")
	}
	page, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("查询单页失败: %v", err))
	}
	return resultText(page)
}

func handlePageCreate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := cmssvc.NewPageService()
	title := req.GetString("title", "")
	slug := req.GetString("slug", "")
	if title == "" || slug == "" {
		return resultError("标题(title)和别名(slug)必填")
	}
	status := cmsmodel.StatusEnabled
	linkType := req.GetString("link_type", "page")
	err := svc.Create(ctx, &cmssvc.CreatePageRequest{
		Title:       title,
		Slug:        slug,
		LinkType:    linkType,
		ExternalURL: req.GetString("external_url", ""),
		Content:     req.GetString("content", ""),
		Status:      &status,
		Sort:        int(req.GetFloat("sort", 0)),
	})
	if err != nil {
		return resultError(fmt.Sprintf("创建单页失败: %v", err))
	}
	return resultText(map[string]interface{}{"message": "单页已创建"})
}

func handlePageUpdate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := cmssvc.NewPageService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("单页ID(id)必填")
	}
	// 先读现有值
	existing, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("单页不存在: %v", err))
	}
	status := cmsmodel.StatusEnabled
	err = svc.Update(ctx, id, &cmssvc.UpdatePageRequest{
		Title:       getStringOr(req, "title", existing.Title),
		Slug:        getStringOr(req, "slug", existing.Slug),
		LinkType:    getStringOr(req, "link_type", existing.LinkType),
		ExternalURL: getStringOr(req, "external_url", existing.ExternalURL),
		Content:     getStringOr(req, "content", existing.Content),
		Status:      &status,
		Sort:        int(getUintOr(req, "sort", uint(existing.Sort))),
	})
	if err != nil {
		return resultError(fmt.Sprintf("更新单页失败: %v", err))
	}
	return resultText(map[string]interface{}{"id": id, "message": "更新成功"})
}

func handlePageDelete(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := cmssvc.NewPageService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("单页ID(id)必填")
	}
	if err := svc.Delete(ctx, id); err != nil {
		return resultError(fmt.Sprintf("删除单页失败: %v", err))
	}
	return resultText(map[string]interface{}{"message": "已删除"})
}
