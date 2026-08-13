package mcp

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
	"github.com/shopspring/decimal"

	hrmsvc "qzt-go-server/internal/module/hrm/service"
)

// tools_hrm_write.go HRM 写操作 tools(部门/岗位/员工/考勤/薪酬写 + 招聘/绩效读写)。
// 更新类工具采用「先 Get 再覆盖传入字段」的半增量模式,AI 只需传要改的字段。

func registerHrmWriteTools(s *server.MCPServer) {
	// ── 部门 ──
	s.AddTool(
		mcp.NewTool("hrm_department_create",
			mcp.WithDescription("创建部门"),
			mcp.WithString("name", mcp.Required(), mcp.Description("部门名称")),
			mcp.WithString("code", mcp.Required(), mcp.Description("部门编码(唯一)")),
			mcp.WithNumber("parent_id", mcp.Description("父部门ID(顶级填0或不传)")),
			mcp.WithNumber("leader_id", mcp.Description("负责人ID(关联系统用户)")),
			mcp.WithNumber("sort", mcp.Description("排序值(默认0)")),
			mcp.WithNumber("status", mcp.Description("状态:1启用 0禁用(默认1)")),
		),
		handleHrmDepartmentCreate,
	)
	s.AddTool(
		mcp.NewTool("hrm_department_update",
			mcp.WithDescription("更新部门信息(只传要修改的字段)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("部门ID")),
			mcp.WithString("name", mcp.Description("部门名称")),
			mcp.WithString("code", mcp.Description("部门编码(唯一)")),
			mcp.WithNumber("parent_id", mcp.Description("父部门ID(顶级填0)")),
			mcp.WithNumber("leader_id", mcp.Description("负责人ID(传0清除)")),
			mcp.WithNumber("sort", mcp.Description("排序值")),
			mcp.WithNumber("status", mcp.Description("状态:1启用 0禁用")),
		),
		handleHrmDepartmentUpdate,
	)
	s.AddTool(
		mcp.NewTool("hrm_department_delete",
			mcp.WithDescription("删除部门(有子部门或员工则拒绝)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("部门ID")),
		),
		handleHrmDepartmentDelete,
	)

	// ── 岗位 ──
	s.AddTool(
		mcp.NewTool("hrm_position_create",
			mcp.WithDescription("创建岗位"),
			mcp.WithString("name", mcp.Required(), mcp.Description("岗位名称")),
			mcp.WithString("code", mcp.Required(), mcp.Description("岗位编码(唯一)")),
			mcp.WithNumber("department_id", mcp.Required(), mcp.Description("所属部门ID")),
			mcp.WithNumber("sort", mcp.Description("排序值(默认0)")),
			mcp.WithNumber("status", mcp.Description("状态:1启用 0禁用(默认1)")),
			mcp.WithString("remark", mcp.Description("备注")),
		),
		handleHrmPositionCreate,
	)
	s.AddTool(
		mcp.NewTool("hrm_position_update",
			mcp.WithDescription("更新岗位信息(只传要修改的字段)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("岗位ID")),
			mcp.WithString("name", mcp.Description("岗位名称")),
			mcp.WithString("code", mcp.Description("岗位编码(唯一)")),
			mcp.WithNumber("department_id", mcp.Description("所属部门ID")),
			mcp.WithNumber("sort", mcp.Description("排序值")),
			mcp.WithNumber("status", mcp.Description("状态:1启用 0禁用")),
			mcp.WithString("remark", mcp.Description("备注")),
		),
		handleHrmPositionUpdate,
	)
	s.AddTool(
		mcp.NewTool("hrm_position_delete",
			mcp.WithDescription("删除岗位(有员工则拒绝)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("岗位ID")),
		),
		handleHrmPositionDelete,
	)

	// ── 员工 ──
	s.AddTool(
		mcp.NewTool("hrm_employee_create",
			mcp.WithDescription("创建员工档案(自动写一条入职履历)"),
			mcp.WithString("emp_no", mcp.Required(), mcp.Description("员工工号(唯一)")),
			mcp.WithString("name", mcp.Required(), mcp.Description("姓名")),
			mcp.WithNumber("department_id", mcp.Required(), mcp.Description("部门ID")),
			mcp.WithNumber("position_id", mcp.Required(), mcp.Description("岗位ID")),
			mcp.WithNumber("gender", mcp.Description("性别:0未知 1男 2女")),
			mcp.WithString("phone", mcp.Description("电话")),
			mcp.WithString("email", mcp.Description("邮箱")),
			mcp.WithNumber("user_id", mcp.Description("关联系统用户ID")),
			mcp.WithString("entry_date", mcp.Description("入职日期(YYYY-MM-DD)")),
			mcp.WithNumber("status", mcp.Description("状态:1在职 2试用(默认) 3离职")),
			mcp.WithString("remark", mcp.Description("备注")),
		),
		handleHrmEmployeeCreate,
	)
	s.AddTool(
		mcp.NewTool("hrm_employee_update",
			mcp.WithDescription("更新员工信息(只传要修改的字段;修改部门/岗位/状态会自动写履历)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("员工ID")),
			mcp.WithString("emp_no", mcp.Description("员工工号(唯一)")),
			mcp.WithString("name", mcp.Description("姓名")),
			mcp.WithNumber("department_id", mcp.Description("部门ID")),
			mcp.WithNumber("position_id", mcp.Description("岗位ID")),
			mcp.WithNumber("gender", mcp.Description("性别:0未知 1男 2女")),
			mcp.WithString("phone", mcp.Description("电话")),
			mcp.WithString("email", mcp.Description("邮箱")),
			mcp.WithNumber("user_id", mcp.Description("关联系统用户ID")),
			mcp.WithString("entry_date", mcp.Description("入职日期(YYYY-MM-DD)")),
			mcp.WithString("resign_date", mcp.Description("离职日期(YYYY-MM-DD)")),
			mcp.WithNumber("status", mcp.Description("状态:1在职 2试用 3离职")),
			mcp.WithString("remark", mcp.Description("备注")),
		),
		handleHrmEmployeeUpdate,
	)
	s.AddTool(
		mcp.NewTool("hrm_employee_delete",
			mcp.WithDescription("删除员工(硬删除员工档案+履历,不可恢复)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("员工ID")),
		),
		handleHrmEmployeeDelete,
	)

	// ── 考勤 ──
	s.AddTool(
		mcp.NewTool("hrm_attendance_clock",
			mcp.WithDescription("员工打卡(上班/下班,同一天同类型重复打卡则更新)。employee_id 不传则从登录用户推导"),
			mcp.WithString("clock_type", mcp.Required(), mcp.Description("打卡类型:CHECK_IN 上班 / CHECK_OUT 下班")),
			mcp.WithNumber("employee_id", mcp.Description("员工ID(不传则按当前登录用户推导)")),
			mcp.WithString("location", mcp.Description("打卡位置")),
			mcp.WithString("longitude", mcp.Description("经度")),
			mcp.WithString("latitude", mcp.Description("纬度")),
			mcp.WithString("remark", mcp.Description("备注")),
		),
		handleHrmAttendanceClock,
	)
	s.AddTool(
		mcp.NewTool("hrm_leave_create",
			mcp.WithDescription("申请请假"),
			mcp.WithNumber("employee_id", mcp.Required(), mcp.Description("员工ID")),
			mcp.WithString("leave_type", mcp.Required(), mcp.Description("请假类型(字典 LEAVE_TYPE)")),
			mcp.WithString("start_date", mcp.Required(), mcp.Description("开始时间(YYYY-MM-DD HH:mm:ss)")),
			mcp.WithString("end_date", mcp.Required(), mcp.Description("结束时间(YYYY-MM-DD HH:mm:ss)")),
			mcp.WithString("duration_days", mcp.Required(), mcp.Description("请假天数(数字字符串,如 1.5)")),
			mcp.WithString("leave_no", mcp.Description("请假单号(留空自动生成)")),
			mcp.WithString("reason", mcp.Description("请假原因")),
		),
		handleHrmLeaveCreate,
	)
	s.AddTool(
		mcp.NewTool("hrm_leave_approve",
			mcp.WithDescription("审批请假单(审批人为当前登录用户)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("请假单ID")),
			mcp.WithBoolean("approved", mcp.Required(), mcp.Description("是否通过:true 通过 / false 驳回")),
			mcp.WithString("remark", mcp.Description("审批备注")),
		),
		handleHrmLeaveApprove,
	)
	s.AddTool(
		mcp.NewTool("hrm_overtime_create",
			mcp.WithDescription("申请加班"),
			mcp.WithNumber("employee_id", mcp.Required(), mcp.Description("员工ID")),
			mcp.WithString("start_date", mcp.Required(), mcp.Description("开始时间(YYYY-MM-DD HH:mm:ss)")),
			mcp.WithString("end_date", mcp.Required(), mcp.Description("结束时间(YYYY-MM-DD HH:mm:ss)")),
			mcp.WithString("duration_hours", mcp.Required(), mcp.Description("加班时长(小时,数字字符串)")),
			mcp.WithString("reason", mcp.Description("加班原因")),
			mcp.WithString("compensate_type", mcp.Description("补偿类型:PAY 加班费 / TO 调休(默认 PAY)")),
			mcp.WithString("overtime_no", mcp.Description("加班单号(留空自动生成)")),
		),
		handleHrmOvertimeCreate,
	)
	s.AddTool(
		mcp.NewTool("hrm_overtime_approve",
			mcp.WithDescription("审批加班单(审批人为当前登录用户)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("加班单ID")),
			mcp.WithBoolean("approved", mcp.Required(), mcp.Description("是否通过:true 通过 / false 驳回")),
			mcp.WithString("remark", mcp.Description("审批备注")),
		),
		handleHrmOvertimeApprove,
	)
	s.AddTool(
		mcp.NewTool("hrm_attendance_summary_generate",
			mcp.WithDescription("生成/刷新员工月度考勤汇总(按打卡/请假/加班统计)"),
			mcp.WithNumber("employee_id", mcp.Required(), mcp.Description("员工ID")),
			mcp.WithString("year_month", mcp.Required(), mcp.Description("月份(YYYY-MM,如 2026-08)")),
		),
		handleHrmAttendanceSummaryGenerate,
	)

	// ── 薪酬 ──
	s.AddTool(
		mcp.NewTool("hrm_payroll_save_structure",
			mcp.WithDescription("保存员工薪酬结构(upsert:有则更新无则创建)。涉及敏感薪资数据"),
			mcp.WithNumber("employee_id", mcp.Required(), mcp.Description("员工ID")),
			mcp.WithNumber("base_salary", mcp.Description("基本工资")),
			mcp.WithNumber("position_allowance", mcp.Description("岗位津贴")),
			mcp.WithNumber("performance_allowance", mcp.Description("绩效津贴")),
			mcp.WithNumber("meal_allowance", mcp.Description("餐补")),
			mcp.WithNumber("transport_allowance", mcp.Description("交通补贴")),
			mcp.WithNumber("social_ins_rate", mcp.Description("社保比例(如0.105表示10.5%,默认)")),
			mcp.WithNumber("housing_fund_rate", mcp.Description("公积金比例(如0.07表示7%,默认)")),
			mcp.WithNumber("social_ins_base", mcp.Description("社保基数(为0则用基本工资)")),
			mcp.WithNumber("housing_fund_base", mcp.Description("公积金基数(为0则用基本工资)")),
			mcp.WithString("remark", mcp.Description("备注")),
		),
		handleHrmPayrollSaveStructure,
	)
	s.AddTool(
		mcp.NewTool("hrm_payroll_generate",
			mcp.WithDescription("生成/刷新员工月度工资条(自动算社保/公积金/个税/实发)。需先配置薪酬结构"),
			mcp.WithNumber("employee_id", mcp.Required(), mcp.Description("员工ID")),
			mcp.WithString("year_month", mcp.Required(), mcp.Description("月份(YYYY-MM)")),
		),
		handleHrmPayrollGenerate,
	)
	s.AddTool(
		mcp.NewTool("hrm_payroll_confirm",
			mcp.WithDescription("确认工资条(草稿→已确认,仅草稿状态可确认)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("工资条ID")),
		),
		handleHrmPayrollConfirm,
	)
	s.AddTool(
		mcp.NewTool("hrm_payroll_mark_paid",
			mcp.WithDescription("标记工资条已发放(已确认→已发放)。财务敏感动作,标记后工资条进入已发放状态"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("工资条ID")),
		),
		handleHrmPayrollMarkPaid,
	)

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

	// ── 绩效 ──
	s.AddTool(
		mcp.NewTool("hrm_performance_list",
			mcp.WithDescription("查询绩效考核列表"),
			mcp.WithString("keyword", mcp.Description("标题/员工姓名关键词")),
			mcp.WithString("period", mcp.Description("考核周期(如 2026-Q3)")),
			mcp.WithNumber("status", mcp.Description("状态:1进行中2自评完成3评审中4已完成")),
			mcp.WithNumber("employee_id", mcp.Description("员工ID")),
			mcp.WithNumber("dept_id", mcp.Description("部门ID")),
			mcp.WithNumber("page", mcp.Description("页码(默认1)")),
			mcp.WithNumber("page_size", mcp.Description("每页条数(默认20)")),
		),
		handleHrmPerformanceList,
	)
	s.AddTool(
		mcp.NewTool("hrm_performance_get",
			mcp.WithDescription("查询绩效考核详情(含考核指标明细)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("考核ID")),
		),
		handleHrmPerformanceGet,
	)
	s.AddTool(
		mcp.NewTool("hrm_performance_create",
			mcp.WithDescription("创建绩效考核(含考核指标明细 items)"),
			mcp.WithString("title", mcp.Required(), mcp.Description("考核标题")),
			mcp.WithNumber("employee_id", mcp.Required(), mcp.Description("员工ID")),
			mcp.WithString("start_date", mcp.Required(), mcp.Description("考核开始日期(YYYY-MM-DD)")),
			mcp.WithString("end_date", mcp.Required(), mcp.Description("考核结束日期(YYYY-MM-DD)")),
			mcp.WithString("employee_name", mcp.Description("员工姓名")),
			mcp.WithNumber("dept_id", mcp.Description("部门ID")),
			mcp.WithString("dept_name", mcp.Description("部门名称")),
			mcp.WithString("period", mcp.Description("考核周期(如 2026-Q3)")),
			mcp.WithNumber("reviewer_id", mcp.Description("评审人ID")),
			mcp.WithString("items", mcp.Description("考核指标明细(JSON数组),如 [{\"item_name\":\"业绩\",\"weight\":\"0.6\",\"target_desc\":\"完成100万\"}]")),
		),
		handleHrmPerformanceCreate,
	)
	s.AddTool(
		mcp.NewTool("hrm_performance_self_review",
			mcp.WithDescription("提交绩效自评(仅进行中的考核可自评)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("考核ID")),
			mcp.WithNumber("self_score", mcp.Description("自评分数")),
			mcp.WithString("self_comment", mcp.Description("自评评语")),
		),
		handleHrmPerformanceSelfReview,
	)
	s.AddTool(
		mcp.NewTool("hrm_performance_review",
			mcp.WithDescription("上级评审绩效(仅自评完成或评审中的考核可评审)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("考核ID")),
			mcp.WithNumber("review_score", mcp.Description("评审分数")),
			mcp.WithString("review_comment", mcp.Description("评审评语")),
			mcp.WithNumber("final_score", mcp.Description("最终分数")),
			mcp.WithString("grade", mcp.Description("等级(如 A/B/C/D)")),
		),
		handleHrmPerformanceReview,
	)
	s.AddTool(
		mcp.NewTool("hrm_performance_delete",
			mcp.WithDescription("删除绩效考核(连同指标明细)"),
			mcp.WithNumber("id", mcp.Required(), mcp.Description("考核ID")),
		),
		handleHrmPerformanceDelete,
	)
}

// ── 部门 handlers ──

func handleHrmDepartmentCreate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := hrmsvc.NewDepartmentService()
	name := req.GetString("name", "")
	code := req.GetString("code", "")
	if name == "" || code == "" {
		return resultError("部门名称(name)和编码(code)必填")
	}
	createReq := &hrmsvc.CreateDepartmentRequest{
		ParentID: uint(req.GetFloat("parent_id", 0)),
		Name:     name,
		Code:     code,
		Leader:   hrmOptUint(req, "leader_id"),
		Sort:     int(req.GetFloat("sort", 0)),
		Status:   int8(req.GetFloat("status", 0)),
	}
	dept, err := svc.Create(ctx, createReq)
	if err != nil {
		return resultError(fmt.Sprintf("创建部门失败: %v", err))
	}
	return resultText(dept)
}

func handleHrmDepartmentUpdate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := hrmsvc.NewDepartmentService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("部门ID(id)必填")
	}
	existing, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("部门不存在: %v", err))
	}
	name := req.GetString("name", existing.Name)
	code := req.GetString("code", existing.Code)
	if name == "" || code == "" {
		return resultError("部门名称(name)和编码(code)不能为空")
	}
	updateReq := &hrmsvc.UpdateDepartmentRequest{
		ParentID: hrmHalfUintPtr(req, "parent_id", &existing.ParentID),
		Name:     name,
		Code:     code,
		Leader:   hrmHalfUintPtr(req, "leader_id", existing.Leader),
		Sort:     hrmHalfInt(req, "sort", existing.Sort),
		Status:   int8(hrmHalfFloat(req, "status", float64(existing.Status))),
	}
	if err := svc.Update(ctx, id, updateReq); err != nil {
		return resultError(fmt.Sprintf("更新部门失败: %v", err))
	}
	return resultText(map[string]any{"message": "部门已更新", "id": id})
}

func handleHrmDepartmentDelete(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := hrmsvc.NewDepartmentService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("部门ID(id)必填")
	}
	if err := svc.Delete(ctx, id); err != nil {
		return resultError(fmt.Sprintf("删除部门失败: %v", err))
	}
	return resultText(map[string]any{"message": "部门已删除", "id": id})
}

// ── 岗位 handlers ──

func handleHrmPositionCreate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := hrmsvc.NewPositionService()
	name := req.GetString("name", "")
	code := req.GetString("code", "")
	deptID := uint(req.GetFloat("department_id", 0))
	if name == "" || code == "" || deptID == 0 {
		return resultError("岗位名称(name)、编码(code)和部门ID(department_id)必填")
	}
	createReq := &hrmsvc.CreatePositionRequest{
		Name:         name,
		Code:         code,
		DepartmentID: deptID,
		Sort:         int(req.GetFloat("sort", 0)),
		Status:       int8(req.GetFloat("status", 0)),
		Remark:       req.GetString("remark", ""),
	}
	pos, err := svc.Create(ctx, createReq)
	if err != nil {
		return resultError(fmt.Sprintf("创建岗位失败: %v", err))
	}
	return resultText(pos)
}

func handleHrmPositionUpdate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := hrmsvc.NewPositionService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("岗位ID(id)必填")
	}
	existing, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("岗位不存在: %v", err))
	}
	name := req.GetString("name", existing.Name)
	code := req.GetString("code", existing.Code)
	deptID := uint(hrmHalfFloat(req, "department_id", float64(existing.DepartmentID)))
	if name == "" || code == "" || deptID == 0 {
		return resultError("岗位名称(name)、编码(code)和部门ID(department_id)不能为空")
	}
	updateReq := &hrmsvc.UpdatePositionRequest{
		Name:         name,
		Code:         code,
		DepartmentID: deptID,
		Sort:         hrmHalfInt(req, "sort", existing.Sort),
		Status:       int8(hrmHalfFloat(req, "status", float64(existing.Status))),
		Remark:       hrmHalfString(req, "remark", existing.Remark),
	}
	if err := svc.Update(ctx, id, updateReq); err != nil {
		return resultError(fmt.Sprintf("更新岗位失败: %v", err))
	}
	return resultText(map[string]any{"message": "岗位已更新", "id": id})
}

func handleHrmPositionDelete(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := hrmsvc.NewPositionService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("岗位ID(id)必填")
	}
	if err := svc.Delete(ctx, id); err != nil {
		return resultError(fmt.Sprintf("删除岗位失败: %v", err))
	}
	return resultText(map[string]any{"message": "岗位已删除", "id": id})
}

