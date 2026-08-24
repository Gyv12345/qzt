package mcp

import (
	"context"
	"fmt"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"

	hrmsvc "qzt-go-server/internal/module/hrm/service"
)

// tools_hrm_recruitment.go HRM 招聘 tools(职位 + 候选人)。

func registerHrmJobTools(s *server.MCPServer) {
	// ── 招聘:职位 ──
	s.AddTool(
		mcp.NewTool("hrm_job_list",
			mcp.WithDescription("查询招聘职位列表"),
			mcp.WithString("keyword", mcp.Description("职位名称/编号关键词")),
			mcp.WithNumber("status", mcp.Description("状态:1草稿2招聘3暂停4关闭5满编")),
			mcp.WithNumber("dept_id", mcp.Description("部门ID")),
			mcp.WithNumber("page", mcp.Description("页码(默认1)")),
			mcp.WithNumber("page_size", mcp.Description("每页条数(默认20)")),
		),
		handleHrmJobList,
	)
	s.AddTool(
		mcp.NewTool("hrm_job_get",
			mcp.WithDescription("查询招聘职位详情"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("职位ID")),
		),
		handleHrmJobGet,
	)
	s.AddTool(
		mcp.NewTool("hrm_job_create",
			mcp.WithDescription("创建招聘职位(默认草稿状态)"),
			mcp.WithString("title", mcp.Required(), mcp.Description("职位名称")),
			mcp.WithNumber("dept_id", mcp.Description("部门ID")),
			mcp.WithString("dept_name", mcp.Description("部门名称")),
			mcp.WithNumber("position_id", mcp.Description("岗位ID")),
			mcp.WithNumber("headcount", mcp.Description("招聘人数(默认1)")),
			mcp.WithString("salary_range", mcp.Description("薪资范围")),
			mcp.WithString("education", mcp.Description("学历要求")),
			mcp.WithString("experience", mcp.Description("经验要求")),
			mcp.WithString("description", mcp.Description("职位描述")),
			mcp.WithString("requirement", mcp.Description("任职要求")),
			mcp.WithNumber("hiring_manager_id", mcp.Description("招聘负责人ID")),
		),
		handleHrmJobCreate,
	)
	s.AddTool(
		mcp.NewTool("hrm_job_update",
			mcp.WithDescription("更新招聘职位(只传要修改的字段;状态改为招聘中会记录发布日期)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("职位ID")),
			mcp.WithString("title", mcp.Description("职位名称")),
			mcp.WithNumber("dept_id", mcp.Description("部门ID")),
			mcp.WithString("dept_name", mcp.Description("部门名称")),
			mcp.WithNumber("position_id", mcp.Description("岗位ID")),
			mcp.WithNumber("headcount", mcp.Description("招聘人数")),
			mcp.WithString("salary_range", mcp.Description("薪资范围")),
			mcp.WithString("education", mcp.Description("学历要求")),
			mcp.WithString("experience", mcp.Description("经验要求")),
			mcp.WithString("description", mcp.Description("职位描述")),
			mcp.WithString("requirement", mcp.Description("任职要求")),
			mcp.WithNumber("hiring_manager_id", mcp.Description("招聘负责人ID")),
			mcp.WithNumber("status", mcp.Description("状态:1草稿2招聘3暂停4关闭5满编")),
		),
		handleHrmJobUpdate,
	)
	s.AddTool(
		mcp.NewTool("hrm_job_delete",
			mcp.WithDescription("删除招聘职位"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("职位ID")),
		),
		handleHrmJobDelete,
	)
}

func registerHrmCandidateTools(s *server.MCPServer) {
	// ── 招聘:候选人 ──
	s.AddTool(
		mcp.NewTool("hrm_candidate_list",
			mcp.WithDescription("查询候选人列表"),
			mcp.WithString("keyword", mcp.Description("姓名/电话关键词")),
			mcp.WithNumber("job_id", mcp.Description("职位ID")),
			mcp.WithNumber("status", mcp.Description("状态:1新简历2筛选3面试4offer5录用6淘汰")),
			mcp.WithNumber("page", mcp.Description("页码(默认1)")),
			mcp.WithNumber("page_size", mcp.Description("每页条数(默认20)")),
		),
		handleHrmCandidateList,
	)
	s.AddTool(
		mcp.NewTool("hrm_candidate_get",
			mcp.WithDescription("查询候选人详情"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("候选人ID")),
		),
		handleHrmCandidateGet,
	)
	s.AddTool(
		mcp.NewTool("hrm_candidate_create",
			mcp.WithDescription("新增候选人(关联到指定职位,默认新简历状态)"),
			mcp.WithNumber("job_id", mcp.Required(), mcp.Description("职位ID")),
			mcp.WithString("name", mcp.Required(), mcp.Description("姓名")),
			mcp.WithString("phone", mcp.Description("电话")),
			mcp.WithString("email", mcp.Description("邮箱")),
			mcp.WithString("gender", mcp.Description("性别")),
			mcp.WithNumber("age", mcp.Description("年龄")),
			mcp.WithString("education", mcp.Description("学历")),
			mcp.WithString("experience", mcp.Description("工作年限")),
			mcp.WithString("company", mcp.Description("当前公司")),
			mcp.WithString("resume_url", mcp.Description("简历链接")),
			mcp.WithString("source", mcp.Description("来源")),
			mcp.WithString("remark", mcp.Description("备注")),
		),
		handleHrmCandidateCreate,
	)
	s.AddTool(
		mcp.NewTool("hrm_candidate_update",
			mcp.WithDescription("更新候选人(只传要修改的字段)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("候选人ID")),
			mcp.WithString("name", mcp.Description("姓名")),
			mcp.WithString("phone", mcp.Description("电话")),
			mcp.WithString("email", mcp.Description("邮箱")),
			mcp.WithString("gender", mcp.Description("性别")),
			mcp.WithNumber("age", mcp.Description("年龄")),
			mcp.WithString("education", mcp.Description("学历")),
			mcp.WithString("experience", mcp.Description("工作年限")),
			mcp.WithString("company", mcp.Description("当前公司")),
			mcp.WithString("resume_url", mcp.Description("简历链接")),
			mcp.WithString("source", mcp.Description("来源")),
			mcp.WithString("interview_date", mcp.Description("面试时间")),
			mcp.WithString("remark", mcp.Description("备注")),
			mcp.WithNumber("evaluator_id", mcp.Description("评估人ID")),
			mcp.WithNumber("status", mcp.Description("状态:1新简历2筛选3面试4offer5录用6淘汰")),
		),
		handleHrmCandidateUpdate,
	)
	s.AddTool(
		mcp.NewTool("hrm_candidate_delete",
			mcp.WithDescription("删除候选人"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("候选人ID")),
		),
		handleHrmCandidateDelete,
	)
}

// ── 招聘:职位 handlers ──

func handleHrmJobList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := hrmsvc.NewRecruitmentService()
	page, pageSize := mcpPage(req)
	list, total, err := svc.ListJobs(ctx, page, pageSize,
		req.GetString("keyword", ""),
		req.GetString("job_no", ""),
		req.GetString("title", ""),
		int8(req.GetFloat("status", 0)),
		uint(req.GetFloat("dept_id", 0)),
	)
	if err != nil {
		return resultError(fmt.Sprintf("查询职位列表失败: %v", err))
	}
	return resultText(map[string]any{"list": list, "total": total, "page": page, "size": pageSize})
}

func handleHrmJobGet(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := hrmsvc.NewRecruitmentService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("职位ID(id)必填")
	}
	j, err := svc.GetJob(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("查询职位失败: %v", err))
	}
	return resultText(j)
}

