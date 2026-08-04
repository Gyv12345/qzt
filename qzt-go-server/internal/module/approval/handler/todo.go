package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/middleware"
	"qzt-go-server/internal/module/approval/service"
	"qzt-go-server/internal/module/system/errcode"
	syservice "qzt-go-server/internal/module/system/service"
	response "qzt-go-server/pkg/xresponse"
)

// TodoHandler 审批待办。
type TodoHandler struct {
	svc *service.TodoService
}

func NewTodoHandler() *TodoHandler { return &TodoHandler{svc: service.NewTodoService()} }

// ListTodo 待办列表
// @Summary      我的待办
// @Description  当前用户待处理的审批任务
// @Tags         审批待办
// @Produce      json
// @Security     BearerAuth
// @Param        page       query  int  false  "页码(默认1)"
// @Param        page_size  query  int  false  "每页条数(默认10)"
// @Success      200  {object}  xresponse.Response
// @Router       /approval/todos [get]
func (h *TodoHandler) ListTodo(c *gin.Context) {
	p := syservice.GetPagination(c)
	userID := middleware.GetUserID(c)
	list, total, err := h.svc.ListTodo(c.Request.Context(), p.Page, p.PageSize, userID)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}

// ListProcessed 已办列表
// @Summary      我的已办
// @Description  当前用户已处理的审批任务
// @Tags         审批待办
// @Produce      json
// @Security     BearerAuth
// @Param        page       query  int  false  "页码(默认1)"
// @Param        page_size  query  int  false  "每页条数(默认10)"
// @Success      200  {object}  xresponse.Response
// @Router       /approval/processed [get]
func (h *TodoHandler) ListProcessed(c *gin.Context) {
	p := syservice.GetPagination(c)
	userID := middleware.GetUserID(c)
	list, total, err := h.svc.ListProcessed(c.Request.Context(), p.Page, p.PageSize, userID)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}

// ListInitiated 我发起的
// @Summary      我发起的审批
// @Description  当前用户提交的审批实例
// @Tags         审批待办
// @Produce      json
// @Security     BearerAuth
// @Param        page       query  int  false  "页码(默认1)"
// @Param        page_size  query  int  false  "每页条数(默认10)"
// @Success      200  {object}  xresponse.Response
// @Router       /approval/initiated [get]
func (h *TodoHandler) ListInitiated(c *gin.Context) {
	p := syservice.GetPagination(c)
	userID := middleware.GetUserID(c)
	list, total, err := h.svc.ListInitiated(c.Request.Context(), p.Page, p.PageSize, userID)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}

// GetDetail 审批详情
// @Summary      审批实例详情
// @Description  实例信息 + 任务列表 + 审批记录
// @Tags         审批待办
// @Produce      json
// @Security     BearerAuth
// @Param        id  path      int  true  "实例ID"
// @Success      200  {object}  xresponse.Response
// @Router       /approval/instances/{id} [get]
func (h *TodoHandler) GetDetail(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	detail, err := h.svc.GetDetail(c.Request.Context(), uint(id))
	if err != nil {
		response.Fail(c, errcode.ErrNotFound, err.Error())
		return
	}
	response.OK(c, detail)
}