// ── 员工 handlers ──

func handleHrmEmployeeCreate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := hrmsvc.NewEmployeeService()
	empNo := req.GetString("emp_no", "")
	name := req.GetString("name", "")
	deptID := uint(req.GetFloat("department_id", 0))
	posID := uint(req.GetFloat("position_id", 0))
	if empNo == "" || name == "" || deptID == 0 || posID == 0 {
		return resultError("工号(emp_no)、姓名(name)、部门ID(department_id)、岗位ID(position_id)必填")
	}
	createReq := &hrmsvc.CreateEmployeeRequest{
		EmpNo:        empNo,
		Name:         name,
		Gender:       int8(req.GetFloat("gender", 0)),
		Phone:        req.GetString("phone", ""),
		Email:        req.GetString("email", ""),
		DepartmentID: deptID,
		PositionID:   posID,
		UserID:       hrmOptUint(req, "user_id"),
		EntryDate:    req.GetString("entry_date", ""),
		Status:       int8(req.GetFloat("status", 0)),
		Remark:       req.GetString("remark", ""),
	}
	emp, err := svc.Create(ctx, createReq, userIDFromContext(ctx))
	if err != nil {
		return resultError(fmt.Sprintf("创建员工失败: %v", err))
	}
	return resultText(emp)
}

