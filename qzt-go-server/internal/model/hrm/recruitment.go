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
	// 职位编号
	JobNo        string          `json:"job_no" gorm:"size:64;uniqueIndex;not null;comment:职位编号"`
	// 职位名称
	Title        string          `json:"title" gorm:"size:200;not null;comment:职位名称"`
	// 部门ID
	DeptID       *uint           `json:"dept_id" gorm:"index;comment:部门ID"`
	// 部门名称
	DeptName     string          `json:"dept_name" gorm:"size:200;comment:部门名称"`
	// 岗位ID
	PositionID   *uint           `json:"position_id" gorm:"comment:岗位ID"`
	// 招聘人数
	Headcount    int             `json:"headcount" gorm:"default:1;comment:招聘人数"`
	// 薪资范围
	SalaryRange  string          `json:"salary_range" gorm:"size:100;comment:薪资范围"`
	// 学历要求
	Education    string          `json:"education" gorm:"size:32;comment:学历要求"`
	// 经验要求
	Experience   string          `json:"experience" gorm:"size:100;comment:经验要求"`
	// 职位描述
	Description  string          `json:"description" gorm:"size:2000;comment:职位描述"`
	// 任职要求
	Requirement  string          `json:"requirement" gorm:"size:2000;comment:任职要求"`
	// 招聘负责人ID
	HiringManagerID *uint        `json:"hiring_manager_id" gorm:"comment:招聘负责人ID"`
	// 1草稿2招聘3暂停4关闭5满编
	Status       int8            `json:"status" gorm:"default:1;index;comment:1草稿2招聘3暂停4关闭5满编"`
	// 发布日期
	PublishDate  xtime.NullDateTime `json:"publish_date" gorm:"type:date;comment:发布日期"`
	base.BaseModel
}

func (HrmJob) TableName() string { return "hrm_job" }

// HrmCandidate 候选人。
type HrmCandidate struct {
	ID          uint   `json:"id" gorm:"primaryKey"`
	// 职位ID
	JobID       uint   `json:"job_id" gorm:"index;not null;comment:职位ID"`
	// 姓名
	Name        string `json:"name" gorm:"size:100;not null;comment:姓名"`
	// 电话
	Phone       string `json:"phone" gorm:"size:50;comment:电话"`
	// 邮箱
	Email       string `json:"email" gorm:"size:100;comment:邮箱"`
	// 性别
	Gender      string `json:"gender" gorm:"size:10;comment:性别"`
	// 年龄
	Age         int    `json:"age" gorm:"comment:年龄"`
	// 学历
	Education   string `json:"education" gorm:"size:32;comment:学历"`
	// 工作年限
	Experience  string `json:"experience" gorm:"size:100;comment:工作年限"`
	// 当前公司
	Company     string `json:"company" gorm:"size:200;comment:当前公司"`
	// 简历链接
	ResumeURL   string `json:"resume_url" gorm:"size:500;comment:简历链接"`
	// 1新简历2筛选3面试4offer5录用6淘汰
	Status      int8   `json:"status" gorm:"default:1;index;comment:1新简历2筛选3面试4offer5录用6淘汰"`
	// 来源
	Source      string `json:"source" gorm:"size:100;comment:来源"`
	// 面试时间
	InterviewDate string `json:"interview_date" gorm:"size:32;comment:面试时间"`
	// 备注
	Remark      string `json:"remark" gorm:"size:1000;comment:备注"`
	// 评估人ID
	EvaluatorID *uint  `json:"evaluator_id" gorm:"comment:评估人ID"`
	base.BaseModel
}

func (HrmCandidate) TableName() string { return "hrm_candidate" }