func handleHrmJobCreate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := hrmsvc.NewRecruitmentService()
	title := req.GetString("title", "")
	if title == "" {
		return resultError("职位名称(title)必填")
	}
	createReq := &hrmsvc.CreateJobRequest{
		Title:           title,
		DeptID:          optUintPtr(req, "dept_id"),
		DeptName:        req.GetString("dept_name", ""),
		PositionID:      optUintPtr(req, "position_id"),
		Headcount:       int(req.GetFloat("headcount", 0)),
		SalaryRange:     req.GetString("salary_range", ""),
		Education:       req.GetString("education", ""),
		Experience:      req.GetString("experience", ""),
		Description:     req.GetString("description", ""),
		Requirement:     req.GetString("requirement", ""),
		HiringManagerID: optUintPtr(req, "hiring_manager_id"),
	}
	j, err := svc.CreateJob(ctx, createReq)
	if err != nil {
		return resultError(fmt.Sprintf("创建职位失败: %v", err))
	}
	return resultText(j)
}

func handleHrmJobUpdate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := hrmsvc.NewRecruitmentService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("职位ID(id)必填")
	}
	existing, err := svc.GetJob(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("职位不存在: %v", err))
	}
	updateReq := &hrmsvc.UpdateJobRequest{
		Title:           req.GetString("title", existing.Title),
		DeptID:          halfUintPtr(req, "dept_id", existing.DeptID),
		DeptName:        halfString(req, "dept_name", existing.DeptName),
		PositionID:      halfUintPtr(req, "position_id", existing.PositionID),
		Headcount:       halfInt(req, "headcount", existing.Headcount),
		SalaryRange:     halfString(req, "salary_range", existing.SalaryRange),
		Education:       halfString(req, "education", existing.Education),
		Experience:      halfString(req, "experience", existing.Experience),
		Description:     halfString(req, "description", existing.Description),
		Requirement:     halfString(req, "requirement", existing.Requirement),
		HiringManagerID: halfUintPtr(req, "hiring_manager_id", existing.HiringManagerID),
		Status:          int8(halfFloat(req, "status", float64(existing.Status))),
	}
	if err := svc.UpdateJob(ctx, id, updateReq); err != nil {
		return resultError(fmt.Sprintf("更新职位失败: %v", err))
	}
	return resultText(map[string]any{"message": "职位已更新", "id": id})
}