func handleHrmEmployeeUpdate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := hrmsvc.NewEmployeeService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("员工ID(id)必填")
	}
	existing, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("员工不存在: %v", err))
	}
	empNo := req.GetString("emp_no", existing.EmpNo)
	name := req.GetString("name", existing.Name)
	deptID := uint(hrmHalfFloat(req, "department_id", float64(existing.DepartmentID)))
	posID := uint(hrmHalfFloat(req, "position_id", float64(existing.PositionID)))
	if empNo == "" || name == "" || deptID == 0 || posID == 0 {
		return resultError("工号(emp_no)、姓名(name)、部门ID(department_id)、岗位ID(position_id)不能为空")
	}
	// entry_date/resign_date:未传(空串)则 service 自动保留原值
	updateReq := &hrmsvc.UpdateEmployeeRequest{
		EmpNo:        empNo,
		Name:         name,
		Gender:       int8(hrmHalfFloat(req, "gender", float64(existing.Gender))),
		Phone:        hrmHalfString(req, "phone", existing.Phone),
		Email:        hrmHalfString(req, "email", existing.Email),
		DepartmentID: deptID,
		PositionID:   posID,
		UserID:       hrmHalfUintPtr(req, "user_id", existing.UserID),
		EntryDate:    req.GetString("entry_date", ""),
		ResignDate:   req.GetString("resign_date", ""),
		Status:       int8(hrmHalfFloat(req, "status", float64(existing.Status))),
		Remark:       hrmHalfString(req, "remark", existing.Remark),
	}
	if err := svc.Update(ctx, id, updateReq, userIDFromContext(ctx)); err != nil {
		return resultError(fmt.Sprintf("更新员工失败: %v", err))
	}
	return resultText(map[string]any{"message": "员工已更新", "id": id})
}

