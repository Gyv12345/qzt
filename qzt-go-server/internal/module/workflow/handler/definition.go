// handler/definition.go 自动化工作流定义 handler(P27)。
package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/middleware"
	wfmodel "qzt-go-server/internal/model/workflow"
	"qzt-go-server/internal/module/system/errcode"
	wfsvc "qzt-go-server/internal/module/workflow/service"
	response "qzt-go-server/pkg/xresponse"
)

// DefinitionHandler 工作流定义管理。
type DefinitionHandler struct {
	svc *wfsvc.DefinitionService
}

func NewDefinitionHandler() *DefinitionHandler {
	return &DefinitionHandler{svc: wfsvc.NewDefinitionService()}
}

// List 工作流列表
// @Summary  工作流列表
// @Tags     工作流
// @Produce  json
// @Success  200  {object}  xresponse.Response
// @Router   /workflow/definitions [get]
func (h *DefinitionHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	enabled := int8(-1)
	if s := c.Query("enabled"); s != "" {
		if n, err := strconv.Atoi(s); err == nil {
			enabled = int8(n)
		}
	}
	list, total, err := h.svc.List(c.Request.Context(), page, pageSize, c.Query("keyword"), c.Query("trigger_type"), enabled)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}

// Create 新增工作流
// @Summary  新增工作流
// @Tags     工作流
// @Accept   json
// @Produce  json
// @Success  200  {object}  xresponse.Response
// @Router   /workflow/definitions [post]
func (h *DefinitionHandler) Create(c *gin.Context) {
	var req wfsvc.DefinitionUpsertRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	m, err := h.svc.Create(c.Request.Context(), middleware.GetUserID(c), &req)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, m)
}

// Get 工作流详情
// @Summary  工作流详情
// @Tags     工作流
// @Produce  json
// @Success  200  {object}  xresponse.Response
// @Router   /workflow/definitions/:id [get]
func (h *DefinitionHandler) Get(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	m, err := h.svc.Get(c.Request.Context(), uint(id))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, m)
}

// Update 编辑工作流
// @Summary  编辑工作流
// @Tags     工作流
// @Accept   json
// @Produce  json
// @Success  200  {object}  xresponse.Response
// @Router   /workflow/definitions/:id [put]
func (h *DefinitionHandler) Update(c *gin.Context) {
	var req wfsvc.DefinitionUpsertRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	req.ID = uint(id)
	if err := h.svc.Update(c.Request.Context(), &req); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// Delete 删除工作流
// @Summary  删除工作流
// @Tags     工作流
// @Produce  json
// @Success  200  {object}  xresponse.Response
// @Router   /workflow/definitions/:id [delete]
func (h *DefinitionHandler) Delete(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	if err := h.svc.Delete(c.Request.Context(), uint(id)); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// Enable 启停工作流
// @Summary  启停工作流
// @Tags     工作流
// @Accept   json
// @Produce  json
// @Success  200  {object}  xresponse.Response
// @Router   /workflow/definitions/:id/enable [put]
func (h *DefinitionHandler) Enable(c *gin.Context) {
	var req struct {
		Enabled int8 `json:"enabled"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	if err := h.svc.Enable(c.Request.Context(), uint(id), req.Enabled); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// Run 手动运行工作流
// @Summary  手动运行工作流
// @Tags     工作流
// @Accept   json
// @Produce  json
// @Success  200  {object}  xresponse.Response
// @Router   /workflow/definitions/:id/run [post]
func (h *DefinitionHandler) Run(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	run, err := wfsvc.DefaultEngine().RunDefinition(c.Request.Context(), uint(id),
		wfmodel.TriggerManual, map[string]any{
			"triggered_by": middleware.GetUserID(c),
		})
	if err != nil {
		// 运行失败也返回 run 记录(前端展示节点轨迹),以业务错误码区分
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, run)
}
