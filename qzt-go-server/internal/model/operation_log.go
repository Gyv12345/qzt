package model

// SysOperationLog 操作审计日志，记录一次写操作（或登录/登出）。
// 请求/响应参数在中间件中脱敏并截断后写入；通过 Unscoped 硬删除做保留期清理。
type SysOperationLog struct {
	ID         uint   `json:"id" gorm:"primaryKey"`
	// 链路ID，关联应用日志
	TraceID    string `json:"trace_id" gorm:"size:32;comment:链路ID，关联应用日志"`
	// 操作人ID
	UserID     uint   `json:"user_id" gorm:"index;comment:操作人ID"`
	// 操作人用户名(冗余存储)
	Username   string `json:"username" gorm:"size:64;comment:操作人用户名(冗余存储)"`
	// 操作人角色快照(逗号分隔)
	RoleCodes  string `json:"role_codes" gorm:"size:255;comment:操作人角色快照(逗号分隔)"`
	// 所属模块(取自sys_api.group)
	Module     string `json:"module" gorm:"size:64;index;comment:所属模块(取自sys_api.group)"`
	// 操作描述(取自sys_api.description)
	Action     string `json:"action" gorm:"size:128;comment:操作描述(取自sys_api.description)"`
	// HTTP方法
	Method     string `json:"method" gorm:"size:16;comment:HTTP方法"`
	// 路由模板
	Route      string `json:"route" gorm:"size:255;comment:路由模板"`
	// 实际请求路径
	Path       string `json:"path" gorm:"size:255;comment:实际请求路径"`
	// 目标资源ID
	TargetID   string `json:"target_id" gorm:"size:64;comment:目标资源ID"`
	// 请求参数(脱敏+截断)
	ReqParams  string `json:"req_params" gorm:"type:text;comment:请求参数(脱敏+截断)"`
	// 响应参数(脱敏+截断)
	RespParams string `json:"resp_params" gorm:"type:text;comment:响应参数(脱敏+截断)"`
	// HTTP状态码
	Status     int    `json:"status" gorm:"comment:HTTP状态码"`
	// 业务返回码
	BizCode    int    `json:"biz_code" gorm:"comment:业务返回码"`
	// 是否成功
	Success    bool   `json:"success" gorm:"index;comment:是否成功"`
	// 失败信息
	ErrorMsg   string `json:"error_msg" gorm:"type:text;comment:失败信息"`
	// 客户端IP
	ClientIP   string `json:"client_ip" gorm:"size:64;index;comment:客户端IP"`
	// User-Agent
	UserAgent  string `json:"user_agent" gorm:"size:255;comment:User-Agent"`
	// 耗时(毫秒)
	LatencyMs  int64  `json:"latency_ms" gorm:"comment:耗时(毫秒)"`
	BaseModel
}

func (SysOperationLog) TableName() string {
	return "sys_operation_log"
}