func handleHrmEmployeeDelete(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := hrmsvc.NewEmployeeService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("员工ID(id)必填")
	}
	if err := svc.Delete(ctx, id); err != nil {
		return resultError(fmt.Sprintf("删除员工失败: %v", err))
	}
	return resultText(map[string]any{"message": "员工已删除(硬删除,含履历)", "id": id})
}

// ── 考勤 handlers ──

func handleHrmAttendanceClock(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := hrmsvc.NewAttendanceService()
	clockType := req.GetString("clock_type", "")
	if clockType != "CHECK_IN" && clockType != "CHECK_OUT" {
		return resultError("打卡类型(clock_type)必填,且只能是 CHECK_IN 或 CHECK_OUT")
	}
	clockReq := &hrmsvc.ClockInRequest{
		EmployeeID: uint(req.GetFloat("employee_id", 0)),
		ClockType:  clockType,
		Location:   req.GetString("location", ""),
		Longitude:  req.GetString("longitude", ""),
		Latitude:   req.GetString("latitude", ""),
		Remark:     req.GetString("remark", ""),
	}
	clock, err := svc.ClockIn(ctx, clockReq, userIDFromContext(ctx))
	if err != nil {
		return resultError(fmt.Sprintf("打卡失败: %v", err))
	}
	return resultText(clock)
}

