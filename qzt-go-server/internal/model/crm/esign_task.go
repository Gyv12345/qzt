package crm

import (
	"qzt-go-server/internal/model/base"
	"qzt-go-server/pkg/xtime"
)

// esign_task.go 电子签任务记录(容错:支持 cron 扫表重试)。
// 表由 docs/sql/esign.sql 建立,不用 AutoMigrate。

// 任务状态(半自动流程:审批通过→自动渲染PDF→停在 READY→用户补签署方→发起)。
const (
	EsignTaskPending   = "PENDING"   // 待处理(刚插入,等 cron 渲染 PDF)
	EsignTaskRunning   = "RUNNING"   // 渲染中(cron 占用,防并发重复处理)
	EsignTaskReady     = "READY"     // PDF 已生成,待补签署方(等用户填 signers)
	EsignTaskInitiated = "INITIATED" // 签署流程已创建(等签署方签)
	EsignTaskCompleted = "COMPLETED" // 全部签署完成
	EsignTaskFailed    = "FAILED"    // 失败(可重试或人工介入)
)

// CrmEsignTask 电子签任务。
type CrmEsignTask struct {
	ID          uint               `json:"id" gorm:"primaryKey"`
	// 合同ID
	ContractID  uint               `json:"contract_id" gorm:"not null;comment:合同ID"`
	// 合同模板ID
	TemplateID  uint               `json:"template_id" gorm:"not null;comment:合同模板ID"`
	// PENDING/RUNNING/READY/INITIATED/COMPLETED/FAILED
	Status      string             `json:"status" gorm:"size:16;default:PENDING;comment:PENDING/RUNNING/READY/INITIATED/COMPLETED/FAILED"`
	// e签宝流程ID
	FlowID      string             `json:"flow_id" gorm:"size:64;comment:e签宝流程ID"`
	// 生成PDF私有桶key
	FileKey     string             `json:"file_key" gorm:"size:255;comment:生成PDF私有桶key"`
	// 签署短链
	SignURL     string             `json:"sign_url" gorm:"size:500;comment:签署短链"`
	// 签署方JSON
	Signers     string             `json:"signers" gorm:"type:text;comment:签署方JSON"`
	RetryCount  int                `json:"retry_count" gorm:"default:0"`
	// 下次重试时间
	NextRetryAt xtime.NullDateTime `json:"next_retry_at" gorm:"type:datetime;comment:下次重试时间"`
	// 最近错误
	Error       string             `json:"error" gorm:"size:500;comment:最近错误"`
	base.BaseModel
}

func (CrmEsignTask) TableName() string { return "crm_esign_task" }

// 合同电子签状态(CrmContract.EsignStatus 取值)。
const (
	ContractEsignNone      = "NONE"      // 未开启/未发起
	ContractEsignInitiated = "INITIATED" // 已发起(流程创建)
	ContractEsignSigning   = "SIGNING"   // 签署中
	ContractEsignSigned    = "SIGNED"    // 已签署完成
	ContractEsignFailed    = "FAILED"    // 失败
)