func handleHrmJobDelete(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := hrmsvc.NewRecruitmentService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("职位ID(id)必填")
	}
	if err := svc.DeleteJob(ctx, id); err != nil {
		return resultError(fmt.Sprintf("删除职位失败: %v", err))
	}
	return resultText(map[string]any{"message": "职位已删除", "id": id})
}

// ── 招聘:候选人 handlers ──

func handleHrmCandidateList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := hrmsvc.NewRecruitmentService()
	page, pageSize := mcpPage(req)
	list, total, err := svc.ListCandidates(ctx, page, pageSize,
		uint(req.GetFloat("job_id", 0)),
		int8(req.GetFloat("status", 0)),
		req.GetString("keyword", ""),
	)
	if err != nil {
		return resultError(fmt.Sprintf("查询候选人列表失败: %v", err))
	}
	return resultText(map[string]any{"list": list, "total": total, "page": page, "size": pageSize})
}

func handleHrmCandidateGet(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := hrmsvc.NewRecruitmentService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("候选人ID(id)必填")
	}
	c, err := svc.GetCandidate(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("查询候选人失败: %v", err))
	}
	return resultText(c)
}

func handleHrmCandidateCreate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := hrmsvc.NewRecruitmentService()
	jobID := uint(req.GetFloat("job_id", 0))
	name := req.GetString("name", "")
	if jobID == 0 || name == "" {
		return resultError("职位ID(job_id)和姓名(name)必填")
	}
	createReq := &hrmsvc.CreateCandidateRequest{
		JobID:      jobID,
		Name:       name,
		Phone:      req.GetString("phone", ""),
		Email:      req.GetString("email", ""),
		Gender:     req.GetString("gender", ""),
		Age:        int(req.GetFloat("age", 0)),
		Education:  req.GetString("education", ""),
		Experience: req.GetString("experience", ""),
		Company:    req.GetString("company", ""),
		ResumeURL:  req.GetString("resume_url", ""),
		Source:     req.GetString("source", ""),
		Remark:     req.GetString("remark", ""),
	}
	c, err := svc.CreateCandidate(ctx, createReq)
	if err != nil {
		return resultError(fmt.Sprintf("新增候选人失败: %v", err))
	}
	return resultText(c)
}

func handleHrmCandidateUpdate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := hrmsvc.NewRecruitmentService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("候选人ID(id)必填")
	}
	existing, err := svc.GetCandidate(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("候选人不存在: %v", err))
	}
	updateReq := &hrmsvc.UpdateCandidateRequest{
		Name:          req.GetString("name", existing.Name),
		Phone:         halfString(req, "phone", existing.Phone),
		Email:         halfString(req, "email", existing.Email),
		Gender:        halfString(req, "gender", existing.Gender),
		Age:           halfInt(req, "age", existing.Age),
		Education:     halfString(req, "education", existing.Education),
		Experience:    halfString(req, "experience", existing.Experience),
		Company:       halfString(req, "company", existing.Company),
		ResumeURL:     halfString(req, "resume_url", existing.ResumeURL),
		Source:        halfString(req, "source", existing.Source),
		InterviewDate: halfString(req, "interview_date", existing.InterviewDate),
		Remark:        halfString(req, "remark", existing.Remark),
		EvaluatorID:   halfUintPtr(req, "evaluator_id", existing.EvaluatorID),
		Status:        int8(halfFloat(req, "status", float64(existing.Status))),
	}
	if err := svc.UpdateCandidate(ctx, id, updateReq); err != nil {
		return resultError(fmt.Sprintf("更新候选人失败: %v", err))
	}
	return resultText(map[string]any{"message": "候选人已更新", "id": id})
}

func handleHrmCandidateDelete(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := hrmsvc.NewRecruitmentService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("候选人ID(id)必填")
	}
	if err := svc.DeleteCandidate(ctx, id); err != nil {
		return resultError(fmt.Sprintf("删除候选人失败: %v", err))
	}
	return resultText(map[string]any{"message": "候选人已删除", "id": id})
}