func handleHrmLeaveCreate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := hrmsvc.NewAttendanceService()
	employeeID := uint(req.GetFloat("employee_id", 0))
	leaveType := req.GetString("leave_type", "")
	startDate := req.GetString("start_date", "")
	endDate := req.GetString("end_date", "")
	duration := req.GetString("duration_days", "")
	if employeeID == 0 || leaveType == "" || startDate == "" || endDate == "" || duration == "" {
		return resultError("员工ID(employee_id)、请假类型(leave_type)、开始时间(start_date)、结束时间(end_date)、天数(duration_days)必填")
	}
	leaveReq := &hrmsvc.LeaveRequest{
		LeaveNo:      req.GetString("leave_no", ""),
		EmployeeID:   employeeID,
		LeaveType:    leaveType,
		StartDate:    startDate,
		EndDate:      endDate,
		DurationDays: duration,
		Reason:       req.GetString("reason", ""),
	}
	leave, err := svc.ApplyLeave(ctx, leaveReq)
	if err != nil {
		return resultError(fmt.Sprintf("请假申请失败: %v", err))
	}
	return resultText(leave)
}

func handleHrmLeaveApprove(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := hrmsvc.NewAttendanceService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("请假单ID(id)必填")
	}
	approved := req.GetBool("approved", false)
	remark := req.GetString("remark", "")
	if err := svc.ApproveLeave(ctx, id, userIDFromContext(ctx), approved, remark); err != nil {
		return resultError(fmt.Sprintf("审批请假失败: %v", err))
	}
	return resultText(map[string]any{"message": "请假单已审批", "id": id, "approved": approved})
}

