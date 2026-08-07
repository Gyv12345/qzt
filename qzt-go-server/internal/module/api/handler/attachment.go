package handler

import (
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"slices"

	"qzt-go-server/internal/middleware"
	"qzt-go-server/internal/model"
	"qzt-go-server/internal/module/api/service"
	"qzt-go-server/internal/module/system/errcode"
	response "qzt-go-server/pkg/xresponse"
)

// attachment.go 通用附件元数据 handler。
// 文件上传走 /api/upload(或 /api/upload/sts 直传),本接口只负责附件记录的 CRUD。

// AttachmentHandler 附件元数据 handler。
type AttachmentHandler struct {
	svc *service.AttachmentService
}

func NewAttachmentHandler() *AttachmentHandler {
	return &AttachmentHandler{svc: service.NewAttachmentService()}
}

// List 查询某业务实体的附件列表。
// @Summary      附件列表
// @Description  按 biz_type + resource_id 查询附件列表
// @Tags         附件
// @Produce      json
// @Security     BearerAuth
// @Param        biz_type     query  string  true  "业务类型,如 CUSTOMER/CONTRACT"
// @Param        resource_id  query  int     true  "资源ID"
// @Success      200  {object}  xresponse.Response
// @Router       /api/attachments [get]
func (h *AttachmentHandler) List(c *gin.Context) {
	bizType := strings.TrimSpace(c.Query("biz_type"))
	resourceID, err := strconv.ParseUint(c.Query("resource_id"), 10, 64)
	if err != nil || resourceID == 0 {
		response.Fail(c, errcode.ErrParam, "resource_id 必填且为正整数")
		return
	}
	if bizType == "" {
		response.Fail(c, errcode.ErrParam, "biz_type 必填")
		return
	}

	list, err := h.svc.List(c.Request.Context(), bizType, uint(resourceID))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, list)
}

// Create 创建附件记录(前端上传成功后调用,把文件信息与业务实体关联)。
// @Summary      创建附件记录
// @Description  前端先上传文件(/api/upload 或 /api/upload/sts),再调本接口落库附件元数据
// @Tags         附件
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body  service.CreateAttachmentRequest  true  "附件信息"
// @Success      200  {object}  xresponse.Response
// @Router       /api/attachments [post]
func (h *AttachmentHandler) Create(c *gin.Context) {
	var req service.CreateAttachmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	att, err := h.svc.Create(c.Request.Context(), &req, middleware.GetUserID(c))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, att)
}

// Delete 删除附件记录(仅上传人或超管)。
// @Summary      删除附件记录
// @Description  软删除附件记录。仅上传人或超级管理员可删除。注意:不删除存储层实际文件。
// @Tags         附件
// @Produce      json
// @Security     BearerAuth
// @Param        id  path  int  true  "附件ID"
// @Success      200  {object}  xresponse.Response
// @Router       /api/attachments/{id} [delete]
func (h *AttachmentHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil || id == 0 {
		response.Fail(c, errcode.ErrParam, "id 无效")
		return
	}
	isSuperAdmin := slices.Contains(middleware.GetRoleCodes(c), model.SuperAdminRoleCode)
	if err := h.svc.Delete(c.Request.Context(), uint(id), middleware.GetUserID(c), isSuperAdmin); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}
