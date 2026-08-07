package hrm

import (
	"github.com/shopspring/decimal"

	"qzt-go-server/internal/model/base"
	"qzt-go-server/pkg/xtime"
)

// performance.go HRM 绩效考核 model。
// 表由 docs/sql/hrm_performance.sql 建立,不用 AutoMigrate。

// 考核状态。
const (
	PerfStatusDraft    = 1 // 草稿
	PerfStatusActive   = 2 // 进行中
	PerfStatusSelfDone = 3 // 自评完成
	PerfStatusReview   = 4 // 上级评审中
	PerfStatusDone     = 5 // 已完成
	PerfStatusCanceled = 6 // 已取消
)

// HrmPerformance 考核计划(一人一周期一条)。
type HrmPerformance struct {
	ID            uint            `json:"id" gorm:"primaryKey"`
	PerfNo        string          `json:"perf_no" gorm:"size:64;uniqueIndex;not null;comment:考核编号"`
	Title         string          `json:"title" gorm:"size:200;not null;comment:考核标题"`
	EmployeeID    uint            `json:"employee_id" gorm:"index;not null;comment:被考核人ID"`
	EmployeeName  string          `json:"employee_name" gorm:"size:200;comment:员工姓名"`
	DeptID        *uint           `json:"dept_id" gorm:"index;comment:部门ID"`
	DeptName      string          `json:"dept_name" gorm:"size:200;comment:部门名称"`
	Period        string          `json:"period" gorm:"size:20;index;comment:考核周期(如 2026-Q3)"`
	StartDate     xtime.DateTime  `json:"start_date" gorm:"type:date;comment:考核开始"`
	EndDate       xtime.DateTime  `json:"end_date" gorm:"type:date;comment:考核结束"`
	Status        int8            `json:"status" gorm:"default:1;index;comment:1草稿2进行3自评完成4评审中5完成6取消"`
	ReviewerID    *uint           `json:"reviewer_id" gorm:"comment:评审人ID"`
	// 自评
	SelfScore     decimal.Decimal `json:"self_score" gorm:"type:decimal(5,1);default:0;comment:自评得分"`
	SelfComment   string          `json:"self_comment" gorm:"size:2000;comment:自评说明"`
	SelfTime      xtime.NullDateTime `json:"self_time" gorm:"type:datetime;comment:自评时间"`
	// 上级评审
	ReviewScore   decimal.Decimal `json:"review_score" gorm:"type:decimal(5,1);default:0;comment:上级评分"`
	ReviewComment string          `json:"review_comment" gorm:"size:2000;comment:评审意见"`
	ReviewTime    xtime.NullDateTime `json:"review_time" gorm:"type:datetime;comment:评审时间"`
	// 最终
	FinalScore    decimal.Decimal `json:"final_score" gorm:"type:decimal(5,1);default:0;comment:最终得分"`
	Grade         string          `json:"grade" gorm:"size:10;comment:等级(A/B/C/D)"`
	base.BaseModel
}

func (HrmPerformance) TableName() string { return "hrm_performance" }

// HrmPerfItem 考核指标项。
type HrmPerfItem struct {
	ID           uint            `json:"id" gorm:"primaryKey"`
	PerfID       uint            `json:"perf_id" gorm:"index;not null;comment:考核ID"`
	ItemName     string          `json:"item_name" gorm:"size:200;not null;comment:指标名称"`
	Weight       decimal.Decimal `json:"weight" gorm:"type:decimal(5,2);default:0;comment:权重(%)"`
	TargetDesc   string          `json:"target_desc" gorm:"size:500;comment:目标说明"`
	SelfScore    decimal.Decimal `json:"self_score" gorm:"type:decimal(5,1);default:0;comment:自评得分"`
	ReviewScore  decimal.Decimal `json:"review_score" gorm:"type:decimal(5,1);default:0;comment:上级评分"`
	Remark       string          `json:"remark" gorm:"size:500;comment:备注"`
	base.BaseModel
}

func (HrmPerfItem) TableName() string { return "hrm_perf_item" }