func handleHrmOvertimeCreate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := hrmsvc.NewAttendanceService()
	employeeID := uint(req.GetFloat("employee_id", 0))
	startDate := req.GetString("start_date", "")
	endDate := req.GetString("end_date", "")
	duration := req.GetString("duration_hours", "")
	if employeeID == 0 || startDate == "" || endDate == "" || duration == "" {
		return resultError("员工ID(employee_id)、开始时间(start_date)、结束时间(end_date)、时长(duration_hours)必填")
	}
	otReq := &hrmsvc.OvertimeRequest{
		OvertimeNo:     req.GetString("overtime_no", ""),
		EmployeeID:     employeeID,
		StartDate:      startDate,
		EndDate:        endDate,
		DurationHours:  duration,
		Reason:         req.GetString("reason", ""),
		CompensateType: req.GetString("compensate_type", ""),
	}
	ot, err := svc.ApplyOvertime(ctx, otReq)
	if err != nil {
		return resultError(fmt.Sprintf("加班申请失败: %v", err))
	}
	return resultText(ot)
}

func handleHrmOvertimeApprove(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := hrmsvc.NewAttendanceService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("加班单ID(id)必填")
	}
	approved := req.GetBool("approved", false)
	remark := req.GetString("remark", "")
	if err := svc.ApproveOvertime(ctx, id, userIDFromContext(ctx), approved, remark); err != nil {
		return resultError(fmt.Sprintf("审批加班失败: %v", err))
	}
	return resultText(map[string]any{"message": "加班单已审批", "id": id, "approved": approved})
}

func handleHrmAttendanceSummaryGenerate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := hrmsvc.NewAttendanceService()
	employeeID := uint(req.GetFloat("employee_id", 0))
	yearMonth := req.GetString("year_month", "")
	if employeeID == 0 || yearMonth == "" {
		return resultError("员工ID(employee_id)和月份(year_month)必填")
	}
	summary, err := svc.GenerateSummary(ctx, employeeID, yearMonth)
	if err != nil {
		return resultError(fmt.Sprintf("生成考勤汇总失败: %v", err))
	}
	return resultText(summary)
}

// ── 薪酬 handlers ──

func handleHrmPayrollSaveStructure(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := hrmsvc.NewPayrollService()
	employeeID := uint(req.GetFloat("employee_id", 0))
	if employeeID == 0 {
		return resultError("员工ID(employee_id)必填")
	}
	saveReq := &hrmsvc.SaveStructureRequest{
		EmployeeID:       employeeID,
		BaseSalary:       decimal.NewFromFloat(req.GetFloat("base_salary", 0)),
		PositionAllow:    decimal.NewFromFloat(req.GetFloat("position_allowance", 0)),
		PerformanceAllow: decimal.NewFromFloat(req.GetFloat("performance_allowance", 0)),
		MealAllow:        decimal.NewFromFloat(req.GetFloat("meal_allowance", 0)),
		TransportAllow:   decimal.NewFromFloat(req.GetFloat("transport_allowance", 0)),
		SocialInsRate:    decimal.NewFromFloat(req.GetFloat("social_ins_rate", 0)),
		HousingFundRate:  decimal.NewFromFloat(req.GetFloat("housing_fund_rate", 0)),
		SocialInsBase:    decimal.NewFromFloat(req.GetFloat("social_ins_base", 0)),
		HousingFundBase:  decimal.NewFromFloat(req.GetFloat("housing_fund_base", 0)),
		Remark:           req.GetString("remark", ""),
	}
	structure, err := svc.SaveStructure(ctx, saveReq)
	if err != nil {
		return resultError(fmt.Sprintf("保存薪酬结构失败: %v", err))
	}
	return resultText(structure)
}

