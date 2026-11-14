package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/module/system/errcode"
	"qzt-go-server/internal/module/system/service"
	"qzt-go-server/internal/pkg/pagination"
	response "qzt-go-server/pkg/xresponse"
)

// StorageConfigHandler 文件存储配置管理(系统管理-文件存储页)。
// 写操作(保存/删除/启用/测试)在演示模式下被 DemoSystemWriteGuard 冻结(路由层已挂)。
type StorageConfigHandler struct {
	svc *service.StorageConfigService
}

func NewStorageConfigHandler() *StorageConfigHandler {
	return &StorageConfigHandler{svc: service.NewStorageConfigService()}
}

// List 存储配置列表
// @Summary      存储配置列表
// @Description  全部存储配置(local/oss/s3),密钥字段脱敏只回尾4位
// @Tags         文件存储
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object}  xresponse.Response{data=[]service.StorageConfigItem}
// @Router       /system/storage/configs [get]
func (h *StorageConfigHandler) List(c *gin.Context) {
	list, err := h.svc.List(c.Request.Context())
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, list)
}

// Create 新建存储配置
// @Summary      新建存储配置
// @Description  按驱动校验必填参数;不自动激活;密钥传脱敏值(****开头)按未填处理
// @Tags         文件存储
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body      service.SaveStorageConfigRequest  true  "配置参数"
// @Success      200   {object}  xresponse.Response{data=service.StorageConfigItem}
// @Router       /system/storage/configs [post]
func (h *StorageConfigHandler) Create(c *gin.Context) {
	var req service.SaveStorageConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	item, err := h.svc.Create(c.Request.Context(), &req)
	if err != nil {
		response.Fail(c, errcode.ErrParam, err.Error())
		return
	}
	response.OK(c, item)
}

// Update 更新存储配置
// @Summary      更新存储配置
// @Description  密钥字段传脱敏值(****开头)保留原值不覆盖;不改动生效状态
// @Tags         文件存储
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id    path      int                               true  "配置ID"
// @Param        body  body      service.SaveStorageConfigRequest  true  "配置参数"
// @Success      200   {object}  xresponse.Response
// @Router       /system/storage/configs/{id} [put]
func (h *StorageConfigHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	var req service.SaveStorageConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	if err := h.svc.Update(c.Request.Context(), uint(id), &req); err != nil {
		response.Fail(c, errcode.ErrParam, err.Error())
		return
	}
	response.OK(c, nil)
}

// Delete 删除存储配置
// @Summary      删除存储配置
// @Description  当前生效(is_active=1)的配置拒绝删除
// @Tags         文件存储
// @Produce      json
// @Security     BearerAuth
// @Param        id  path      int  true  "配置ID"
// @Success      200  {object}  xresponse.Response
// @Router       /system/storage/configs/{id} [delete]
func (h *StorageConfigHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	if err := h.svc.Delete(c.Request.Context(), uint(id)); err != nil {
		response.Fail(c, errcode.ErrParam, err.Error())
		return
	}
	response.OK(c, nil)
}

// Activate 启用存储配置
// @Summary      启用存储配置(热切换)
// @Description  事务内切换生效标记,新驱动构建成功才提交;成功后全局存储即时热切换,失败回滚并报错
// @Tags         文件存储
// @Produce      json
// @Security     BearerAuth
// @Param        id  path      int  true  "配置ID"
// @Success      200  {object}  xresponse.Response
// @Router       /system/storage/configs/{id}/activate [post]
func (h *StorageConfigHandler) Activate(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	if err := h.svc.Activate(c.Request.Context(), uint(id)); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// Test 测试存储配置连接
// @Summary      测试存储配置连接
// @Description  构建对应驱动并探测(oss/s3 探测桶可达性,local 建目录);不激活不影响当前生效配置
// @Tags         文件存储
// @Produce      json
// @Security     BearerAuth
// @Param        id  path      int  true  "配置ID"
// @Success      200  {object}  xresponse.Response
// @Router       /system/storage/configs/{id}/test [post]
func (h *StorageConfigHandler) Test(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	if err := h.svc.Test(c.Request.Context(), uint(id)); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// ListFiles 存储文件列表
// @Summary      存储文件列表(全量)
// @Description  管理员视角列出网盘全部文件(跨用户,联 sys_user 带上传人昵称);每行带下载地址(公共直链或私有短期签名URL);keyword 模糊匹配文件名
// @Tags         文件存储
// @Produce      json
// @Security     BearerAuth
// @Param        keyword    query  string  false  "文件名关键词"
// @Param        page       query  int     false  "页码(默认1)"
// @Param        page_size  query  int     false  "每页条数(默认10,最大100)"
// @Success      200  {object}  xresponse.Response
// @Router       /system/storage/files [get]
func (h *StorageConfigHandler) ListFiles(c *gin.Context) {
	p := pagination.GetPagination(c)
	keyword := c.Query("keyword")
	list, total, err := h.svc.ListFiles(c.Request.Context(), keyword, p.Page, p.PageSize)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total, "page": p.Page, "page_size": p.PageSize})
}
