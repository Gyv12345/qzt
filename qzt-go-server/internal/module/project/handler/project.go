package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/module/project/service"
	"qzt-go-server/internal/module/system/errcode"
	syservice "qzt-go-server/internal/module/system/service"
	response "qzt-go-server/pkg/xresponse"
)

// project.go 项目+任务 handler。

type ProjectHandler struct {
	svc *service.ProjectService
}

func NewProjectHandler() *ProjectHandler { return &ProjectHandler{svc: service.NewProjectService()} }

// ── 项目 ──

// List 项目列表
// @Summary      项目列表
// @Tags         项目管理
// @Produce      json
// @Security     BearerAuth
// @Param        page       query  int     false  "页码"
// @Param        page_size  query  int     false  "每页条数"
// @Param        keyword    query  string  false  "关键词"
// @Param        project_no query  string  false  "项目编号(模糊)"
// @Param        name       query  string  false  "项目名称(模糊)"
// @Param        status     query  int     false  "状态"
// @Param        priority   query  int     false  "优先级"
// @Param        manager_id query  int     false  "项目经理ID"
// @Success      200  {object}  xresponse.Response
// @Router       /project/projects [get]
// firstNonEmpty 返回第一个非空串(列表筛选参数兜底用)。
func firstNonEmpty(vals ...string) string {
	for _, v := range vals {
		if v != "" {
			return v
		}
	}
	return ""
}

func (h *ProjectHandler) List(c *gin.Context) {
	p := syservice.GetPagination(c)
	status, _ := strconv.Atoi(c.DefaultQuery("status", "0"))
	priority, _ := strconv.Atoi(c.DefaultQuery("priority", "0"))
	managerID, _ := strconv.ParseUint(c.Query("manager_id"), 10, 64)
	keyword := firstNonEmpty(c.Query("keyword"), c.Query("project_no"), c.Query("name"))
	list, total, err := h.svc.List(c.Request.Context(), p.Page, p.PageSize, keyword, int8(status), int8(priority), uint(managerID))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}

// GetByID 项目详情(含任务)
// @Summary      项目详情
// @Tags         项目管理
// @Produce      json
// @Security     BearerAuth
// @Param        id  path  int  true  "项目ID"
// @Success      200  {object}  xresponse.Response
// @Router       /project/projects/{id} [get]
func (h *ProjectHandler) GetByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	detail, err := h.svc.GetByID(c.Request.Context(), uint(id))
	if err != nil {
		response.Fail(c, errcode.ErrNotFound, err.Error())
		return
	}
	response.OK(c, detail)
}

// Create 新建项目
// @Summary      新建项目
// @Tags         项目管理
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body  service.CreateProjectRequest  true  "项目"
// @Success      200  {object}  xresponse.Response
// @Router       /project/projects [post]
func (h *ProjectHandler) Create(c *gin.Context) {
	var req service.CreateProjectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	p, err := h.svc.Create(c.Request.Context(), &req)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, p)
}

// Update 编辑项目
// @Summary      编辑项目
// @Tags         项目管理
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id    path  int  true  "项目ID"
// @Param        body  body  service.UpdateProjectRequest  true  "项目"
// @Success      200  {object}  xresponse.Response
// @Router       /project/projects/{id} [put]
func (h *ProjectHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	var req service.UpdateProjectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	if err := h.svc.Update(c.Request.Context(), uint(id), &req); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// Delete 删除项目
// @Summary      删除项目
// @Tags         项目管理
// @Produce      json
// @Security     BearerAuth
// @Param        id  path  int  true  "项目ID"
// @Success      200  {object}  xresponse.Response
// @Router       /project/projects/{id} [delete]
func (h *ProjectHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	if err := h.svc.Delete(c.Request.Context(), uint(id)); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// ── 任务 ──

// ListTasks 任务列表(按项目)
// @Summary      任务列表
// @Tags         项目管理
// @Produce      json
// @Security     BearerAuth
// @Param        project_id  query  int  true  "项目ID"
// @Success      200  {object}  xresponse.Response
// @Router       /project/tasks [get]
func (h *ProjectHandler) ListTasks(c *gin.Context) {
	projectID, err := strconv.ParseUint(c.Query("project_id"), 10, 64)
	if err != nil || projectID == 0 {
		response.Fail(c, errcode.ErrParam, "参数错误: project_id 必填")
		return
	}
	list, err := h.svc.ListTasks(c.Request.Context(), uint(projectID))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, list)
}

// CreateTask 新建任务
// @Summary      新建任务
// @Tags         项目管理
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body  service.CreateTaskRequest  true  "任务"
// @Success      200  {object}  xresponse.Response
// @Router       /project/tasks [post]
func (h *ProjectHandler) CreateTask(c *gin.Context) {
	var req service.CreateTaskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	t, err := h.svc.CreateTask(c.Request.Context(), &req)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, t)
}

// UpdateTask 编辑任务
// @Summary      编辑任务
// @Tags         项目管理
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id    path  int  true  "任务ID"
// @Param        body  body  service.UpdateTaskRequest  true  "任务"
// @Success      200  {object}  xresponse.Response
// @Router       /project/tasks/{id} [put]
func (h *ProjectHandler) UpdateTask(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	var req service.UpdateTaskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	if err := h.svc.UpdateTask(c.Request.Context(), uint(id), &req); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// UpdateTaskStatus 更新任务状态(看板拖拽)
// @Summary      更新任务状态
// @Tags         项目管理
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id    path  int  true  "任务ID"
// @Param        body  body  object  true  "{status: 1}"
// @Success      200  {object}  xresponse.Response
// @Router       /project/tasks/{id}/status [put]
func (h *ProjectHandler) UpdateTaskStatus(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	var body struct {
		Status int8 `json:"status"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	if err := h.svc.UpdateTaskStatus(c.Request.Context(), uint(id), body.Status); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// DeleteTask 删除任务
// @Summary      删除任务
// @Tags         项目管理
// @Produce      json
// @Security     BearerAuth
// @Param        id  path  int  true  "任务ID"
// @Success      200  {object}  xresponse.Response
// @Router       /project/tasks/{id} [delete]
func (h *ProjectHandler) DeleteTask(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	if err := h.svc.DeleteTask(c.Request.Context(), uint(id)); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}