func handleHrmPayrollGenerate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := hrmsvc.NewPayrollService()
	employeeID := uint(req.GetFloat("employee_id", 0))
	yearMonth := req.GetString("year_month", "")
	if employeeID == 0 || yearMonth == "" {
		return resultError("员工ID(employee_id)和月份(year_month)必填")
	}
	payroll, err := svc.GeneratePayroll(ctx, &hrmsvc.GeneratePayrollRequest{
		EmployeeID: employeeID,
		YearMonth:  yearMonth,
	})
	if err != nil {
		return resultError(fmt.Sprintf("生成工资条失败: %v", err))
	}
	return resultText(payroll)
}

func handleHrmPayrollConfirm(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := hrmsvc.NewPayrollService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("工资条ID(id)必填")
	}
	if err := svc.ConfirmPayroll(ctx, id); err != nil {
		return resultError(fmt.Sprintf("确认工资条失败: %v", err))
	}
	return resultText(map[string]any{"message": "工资条已确认", "id": id})
}

func handleHrmPayrollMarkPaid(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := hrmsvc.NewPayrollService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("工资条ID(id)必填")
	}
	if err := svc.MarkPaid(ctx, id); err != nil {
		return resultError(fmt.Sprintf("标记发放失败: %v", err))
	}
	return resultText(map[string]any{"message": "工资条已标记发放", "id": id})
}

// ── 招聘:职位 handlers ──

func handleHrmJobList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := hrmsvc.NewRecruitmentService()
	page, pageSize := mcpPage(req)
	list, total, err := svc.ListJobs(ctx, page, pageSize,
		req.GetString("keyword", ""),
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
		DeptID:          hrmOptUint(req, "dept_id"),
		DeptName:        req.GetString("dept_name", ""),
		PositionID:      hrmOptUint(req, "position_id"),
		Headcount:       int(req.GetFloat("headcount", 0)),
		SalaryRange:     req.GetString("salary_range", ""),
		Education:       req.GetString("education", ""),
		Experience:      req.GetString("experience", ""),
		Description:     req.GetString("description", ""),
		Requirement:     req.GetString("requirement", ""),
		HiringManagerID: hrmOptUint(req, "hiring_manager_id"),
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
		DeptID:          hrmHalfUintPtr(req, "dept_id", existing.DeptID),
		DeptName:        hrmHalfString(req, "dept_name", existing.DeptName),
		PositionID:      hrmHalfUintPtr(req, "position_id", existing.PositionID),
		Headcount:       hrmHalfInt(req, "headcount", existing.Headcount),
		SalaryRange:     hrmHalfString(req, "salary_range", existing.SalaryRange),
		Education:       hrmHalfString(req, "education", existing.Education),
		Experience:      hrmHalfString(req, "experience", existing.Experience),
		Description:     hrmHalfString(req, "description", existing.Description),
		Requirement:     hrmHalfString(req, "requirement", existing.Requirement),
		HiringManagerID: hrmHalfUintPtr(req, "hiring_manager_id", existing.HiringManagerID),
		Status:          int8(hrmHalfFloat(req, "status", float64(existing.Status))),
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
		Phone:         hrmHalfString(req, "phone", existing.Phone),
		Email:         hrmHalfString(req, "email", existing.Email),
		Gender:        hrmHalfString(req, "gender", existing.Gender),
		Age:           hrmHalfInt(req, "age", existing.Age),
		Education:     hrmHalfString(req, "education", existing.Education),
		Experience:    hrmHalfString(req, "experience", existing.Experience),
		Company:       hrmHalfString(req, "company", existing.Company),
		ResumeURL:     hrmHalfString(req, "resume_url", existing.ResumeURL),
		Source:        hrmHalfString(req, "source", existing.Source),
		InterviewDate: hrmHalfString(req, "interview_date", existing.InterviewDate),
		Remark:        hrmHalfString(req, "remark", existing.Remark),
		EvaluatorID:   hrmHalfUintPtr(req, "evaluator_id", existing.EvaluatorID),
		Status:        int8(hrmHalfFloat(req, "status", float64(existing.Status))),
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

// ── 绩效 handlers ──

func handleHrmPerformanceList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := hrmsvc.NewPerformanceService()
	page, pageSize := mcpPage(req)
	list, total, err := svc.List(ctx, page, pageSize,
		req.GetString("keyword", ""),
		req.GetString("period", ""),
		int8(req.GetFloat("status", 0)),
		uint(req.GetFloat("employee_id", 0)),
		uint(req.GetFloat("dept_id", 0)),
	)
	if err != nil {
		return resultError(fmt.Sprintf("查询绩效列表失败: %v", err))
	}
	return resultText(map[string]any{"list": list, "total": total, "page": page, "size": pageSize})
}

func handleHrmPerformanceGet(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := hrmsvc.NewPerformanceService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("考核ID(id)必填")
	}
	p, items, err := svc.GetByID(ctx, id)
	if err != nil {
		return resultError(fmt.Sprintf("查询绩效失败: %v", err))
	}
	return resultText(map[string]any{"performance": p, "items": items})
}

