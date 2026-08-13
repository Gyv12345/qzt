package mcp

import (
	"context"
	"fmt"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"

	kbsvc "qzt-go-server/internal/module/kb/service"
)

// tools_kb.go 知识库(kb)模块 MCP tools(分类/文档/版本,不含 WebSocket 协同编辑)。

func registerKbTools(s *server.MCPServer) {
	// ── 分类 ──
	s.AddTool(
		mcp.NewTool("kb_category_list",
			mcp.WithDescription("查询知识库分类列表"),
		),
		handleKbCategoryList,
	)

	s.AddTool(
		mcp.NewTool("kb_category_create",
			mcp.WithDescription("创建知识库分类"),
			mcp.WithString("name", mcp.Required(), mcp.Description("分类名称")),
			mcp.WithNumber("parent_id", mcp.Description("父分类ID(顶级填0或不传)")),
			mcp.WithNumber("sort", mcp.Description("排序值(默认0)")),
		),
		handleKbCategoryCreate,
	)

	s.AddTool(
		mcp.NewTool("kb_category_update",
			mcp.WithDescription("更新知识库分类(未传字段保留原值)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("分类ID")),
			mcp.WithString("name", mcp.Description("分类名称")),
			mcp.WithNumber("parent_id", mcp.Description("父分类ID")),
			mcp.WithNumber("sort", mcp.Description("排序值")),
		),
		handleKbCategoryUpdate,
	)

	s.AddTool(
		mcp.NewTool("kb_category_delete",
			mcp.WithDescription("删除知识库分类"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("分类ID")),
		),
		handleKbCategoryDelete,
	)

	// ── 文档 ──
	s.AddTool(
		mcp.NewTool("kb_document_list",
			mcp.WithDescription("查询知识库文档列表"),
			mcp.WithNumber("category_id", mcp.Description("分类ID筛选")),
			mcp.WithString("keyword", mcp.Description("标题关键词")),
			mcp.WithString("status", mcp.Description("状态筛选(如 draft/published)")),
			mcp.WithNumber("page", mcp.Description("页码(默认1)")),
			mcp.WithNumber("page_size", mcp.Description("每页条数(默认20)")),
		),
		handleKbDocumentList,
	)

	s.AddTool(
		mcp.NewTool("kb_document_get",
			mcp.WithDescription("查询知识库文档详情"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("文档ID")),
		),
		handleKbDocumentGet,
	)

	s.AddTool(
		mcp.NewTool("kb_document_create",
			mcp.WithDescription("创建知识库文档"),
			mcp.WithString("title", mcp.Required(), mcp.Description("文档标题")),
			mcp.WithNumber("category_id", mcp.Description("所属分类ID")),
			mcp.WithString("content", mcp.Description("文档正文")),
			mcp.WithString("status", mcp.Description("状态(默认 draft,如 published)")),
		),
		handleKbDocumentCreate,
	)

	s.AddTool(
		mcp.NewTool("kb_document_update",
			mcp.WithDescription("编辑知识库文档(未传字段保留原值)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("文档ID")),
			mcp.WithString("title", mcp.Description("文档标题")),
			mcp.WithNumber("category_id", mcp.Description("所属分类ID")),
			mcp.WithString("content", mcp.Description("文档正文")),
			mcp.WithString("status", mcp.Description("状态(如 draft/published)")),
		),
		handleKbDocumentUpdate,
	)

	s.AddTool(
		mcp.NewTool("kb_document_delete",
			mcp.WithDescription("删除知识库文档"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("文档ID")),
		),
		handleKbDocumentDelete,
	)

	// ── 版本 ──
	s.AddTool(
		mcp.NewTool("kb_document_versions",
			mcp.WithDescription("查询知识库文档版本历史"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("文档ID")),
			mcp.WithNumber("page", mcp.Description("页码(默认1)")),
			mcp.WithNumber("page_size", mcp.Description("每页条数(默认20)")),
		),
		handleKbDocumentVersions,
	)

	s.AddTool(
		mcp.NewTool("kb_document_restore",
			mcp.WithDescription("恢复知识库文档的历史版本"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("文档ID")),
			mcp.WithNumber("version_id", mcp.Required(), mcp.Description("版本ID")),
		),
		handleKbDocumentRestore,
	)
}

// ── 分类 handlers ──

func handleKbCategoryList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := kbsvc.NewCategoryService()
	list, err := svc.ListAll(ctx)
	if err != nil {
		return resultError(fmt.Sprintf("查询分类列表失败: %v", err))
	}
	return resultText(list)
}

func handleKbCategoryCreate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := kbsvc.NewCategoryService()
	name := req.GetString("name", "")
	if name == "" {
		return resultError("分类名称(name)必填")
	}
	cat, err := svc.Create(ctx, &kbsvc.CreateKbCategoryRequest{
		ParentID: uint(req.GetFloat("parent_id", 0)),
		Name:     name,
		Sort:     int(req.GetFloat("sort", 0)),
	}, userIDFromContext(ctx))
	if err != nil {
		return resultError(fmt.Sprintf("创建分类失败: %v", err))
	}
	return resultText(cat)
}

