package oa

import (
	"qzt-go-server/internal/model/base"
)

// meeting_room.go OA 会议室 model。
// 表由 docs/sql/oa_office.sql 建立,不用 AutoMigrate。

// OaMeetingRoom 会议室台账。
type OaMeetingRoom struct {
	ID        uint   `json:"id" gorm:"primaryKey"`
	Name      string `json:"name" gorm:"size:100;not null;comment:会议室名称"`
	Location  string `json:"location" gorm:"size:200;comment:位置"`
	Capacity  int    `json:"capacity" gorm:"not null;default:0;comment:容纳人数"`
	Equipment string `json:"equipment" gorm:"size:500;comment:设备(逗号分隔)"`
	Status    string `json:"status" gorm:"size:16;not null;default:ENABLED;index;comment:状态(ENABLED/DISABLED/MAINTENANCE)"`
	Remark    string `json:"remark" gorm:"size:500;comment:备注"`
	base.BaseModel
}

func (OaMeetingRoom) TableName() string { return "oa_meeting_room" }