func handleHrmPerformanceCreate(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := hrmsvc.NewPerformanceService()
	title := req.GetString("title", "")
	employeeID := uint(req.GetFloat("employee_id", 0))
	startDate := req.GetString("start_date", "")
	endDate := req.GetString("end_date", "")
	if title == "" || employeeID == 0 || startDate == "" || endDate == "" {
		return resultError("考核标题(title)、员工ID(employee_id)、开始日期(start_date)、结束日期(end_date)必填")
	}
	// 解析考核指标明细 JSON
	items := make([]hrmsvc.PerfItemInput, 0)
	if itemsStr := req.GetString("items", ""); itemsStr != "" {
		if err := json.Unmarshal([]byte(itemsStr), &items); err != nil {
			return resultError(fmt.Sprintf("考核指标 items 格式错误: %v", err))
		}
	}
	createReq := &hrmsvc.CreatePerfRequest{
		Title:        title,
		EmployeeID:   employeeID,
		EmployeeName: req.GetString("employee_name", ""),
		DeptID:       hrmOptUint(req, "dept_id"),
		DeptName:     req.GetString("dept_name", ""),
		Period:       req.GetString("period", ""),
		StartDate:    startDate,
		EndDate:      endDate,
		ReviewerID:   hrmOptUint(req, "reviewer_id"),
		Items:        items,
	}
	p, err := svc.Create(ctx, createReq)
	if err != nil {
		return resultError(fmt.Sprintf("创建绩效考核失败: %v", err))
	}
	return resultText(p)
}

func handleHrmPerformanceSelfReview(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := hrmsvc.NewPerformanceService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("考核ID(id)必填")
	}
	reviewReq := &hrmsvc.SelfReviewRequest{
		SelfScore:   decimal.NewFromFloat(req.GetFloat("self_score", 0)),
		SelfComment: req.GetString("self_comment", ""),
	}
	if err := svc.SelfReview(ctx, id, reviewReq); err != nil {
		return resultError(fmt.Sprintf("自评失败: %v", err))
	}
	return resultText(map[string]any{"message": "自评已提交", "id": id})
}

func handleHrmPerformanceReview(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := hrmsvc.NewPerformanceService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("考核ID(id)必填")
	}
	reviewReq := &hrmsvc.ReviewRequest{
		ReviewScore:   decimal.NewFromFloat(req.GetFloat("review_score", 0)),
		ReviewComment: req.GetString("review_comment", ""),
		FinalScore:    decimal.NewFromFloat(req.GetFloat("final_score", 0)),
		Grade:         req.GetString("grade", ""),
	}
	if err := svc.Review(ctx, id, reviewReq); err != nil {
		return resultError(fmt.Sprintf("评审失败: %v", err))
	}
	return resultText(map[string]any{"message": "评审已完成", "id": id})
}

func handleHrmPerformanceDelete(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	svc := hrmsvc.NewPerformanceService()
	id := uint(req.GetFloat("id", 0))
	if id == 0 {
		return resultError("考核ID(id)必填")
	}
	if err := svc.Delete(ctx, id); err != nil {
		return resultError(fmt.Sprintf("删除绩效考核失败: %v", err))
	}
	return resultText(map[string]any{"message": "绩效考核已删除", "id": id})
}

// ── HRM 半增量辅助函数 ──

// hrmOptUint 创建场景取可选 uint 指针(>0 才返回指针)。
func hrmOptUint(req mcp.CallToolRequest, key string) *uint {
	if v := uint(req.GetFloat(key, 0)); v > 0 {
		return &v
	}
	return nil
}

// hrmHalfString 半增量字符串:未提供则保留 existing。
func hrmHalfString(req mcp.CallToolRequest, key, existing string) string {
	if args := req.GetArguments(); args != nil {
		if _, ok := args[key]; ok {
			return req.GetString(key, "")
		}
	}
	return existing
}

// hrmHalfInt 半增量 int:未提供则保留 existing。
func hrmHalfInt(req mcp.CallToolRequest, key string, existing int) int {
	if args := req.GetArguments(); args != nil {
		if _, ok := args[key]; ok {
			return int(req.GetFloat(key, 0))
		}
	}
	return existing
}

// hrmHalfFloat 半增量 float64:未提供则保留 existing。
func hrmHalfFloat(req mcp.CallToolRequest, key string, existing float64) float64 {
	if args := req.GetArguments(); args != nil {
		if _, ok := args[key]; ok {
			return req.GetFloat(key, 0)
		}
	}
	return existing
}

// hrmHalfUintPtr 半增量 uint 指针:未提供则保留 existing;提供 0 视为清空(nil);>0 设值。
func hrmHalfUintPtr(req mcp.CallToolRequest, key string, existing *uint) *uint {
	if args := req.GetArguments(); args != nil {
		if _, ok := args[key]; ok {
			v := uint(req.GetFloat(key, 0))
			if v > 0 {
				return &v
			}
			return nil
		}
	}
	return existing
}
