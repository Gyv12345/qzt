package mcp

import (
	"context"
	"fmt"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"

	cloudsvc "qzt-go-server/internal/module/cloud/service"
	"qzt-go-server/internal/pkg/datascope"
)

// tools_cloud.go 网盘(cloud)模块 MCP tools(文件列表/用量/文件夹/文件/重命名/删除)。

func registerCloudTools(s *server.MCPServer) {
	s.AddTool(
		mcp.NewTool("cloud_file_list",
			mcp.WithDescription("查询网盘文件列表"),
			mcp.WithNumber("parent_id", mcp.Description("文件夹ID(0=根,默认0)")),
			mcp.WithString("scope", mcp.Description("空间(personal/dept/public,默认 personal)")),
		),
		handleCloudFileList,
	)

	s.AddTool(
		mcp.NewTool("cloud_usage",
			mcp.WithDescription("查询个人空间用量"),
		),
		handleCloudUsage,
	)

	s.AddTool(
		mcp.NewTool("cloud_folder_create",
			mcp.WithDescription("新建文件夹"),
			mcp.WithString("name", mcp.Required(), mcp.Description("文件夹名称")),
			mcp.WithNumber("parent_id", mcp.Description("父文件夹ID(0=根)")),
			mcp.WithString("scope", mcp.Description("空间(personal/dept/public,默认 personal)")),
		),
		handleCloudFolderCreate,
	)

	s.AddTool(
		mcp.NewTool("cloud_file_create",
			mcp.WithDescription("创建文件记录(上传走已有上传接口,此处只存元数据)"),
			mcp.WithString("name", mcp.Required(), mcp.Description("文件名称")),
			mcp.WithNumber("parent_id", mcp.Description("父文件夹ID(0=根)")),
			mcp.WithString("object_key", mcp.Description("对象存储 key")),
			mcp.WithString("url", mcp.Description("文件访问 URL")),
			mcp.WithNumber("size", mcp.Description("文件大小(字节)")),
			mcp.WithString("content_type", mcp.Description("MIME 类型")),
			mcp.WithString("scope", mcp.Description("空间(personal/dept/public,默认 personal)")),
		),
		handleCloudFileCreate,
	)

	s.AddTool(
		mcp.NewTool("cloud_file_update",
			mcp.WithDescription("重命名/移动文件(未传字段保留原值)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("文件ID")),
			mcp.WithString("name", mcp.Description("新文件名")),
			mcp.WithNumber("parent_id", mcp.Description("目标父文件夹ID(移动)")),
		),
		handleCloudFileUpdate,
	)

	s.AddTool(
		mcp.NewTool("cloud_file_delete",
			mcp.WithDescription("删除文件(文件夹递归删除)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("文件ID")),
		),
		handleCloudFileDelete,
	)
}

// ── handlers ──

func handleCloudFileList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := cloudsvc.NewCloudService()
	_, deptID, userID := datascope.GetScope(ctx)
	scope := req.GetString("scope", "personal")
	parentID := uint(req.GetFloat("parent_id", 0))
	list, err := svc.List(ctx, parentID, scope, userID, deptID)
	if err != nil {
		return resultError(fmt.Sprintf("查询文件列表失败: %v", err))
	}
	return resultText(map[string]any{"list": list})
}

func handleCloudUsage(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := cloudsvc.NewCloudService()
	used, err := svc.GetUsage(ctx, userIDFromContext(ctx))
	if err != nil {
		return resultError(fmt.Sprintf("查询用量失败: %v", err))
	}
	return resultText(map[string]any{"used": used})
}

func handleCloudFolderCreate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := cloudsvc.NewCloudService()
	name := req.GetString("name", "")
	if name == "" {
		return resultError("文件夹名称(name)必填")
	}
	_, deptID, userID := datascope.GetScope(ctx)
	folder, err := svc.CreateFolder(ctx, &cloudsvc.CreateFolderRequest{
		ParentID: uint(req.GetFloat("parent_id", 0)),
		Name:     name,
		Scope:    req.GetString("scope", ""),
	}, userID, deptID)
	if err != nil {
		return resultError(fmt.Sprintf("新建文件夹失败: %v", err))
	}
	return resultText(folder)
}

func handleCloudFileCreate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := cloudsvc.NewCloudService()
	name := req.GetString("name", "")
	if name == "" {
		return resultError("文件名称(name)必填")
	}
	_, deptID, userID := datascope.GetScope(ctx)
	file, err := svc.CreateFile(ctx, &cloudsvc.CreateFileRequest{
		ParentID:    uint(req.GetFloat("parent_id", 0)),
		Name:        name,
		ObjectKey:   req.GetString("object_key", ""),
		URL:         req.GetString("url", ""),
		Size:        int64(req.GetFloat("size", 0)),
		ContentType: req.GetString("content_type", ""),
		Scope:       req.GetString("scope", ""),
	}, userID, deptID)
	if err != nil {
		return resultError(fmt.Sprintf("创建文件失败: %v", err))
	}
	return resultText(file)
}

func handleCloudFileUpdate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := cloudsvc.NewCloudService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("文件ID(id)必填")
	}
	// service 层 Update 已是增量:name 为空跳过,parent_id=0 跳过
	if err := svc.Update(ctx, id, &cloudsvc.UpdateFileRequest{
		Name:     req.GetString("name", ""),
		ParentID: uint(req.GetFloat("parent_id", 0)),
	}, userIDFromContext(ctx)); err != nil {
		return resultError(fmt.Sprintf("更新文件失败: %v", err))
	}
	return resultText(map[string]any{"message": "文件已更新", "id": id})
}

func handleCloudFileDelete(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := cloudsvc.NewCloudService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("文件ID(id)必填")
	}
	if err := svc.Delete(ctx, id, userIDFromContext(ctx)); err != nil {
		return resultError(fmt.Sprintf("删除文件失败: %v", err))
	}
	return resultText(map[string]any{"message": "文件已删除", "id": id})
}
