package oa

import (
	"qzt-go-server/internal/model/base"
	"qzt-go-server/pkg/xtime"
)

// trip.go OA 出差申请 model。
// 表由 docs/sql/oa_trip.sql 建立,不用 AutoMigrate。

// OaBusinessTrip 出差申请单。
type OaBusinessTrip struct {
	ID             uint           `json:"id" gorm:"primaryKey"`
	// 出差单号
	TripNo         string         `json:"trip_no" gorm:"size:64;uniqueIndex;not null;comment:出差单号"`
	// 出差标题
	Title          string         `json:"title" gorm:"size:200;not null;comment:出差标题"`
	// 申请人ID
	ApplicantID    uint           `json:"applicant_id" gorm:"index;not null;comment:申请人ID"`
	// 部门ID
	DeptID         *uint          `json:"dept_id" gorm:"index;comment:部门ID"`
	// 目的地
	Destination    string         `json:"destination" gorm:"size:200;not null;comment:目的地"`
	// 出差目的
	Purpose        string         `json:"purpose" gorm:"size:500;comment:出差目的"`
	// 出发日期
	StartDate      xtime.DateTime `json:"start_date" gorm:"type:date;not null;comment:出发日期"`
	// 返回日期
	EndDate        xtime.DateTime `json:"end_date" gorm:"type:date;not null;comment:返回日期"`
	// 交通方式(字典 TRIP_TRANSPORT)
	Transport      string         `json:"transport" gorm:"size:32;comment:交通方式(字典 TRIP_TRANSPORT)"`
	// 预算金额(decimal 字符串)
	BudgetAmount   string         `json:"budget_amount" gorm:"size:32;comment:预算金额(decimal 字符串)"`
	// 备注说明
	Description    string         `json:"description" gorm:"size:1000;comment:备注说明"`
	// 审批状态
	ApprovalStatus string         `json:"approval_status" gorm:"size:20;default:NONE;index;comment:审批状态"`
	base.BaseModel
}

func (OaBusinessTrip) TableName() string { return "oa_business_trip" }
