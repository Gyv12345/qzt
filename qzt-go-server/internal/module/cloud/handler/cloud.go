package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/middleware"
	"qzt-go-server/internal/module/cloud/service"
	"qzt-go-server/internal/module/system/errcode"
	"qzt-go-server/internal/pkg/datascope"
	response "qzt-go-server/pkg/xresponse"
)

type CloudHandler struct {
	svc *service.CloudService
}

func NewCloudHandler() *CloudHandler { return &CloudHandler{svc: service.NewCloudService()} }

// List 文件列表
// @Summary      网盘文件列表
// @Tags         网盘
// @Produce      json
// @Security     BearerAuth
// @Param        parent_id  query  int     false  "文件夹ID(0=根)"
// @Param        scope      query  string  false  "空间(personal/dept/public)"
// @Success      200  {object}  xresponse.Response
// @Router       /cloud/files [get]
func (h *CloudHandler) List(c *gin.Context) {
	parentID, _ := strconv.ParseUint(c.DefaultQuery("parent_id", "0"), 10, 64)
	scope := c.DefaultQuery("scope", "personal")
	userID := middleware.GetUserID(c)
	deptID, _ := c.Get(datascope.CtxDeptIDKey)
	deptIDUint, _ := deptID.(uint)
	list, err := h.svc.List(c.Request.Context(), uint(parentID), scope, userID, deptIDUint)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list})
}

// CreateFolder 新建文件夹
// @Summary      新建文件夹
// @Tags         网盘
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body  service.CreateFolderRequest  true  "文件夹"
// @Success      200  {object}  xresponse.Response
// @Router       /cloud/folders [post]
func (h *CloudHandler) CreateFolder(c *gin.Context) {
	var req service.CreateFolderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	userID := middleware.GetUserID(c)
	deptID, _ := c.Get(datascope.CtxDeptIDKey)
	deptIDUint, _ := deptID.(uint)
	folder, err := h.svc.CreateFolder(c.Request.Context(), &req, userID, deptIDUint)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, folder)
}

// CreateFile 上传文件(创建文件记录)
// @Summary      上传文件
// @Tags         网盘
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body  service.CreateFileRequest  true  "文件"
// @Success      200  {object}  xresponse.Response
// @Router       /cloud/files [post]
func (h *CloudHandler) CreateFile(c *gin.Context) {
	var req service.CreateFileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	userID := middleware.GetUserID(c)
	deptID, _ := c.Get(datascope.CtxDeptIDKey)
	deptIDUint, _ := deptID.(uint)
	file, err := h.svc.CreateFile(c.Request.Context(), &req, userID, deptIDUint)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, file)
}

// Update 重命名/移动
// @Summary      重命名/移动文件
// @Tags         网盘
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id    path  int  true  "文件ID"
// @Param        body  body  service.UpdateFileRequest  true  "更新"
// @Success      200  {object}  xresponse.Response
// @Router       /cloud/files/{id} [put]
func (h *CloudHandler) Update(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	var req service.UpdateFileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	userID := middleware.GetUserID(c)
	if err := h.svc.Update(c.Request.Context(), uint(id), &req, userID); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// Delete 删除文件
// @Summary      删除文件
// @Tags         网盘
// @Produce      json
// @Security     BearerAuth
// @Param        id  path  int  true  "文件ID"
// @Success      200  {object}  xresponse.Response
// @Router       /cloud/files/{id} [delete]
func (h *CloudHandler) Delete(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	userID := middleware.GetUserID(c)
	if err := h.svc.Delete(c.Request.Context(), uint(id), userID); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// Usage 个人空间用量
// @Summary      个人空间用量
// @Tags         网盘
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object}  xresponse.Response
// @Router       /cloud/usage [get]
func (h *CloudHandler) Usage(c *gin.Context) {
	userID := middleware.GetUserID(c)
	usage, err := h.svc.GetUsage(c.Request.Context(), userID)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"used": usage})
}
