package enterprise

import "qzt-go-server/internal/model/base"

// job.go 定时任务(sys_job + sys_job_log)。
// 基于 DB 的动态 cron 调度:sys_job.bean_class 存「处理器注册名」,
// 由全局 JobHandler 注册表(map[string]JobHandler)查找执行(非反射)。

// 任务状态。
const (
	JobStatusPaused int8 = 0 // 暂停
	JobStatusRun    int8 = 1 // 运行
)

// 执行日志状态。
const (
	JobLogFail    int8 = 0 // 失败
	JobLogSuccess int8 = 1 // 成功
)

// 触发来源。
const (
	JobTriggerSchedule = "SCHEDULE" // 定时触发
	JobTriggerManual   = "MANUAL"   // 手动触发
)

// SysJob 定时任务配置。
type SysJob struct {
	ID             uint   `json:"id" gorm:"primaryKey"`
	// 任务名称
	JobName        string `json:"job_name" gorm:"size:100;not null;comment:任务名称"`
	// 任务分组
	JobGroup       string `json:"job_group" gorm:"size:50;index;comment:任务分组"`
	// Cron表达式(6段式 秒分时日月周)
	CronExpression string `json:"cron_expression" gorm:"size:100;comment:Cron表达式(6段式 秒分时日月周)"`
	// 执行处理器注册名
	BeanClass      string `json:"bean_class" gorm:"size:200;comment:执行处理器注册名"`
	// 状态(0暂停 1运行)
	Status         int8   `json:"status" gorm:"default:1;index;comment:状态(0暂停 1运行)"`
	// 备注
	Remark         string `json:"remark" gorm:"size:500;comment:备注"`
	base.BaseModel
}

func (SysJob) TableName() string { return "sys_job" }

// SysJobLog 任务执行日志。
type SysJobLog struct {
	ID            uint   `json:"id" gorm:"primaryKey"`
	// 任务ID
	JobID         uint   `json:"job_id" gorm:"index;not null;comment:任务ID"`
	// 任务名称
	JobName       string `json:"job_name" gorm:"size:100;comment:任务名称"`
	// 任务分组
	JobGroup      string `json:"job_group" gorm:"size:50;comment:任务分组"`
	// 执行处理器
	BeanClass     string `json:"bean_class" gorm:"size:200;comment:执行处理器"`
	// 触发来源(SCHEDULE/MANUAL)
	TriggerSource string `json:"trigger_source" gorm:"size:50;comment:触发来源(SCHEDULE/MANUAL)"`
	// 执行状态(1成功 0失败)
	Status        int8   `json:"status" gorm:"index;comment:执行状态(1成功 0失败)"`
	// 执行消息
	Message       string `json:"message" gorm:"size:500;comment:执行消息"`
	// 异常堆栈
	ExceptionInfo string `json:"exception_info" gorm:"type:text;comment:异常堆栈"`
	// 耗时(ms)
	CostTime      int64  `json:"cost_time" gorm:"comment:耗时(ms)"`
	base.BaseModel
}

func (SysJobLog) TableName() string { return "sys_job_log" }
