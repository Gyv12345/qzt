package model

// login_log.go 登录日志(独立于操作日志,专门记录登录/登出事件)。

import "qzt-go-server/internal/model/base"

// SysLoginLog 登录日志。
type SysLoginLog struct {
	ID        uint   `json:"id" gorm:"primaryKey"`
	UserID    uint   `json:"user_id" gorm:"index;comment:用户ID(失败登录为0)"`
	Username  string `json:"username" gorm:"size:64;index;comment:用户名"`
	Action    string `json:"action" gorm:"size:32;comment:动作(登录/登出/企业微信扫码登录)"`
	Success   bool   `json:"success" gorm:"index;comment:是否成功"`
	ClientIP  string `json:"client_ip" gorm:"size:64;index;comment:客户端IP"`
	Region    string `json:"region" gorm:"-"` // IP 归属地(查询时由 ipregion 解析填充,不入库)
	UserAgent string `json:"user_agent" gorm:"size:255;comment:User-Agent"`
	ErrorMsg  string `json:"error_msg" gorm:"type:text;comment:失败原因"`
	base.BaseModel
}

func (SysLoginLog) TableName() string { return "sys_login_log" }
