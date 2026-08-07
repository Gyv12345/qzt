package hrm

import (
	"qzt-go-server/internal/model/base"
	"qzt-go-server/pkg/xtime"
)

// recruitment.go HRM 招聘管理 model。
// 表由 docs/sql/hrm_recruitment.sql 建立,不用 AutoMigrate。

// 职位状态。
const (
	JobStatusDraft     = 1 // 草稿
	JobStatusOpen      = 2 // 招聘中
	JobStatusPaused    = 3 // 暂停
	JobStatusClosed    = 4 // 已关闭
	JobStatusFilled    = 5 // 已满编
)

// 候选人状态。
const (
	CandidateStatusNew       = 1 // 新简历
	CandidateStatusScreening = 2 // 筛选中
	CandidateStatusInterview = 3 // 面试中
	CandidateStatusOffer     = 4 // 已发 offer
	CandidateStatusHired     = 5 // 已录用
	CandidateStatusRejected  = 6 // 已淘汰
)

// HrmJob 招聘职位。
type HrmJob struct {
	ID           uint            `json:"id" gorm:"primaryKey"`
	JobNo        string          `json:"job_no" gorm:"size:64;uniqueIndex;not null;comment:职位编号"`
	Title        string          `json:"title" gorm:"size:200;not null;comment:职位名称"`
	DeptID       *uint           `json:"dept_id" gorm:"index;comment:部门ID"`
	DeptName     string          `json:"dept_name" gorm:"size:200;comment:部门名称"`
	PositionID   *uint           `json:"position_id" gorm:"comment:岗位ID"`
	Headcount    int             `json:"headcount" gorm:"default:1;comment:招聘人数"`
	SalaryRange  string          `json:"salary_range" gorm:"size:100;comment:薪资范围"`
	Education    string          `json:"education" gorm:"size:32;comment:学历要求"`
	Experience   string          `json:"experience" gorm:"size:100;comment:经验要求"`
	Description  string          `json:"description" gorm:"size:2000;comment:职位描述"`
	Requirement  string          `json:"requirement" gorm:"size:2000;comment:任职要求"`
	HiringManagerID *uint        `json:"hiring_manager_id" gorm:"comment:招聘负责人ID"`
	Status       int8            `json:"status" gorm:"default:1;index;comment:1草稿2招聘3暂停4关闭5满编"`
	PublishDate  xtime.NullDateTime `json:"publish_date" gorm:"type:date;comment:发布日期"`
	base.BaseModel
}

func (HrmJob) TableName() string { return "hrm_job" }

// HrmCandidate 候选人。
type HrmCandidate struct {
	ID          uint   `json:"id" gorm:"primaryKey"`
	JobID       uint   `json:"job_id" gorm:"index;not null;comment:职位ID"`
	Name        string `json:"name" gorm:"size:100;not null;comment:姓名"`
	Phone       string `json:"phone" gorm:"size:50;comment:电话"`
	Email       string `json:"email" gorm:"size:100;comment:邮箱"`
	Gender      string `json:"gender" gorm:"size:10;comment:性别"`
	Age         int    `json:"age" gorm:"comment:年龄"`
	Education   string `json:"education" gorm:"size:32;comment:学历"`
	Experience  string `json:"experience" gorm:"size:100;comment:工作年限"`
	Company     string `json:"company" gorm:"size:200;comment:当前公司"`
	ResumeURL   string `json:"resume_url" gorm:"size:500;comment:简历链接"`
	Status      int8   `json:"status" gorm:"default:1;index;comment:1新简历2筛选3面试4offer5录用6淘汰"`
	Source      string `json:"source" gorm:"size:100;comment:来源"`
	InterviewDate string `json:"interview_date" gorm:"size:32;comment:面试时间"`
	Remark      string `json:"remark" gorm:"size:1000;comment:备注"`
	EvaluatorID *uint  `json:"evaluator_id" gorm:"comment:评估人ID"`
	base.BaseModel
}

func (HrmCandidate) TableName() string { return "hrm_candidate" }
