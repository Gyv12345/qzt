package workflow

import (
	"qzt-go-server/internal/model/base"
	"qzt-go-server/pkg/xtime"
)

// workflow.go 自动化工作流模型(P27)。
// 表由 docs/sql/workflow.sql 建立,不用 AutoMigrate。

// WorkflowDefinition 自动化工作流定义。
type WorkflowDefinition struct {
	ID uint `json:"id" gorm:"primaryKey"`
	// 名称
	Name string `json:"name" gorm:"size:100;not null;comment:名称"`
	// 描述
	Description string `json:"description" gorm:"size:500;comment:描述"`
	// 触发类型:MANUAL手动/CRON定时/EVENT事件
	TriggerType string `json:"trigger_type" gorm:"size:20;not null;default:MANUAL;index:idx_workflow_definition_trigger,priority:1;comment:触发类型"`
	// 触发配置 JSON:CRON={"cron":"0 0 9 * * *"};EVENT={"event":"crm.lead.created"}
	TriggerConfig string `json:"trigger_config" gorm:"type:text;comment:触发配置JSON"`
	// 画布节点图 JSON(nodes/links 平面图)
	Graph string `json:"graph" gorm:"type:text;comment:画布节点图JSON"`
	// 启用:1是 0否
	Enabled int8 `json:"enabled" gorm:"default:0;index:idx_workflow_definition_trigger,priority:2;comment:启用"`
	// 创建人ID(sys_user)
	OwnerID *uint `json:"owner_id" gorm:"comment:创建人ID"`
	// 最近运行时间
	LastRunAt *xtime.DateTime `json:"last_run_at" gorm:"comment:最近运行时间"`
	// 累计运行次数
	RunCount int64 `json:"run_count" gorm:"default:0;comment:累计运行次数"`
	base.BaseModel
}

func (WorkflowDefinition) TableName() string { return "workflow_definition" }

// WorkflowRun 执行记录。
type WorkflowRun struct {
	ID uint `json:"id" gorm:"primaryKey"`
	// 工作流定义ID
	DefinitionID uint `json:"definition_id" gorm:"index;not null;comment:工作流定义ID"`
	// 触发来源:MANUAL/CRON/EVENT
	TriggerSource string `json:"trigger_source" gorm:"size:20;not null;comment:触发来源"`
	// 触发参数 JSON(事件上下文快照)
	TriggerPayload string `json:"trigger_payload" gorm:"type:text;comment:触发参数JSON"`
	// 状态:RUNNING/SUCCESS/FAILED
	Status string `json:"status" gorm:"size:20;default:RUNNING;index;comment:状态"`
	// 节点执行轨迹 JSON:[{number,name,node_type,status,output,error}]
	NodeTrace string `json:"node_trace" gorm:"type:text;comment:节点执行轨迹JSON"`
	// 失败原因
	Error string `json:"error" gorm:"size:1000;comment:失败原因"`
	// 耗时毫秒
	CostMs int64 `json:"cost_ms" gorm:"default:0;comment:耗时毫秒"`
	base.BaseModel
}

func (WorkflowRun) TableName() string { return "workflow_run" }

// —— 画布图数据结构(与审批流 SaveDesignRequest 同构的平面图) ——

// GraphNode 画布节点。
type GraphNode struct {
	// 节点编号(图内唯一,如 start/n1/c1)
	Number string `json:"number"`
	// 节点名称
	Name string `json:"name"`
	// 节点类型:TRIGGER/ACTION/CONDITION
	NodeType string `json:"node_type"`
	// 节点配置(按 NodeType 与 ACTION 的 config.action 决定结构)
	Config map[string]any `json:"config"`
}

// GraphLink 画布连线。CONDITION 的多条出边按 sort 顺序对应 branches[i];When 为空表示兜底边。
type GraphLink struct {
	From string `json:"from"`
	To   string `json:"to"`
	Sort int    `json:"sort"`
	// 分支标记:CONDITION 出边为分支序号字符串("0"/"1"/...),空串=兜底边
	When string `json:"when,omitempty"`
}

// Graph 画布节点图。
type Graph struct {
	Nodes []GraphNode `json:"nodes"`
	Links []GraphLink `json:"links"`
}

// 节点类型常量。
const (
	NodeTypeTrigger   = "TRIGGER"
	NodeTypeAction    = "ACTION"
	NodeTypeCondition = "CONDITION"
)

// 动作类型常量(ACTION 节点 config.action)。
const (
	ActionNotify      = "notify"
	ActionFieldUpdate = "field_update"
	ActionHTTP        = "http"
	ActionLLM         = "llm"
)

// 触发类型常量。
const (
	TriggerManual = "MANUAL"
	TriggerCron   = "CRON"
	TriggerEvent  = "EVENT"
)

// 执行状态常量。
const (
	RunStatusRunning = "RUNNING"
	RunStatusSuccess = "SUCCESS"
	RunStatusFailed  = "FAILED"
)

// NodeTrace 单节点执行轨迹(JSON 存入 workflow_run.node_trace)。
type NodeTrace struct {
	Number   string         `json:"number"`
	Name     string         `json:"name"`
	NodeType string         `json:"node_type"`
	Status   string         `json:"status"`
	Output   map[string]any `json:"output,omitempty"`
	Error    string         `json:"error,omitempty"`
}

// BranchCondition 条件分支的单条条件(模板变量两侧均可)。
type BranchCondition struct {
	Left  string `json:"left"`
	Op    string `json:"op"`
	Right string `json:"right"`
}

// ConditionConfig CONDITION 节点配置。
type ConditionConfig struct {
	// 逻辑:AND/OR(分支内多条件)
	Logic string `json:"logic"`
	// 分支列表(索引与出边 sort/when 对应)
	Branches []ConditionBranch `json:"branches"`
}

// ConditionBranch 条件分支。
type ConditionBranch struct {
	// 分支名(展示用)
	Label string `json:"label"`
	// 条件列表
	Conditions []BranchCondition `json:"conditions"`
}
