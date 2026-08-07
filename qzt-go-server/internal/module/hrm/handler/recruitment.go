package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"qzt-go-server/internal/module/hrm/service"
	"qzt-go-server/internal/module/system/errcode"
	syservice "qzt-go-server/internal/module/system/service"
	response "qzt-go-server/pkg/xresponse"
)

// recruitment.go 招聘 handler。

type RecruitmentHandler struct {
	svc *service.RecruitmentService
}

func NewRecruitmentHandler() *RecruitmentHandler {
	return &RecruitmentHandler{svc: service.NewRecruitmentService()}
}

// ── 职位 ──

// ListJobs 职位列表
// @Summary      招聘职位列表
// @Tags         HRM-招聘
// @Produce      json
// @Security     BearerAuth
// @Param        page      query  int     false  "页码"
// @Param        page_size query  int     false  "每页条数"
// @Param        keyword   query  string  false  "关键词"
// @Param        status    query  int     false  "状态"
// @Param        dept_id   query  int     false  "部门ID"
// @Success      200  {object}  xresponse.Response
// @Router       /hrm/jobs [get]
func (h *RecruitmentHandler) ListJobs(c *gin.Context) {
	p := syservice.GetPagination(c)
	status, _ := strconv.Atoi(c.DefaultQuery("status", "0"))
	deptID, _ := strconv.ParseUint(c.Query("dept_id"), 10, 64)
	list, total, err := h.svc.ListJobs(c.Request.Context(), p.Page, p.PageSize, c.Query("keyword"), int8(status), uint(deptID))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}

func (h *RecruitmentHandler) GetJob(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	j, err := h.svc.GetJob(c.Request.Context(), uint(id))
	if err != nil {
		response.Fail(c, errcode.ErrNotFound, err.Error())
		return
	}
	response.OK(c, j)
}

func (h *RecruitmentHandler) CreateJob(c *gin.Context) {
	var req service.CreateJobRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	j, err := h.svc.CreateJob(c.Request.Context(), &req)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, j)
}

func (h *RecruitmentHandler) UpdateJob(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	var req service.UpdateJobRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	if err := h.svc.UpdateJob(c.Request.Context(), uint(id), &req); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

func (h *RecruitmentHandler) DeleteJob(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	if err := h.svc.DeleteJob(c.Request.Context(), uint(id)); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

// ── 候选人 ──

func (h *RecruitmentHandler) ListCandidates(c *gin.Context) {
	p := syservice.GetPagination(c)
	jobID, _ := strconv.ParseUint(c.Query("job_id"), 10, 64)
	status, _ := strconv.Atoi(c.DefaultQuery("status", "0"))
	list, total, err := h.svc.ListCandidates(c.Request.Context(), p.Page, p.PageSize, uint(jobID), int8(status), c.Query("keyword"))
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, gin.H{"list": list, "total": total})
}

func (h *RecruitmentHandler) CreateCandidate(c *gin.Context) {
	var req service.CreateCandidateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	c2, err := h.svc.CreateCandidate(c.Request.Context(), &req)
	if err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, c2)
}

func (h *RecruitmentHandler) UpdateCandidate(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	var req service.UpdateCandidateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误: "+err.Error())
		return
	}
	if err := h.svc.UpdateCandidate(c.Request.Context(), uint(id), &req); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}

func (h *RecruitmentHandler) DeleteCandidate(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.Fail(c, errcode.ErrParam, "参数错误")
		return
	}
	if err := h.svc.DeleteCandidate(c.Request.Context(), uint(id)); err != nil {
		response.Fail(c, errcode.ErrServer, err.Error())
		return
	}
	response.OK(c, nil)
}
