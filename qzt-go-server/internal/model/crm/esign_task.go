package crm

import (
	"qzt-go-server/internal/model/base"
	"qzt-go-server/pkg/xtime"
)

// esign_task.go 电子签任务记录(容错:支持 cron 扫表重试)。
// 表由 docs/sql/esign.sql 建立,不用 AutoMigrate。

// 任务状态。
const (
	EsignTaskPending = "PENDING" // 待处理(刚插入,等 cron 扫到)
	EsignTaskRunning = "RUNNING" // 处理中(生成PDF+发起签署)
	EsignTaskSigned  = "SIGNED"  // 签署流程已创建(等签署方签)
	EsignTaskFailed  = "FAILED"  // 失败(可重试或人工介入)
)

// CrmEsignTask 电子签任务。
type CrmEsignTask struct {
	ID          uint64             `json:"id" gorm:"primaryKey"`
	ContractID  uint               `json:"contract_id" gorm:"not null;comment:合同ID"`
	TemplateID  uint               `json:"template_id" gorm:"not null;comment:合同模板ID"`
	Status      string             `json:"status" gorm:"size:16;default:PENDING;comment:PENDING/RUNNING/SIGNED/FAILED"`
	FlowID      string             `json:"flow_id" gorm:"size:64;comment:e签宝流程ID"`
	FileKey     string             `json:"file_key" gorm:"size:255;comment:生成PDF私有桶key"`
	SignURL     string             `json:"sign_url" gorm:"size:500;comment:签署短链"`
	Signers     string             `json:"signers" gorm:"type:text;comment:签署方JSON"`
	RetryCount  int                `json:"retry_count" gorm:"default:0"`
	NextRetryAt xtime.NullDateTime `json:"next_retry_at" gorm:"type:datetime;comment:下次重试时间"`
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
