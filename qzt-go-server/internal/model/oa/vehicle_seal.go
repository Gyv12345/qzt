package oa

import (
	"qzt-go-server/internal/model/base"
	"qzt-go-server/pkg/xtime"
)

// vehicle_seal.go OA 用车/印章 model。
// 表由 docs/sql/oa_vehicle_seal.sql 建立,不用 AutoMigrate。

// OaVehicle 车辆台账。
type OaVehicle struct {
	ID uint `json:"id" gorm:"primaryKey"`
	// 车牌号
	PlateNo string `json:"plate_no" gorm:"size:20;uniqueIndex;not null;comment:车牌号"`
	// 车型
	VehicleModel string `json:"vehicle_model" gorm:"size:100;comment:车型"`
	// 座位数
	Seats int `json:"seats" gorm:"default:5;comment:座位数"`
	// 状态:IDLE空闲/IN_USE使用中/MAINTENANCE/disabled停用
	Status string `json:"status" gorm:"size:20;default:IDLE;index;comment:状态:IDLE空闲/IN_USE使用中/MAINTENANCE维修中/DISABLED停用"`
	// 责任人ID(sys_user)
	OwnerID *uint `json:"owner_id" gorm:"index;comment:责任人ID"`
	// 备注
	Remark string `json:"remark" gorm:"size:500;comment:备注"`
	base.BaseModel
}

func (OaVehicle) TableName() string { return "oa_vehicle" }

// OaVehicleApplication 用车申请单。
type OaVehicleApplication struct {
	ID uint `json:"id" gorm:"primaryKey"`
	// 用车申请单号
	ApplicationNo string `json:"application_no" gorm:"size:64;uniqueIndex;not null;comment:用车申请单号"`
	// 申请标题
	Title string `json:"title" gorm:"size:200;not null;comment:申请标题"`
	// 申请人ID
	ApplicantID uint `json:"applicant_id" gorm:"index;not null;comment:申请人ID"`
	// 部门ID
	DeptID *uint `json:"dept_id" gorm:"index;comment:部门ID"`
	// 车辆ID
	VehicleID uint `json:"vehicle_id" gorm:"index;not null;comment:车辆ID"`
	// 用车事由
	Reason string `json:"reason" gorm:"size:500;not null;comment:用车事由"`
	// 出发时间
	StartTime xtime.DateTime `json:"start_time" gorm:"not null;comment:出发时间"`
	// 预计归还时间
	EndTime xtime.DateTime `json:"end_time" gorm:"not null;comment:预计归还时间"`
	// 随行人数
	Passengers int `json:"passengers" gorm:"default:1;comment:随行人数"`
	// 目的地
	Destination string `json:"destination" gorm:"size:200;comment:目的地"`
	// 审批状态(引擎回写)
	ApprovalStatus string `json:"approval_status" gorm:"size:20;default:NONE;index;comment:审批状态"`
	// 业务状态:1用车中 2已归还
	Status int8 `json:"status" gorm:"default:1;comment:业务状态:1用车中 2已归还"`
	base.BaseModel
}

func (OaVehicleApplication) TableName() string { return "oa_vehicle_application" }

// OaSeal 印章台账。
type OaSeal struct {
	ID uint `json:"id" gorm:"primaryKey"`
	// 印章名称
	Name string `json:"name" gorm:"size:100;uniqueIndex;not null;comment:印章名称"`
	// 类型:OFFICIAL公章/CONTRACT合同章/FINANCE财务章/LEGAL法人章/OTHER其他
	Type string `json:"type" gorm:"size:20;default:OFFICIAL;comment:类型:OFFICIAL公章/CONTRACT合同章/FINANCE财务章/LEGAL法人章/OTHER其他"`
	// 保管人ID(sys_user)
	KeeperID *uint `json:"keeper_id" gorm:"index;comment:保管人ID"`
	// 状态:1启用 2停用
	Status int8 `json:"status" gorm:"default:1;comment:状态:1启用 2停用"`
	// 备注
	Remark string `json:"remark" gorm:"size:500;comment:备注"`
	base.BaseModel
}

func (OaSeal) TableName() string { return "oa_seal" }

// OaSealApplication 用印申请单。
type OaSealApplication struct {
	ID uint `json:"id" gorm:"primaryKey"`
	// 用印申请单号
	ApplicationNo string `json:"application_no" gorm:"size:64;uniqueIndex;not null;comment:用印申请单号"`
	// 申请标题
	Title string `json:"title" gorm:"size:200;not null;comment:申请标题"`
	// 申请人ID
	ApplicantID uint `json:"applicant_id" gorm:"index;not null;comment:申请人ID"`
	// 部门ID
	DeptID *uint `json:"dept_id" gorm:"index;comment:部门ID"`
	// 印章ID
	SealID uint `json:"seal_id" gorm:"index;not null;comment:印章ID"`
	// 用印事由
	Reason string `json:"reason" gorm:"size:500;not null;comment:用印事由"`
	// 文件名称
	DocumentName string `json:"document_name" gorm:"size:200;comment:文件名称"`
	// 份数
	Copies int `json:"copies" gorm:"default:1;comment:份数"`
	// 用印日期
	SealDate xtime.DateTime `json:"seal_date" gorm:"not null;comment:用印日期"`
	// 审批状态(引擎回写)
	ApprovalStatus string `json:"approval_status" gorm:"size:20;default:NONE;index;comment:审批状态"`
	base.BaseModel
}

func (OaSealApplication) TableName() string { return "oa_seal_application" }