func handleKbCategoryUpdate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := kbsvc.NewCategoryService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("分类ID(id)必填")
	}
	// 半增量:分类 service 无 GetByID,用 ListAll 查找旧值
	list, err := svc.ListAll(ctx)
	if err != nil {
		return resultError(fmt.Sprintf("读取分类失败: %v", err))
	}
	var parentID uint
	var name string
	var sort int
	found := false
	for i := range list {
		if list[i].ID == id {
			parentID = list[i].ParentID
			name = list[i].Name
			sort = list[i].Sort
			found = true
			break
		}
	}
	if !found {
		return resultError("分类不存在")
	}
	name = req.GetString("name", name)
	if name == "" {
		return resultError("分类名称(name)不能为空")
	}
	if err := svc.Update(ctx, id, &kbsvc.CreateKbCategoryRequest{
		ParentID: uint(req.GetFloat("parent_id", float64(parentID))),
		Name:     name,
		Sort:     int(req.GetFloat("sort", float64(sort))),
	}); err != nil {
		return resultError(fmt.Sprintf("更新分类失败: %v", err))
	}
	return resultText(map[string]any{"message": "分类已更新", "id": id})
}

func handleKbCategoryDelete(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := kbsvc.NewCategoryService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("分类ID(id)必填")
	}
	if err := svc.Delete(ctx, id); err != nil {
		return resultError(fmt.Sprintf("删除分类失败: %v", err))
	}
	return resultText(map[string]any{"message": "分类已删除", "id": id})
}

// ── 文档 handlers ──

func handleKbDocumentList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := kbsvc.NewDocumentService()
	page, pageSize := mcpPage(req)
	list, total, err := svc.List(ctx, page, pageSize,
		uint(req.GetFloat("category_id", 0)),
		req.GetString("keyword", ""),
		req.GetString("status", ""),
	)
	if err != nil {
		return resultError(fmt.Sprintf("查询文档列表失败: %v", err))
	}
	return resultText(map[string]any{"list": list, "total": total, "page": page, "size": pageSize})
}

func handleKbDocumentGet(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := kbsvc.NewDocumentService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("文档ID(id)必填")
	}
	doc, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("查询文档失败: %v", err))
	}
	return resultText(doc)
}

func handleKbDocumentCreate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := kbsvc.NewDocumentService()
	title := req.GetString("title", "")
	if title == "" {
		return resultError("文档标题(title)必填")
	}
	doc, err := svc.Create(ctx, &kbsvc.CreateDocumentRequest{
		CategoryID: uint(req.GetFloat("category_id", 0)),
		Title:      title,
		Content:    req.GetString("content", ""),
		Status:     req.GetString("status", ""),
	}, userIDFromContext(ctx))
	if err != nil {
		return resultError(fmt.Sprintf("创建文档失败: %v", err))
	}
	return resultText(doc)
}

func handleKbDocumentUpdate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := kbsvc.NewDocumentService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("文档ID(id)必填")
	}
	// 半增量:先读旧值
	existing, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("文档不存在: %v", err))
	}
	title := req.GetString("title", existing.Title)
	if title == "" {
		return resultError("文档标题(title)不能为空")
	}
	if err := svc.Update(ctx, id, &kbsvc.UpdateDocumentRequest{
		CategoryID: uint(req.GetFloat("category_id", float64(existing.CategoryID))),
		Title:      title,
		Content:    req.GetString("content", existing.Content),
		Status:     req.GetString("status", existing.Status),
	}, userIDFromContext(ctx)); err != nil {
		return resultError(fmt.Sprintf("更新文档失败: %v", err))
	}
	return resultText(map[string]any{"message": "文档已更新", "id": id})
}

func handleKbDocumentDelete(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := kbsvc.NewDocumentService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("文档ID(id)必填")
	}
	if err := svc.Delete(ctx, id); err != nil {
		return resultError(fmt.Sprintf("删除文档失败: %v", err))
	}
	return resultText(map[string]any{"message": "文档已删除", "id": id})
}

// ── 版本 handlers ──

func handleKbDocumentVersions(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := kbsvc.NewVersionService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("文档ID(id)必填")
	}
	page, pageSize := mcpPage(req)
	list, total, err := svc.ListVersions(ctx, id, page, pageSize)
	if err != nil {
		return resultError(fmt.Sprintf("查询版本历史失败: %v", err))
	}
	return resultText(map[string]any{"list": list, "total": total, "page": page, "size": pageSize})
}

func handleKbDocumentRestore(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := kbsvc.NewVersionService()
	docID := uint(req.GetFloat("id", 0))
	versionID := uint(req.GetFloat("version_id", 0))
	if docID == 0 {
		return resultError("文档ID(id)必填")
	}
	if versionID == 0 {
		return resultError("版本ID(version_id)必填")
	}
	if err := svc.Restore(ctx, docID, versionID, userIDFromContext(ctx)); err != nil {
		return resultError(fmt.Sprintf("恢复版本失败: %v", err))
	}
	return resultText(map[string]any{"message": "已恢复到指定版本", "document_id": docID, "version_id": versionID})
}
