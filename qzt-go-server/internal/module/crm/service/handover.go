package service

// handover.go 离职交接:批量转移用户名下的所有业务资源给接收人。

import (
	"context"
	"fmt"

	"qzt-go-server/internal/model/approval"
	"qzt-go-server/internal/repository"
	crrepo "qzt-go-server/internal/repository/crm"
	"qzt-go-server/pkg/xlogger"
)

// HandoverService 离职交接服务。
type HandoverService struct{}

func NewHandoverService() *HandoverService {
	return &HandoverService{}
}

// HandoverRequest 离职交接请求。
type HandoverRequest struct {
	FromUserID uint `json:"from_user_id" binding:"required"` // 离职人
	ToUserID   uint `json:"to_user_id" binding:"required"`   // 接收人
}

// HandoverResult 交接结果统计。
type HandoverResult struct {
	Customer     int64 `json:"customer"`      // 转移的客户数
	Lead         int64 `json:"lead"`          // 转移的线索数
	Opportunity  int64 `json:"opportunity"`   // 转移的商机数
	Contract     int64 `json:"contract"`      // 转移的合同数
	FollowRec    int64 `json:"follow_record"` // 转移的跟进记录数
	FollowPlan   int64 `json:"follow_plan"`   // 转移的跟进计划数
	Collab       int64 `json:"collaboration"` // 转移的客户协作数
	Ticket       int64 `json:"ticket"`        // 转移的工单数(处理人)
	ContractTpl  int64 `json:"contract_tpl"`  // 转移的合同模板数
	Project      int64 `json:"project"`       // 转移的项目数(负责人)
	Task         int64 `json:"task"`          // 转移的任务数(执行人)
	ApprovalTask int64 `json:"approval_task"` // 转移的待办审批数(未办结)
	CloudFile    int64 `json:"cloud_file"`    // 转移的云盘文件数
	Asset        int64 `json:"asset"`         // 转移的资产数(使用人)
	Warehouse    int64 `json:"warehouse"`     // 转移的仓库数(管理员)
}

// Handover 批量转移 fromUserID 名下的所有业务资源到 toUserID。
// 批量 UPDATE 走 repository(不走单条 Transfer,性能高)。
//
// 范围:CRM(客户/线索/商机/合同/跟进/协作/工单/合同模板)、项目/任务、
// 未办结审批任务、云盘文件、资产使用人、仓库管理员。
// 不转移:个人 OA 数据(日程/工作日志/报销/差旅/借款)、组织架构(部门负责人/直属上级)、
// 知识库文档(共享内容)、已办结审批(历史事实)。
func (s *HandoverService) Handover(ctx context.Context, req *HandoverRequest) (*HandoverResult, error) {
	if req.FromUserID == req.ToUserID {
		return nil, fmt.Errorf("离职人和接收人不能是同一人")
	}

	result := &HandoverResult{}

	// 客户协作有 uk_customer_user 唯一键:接收人已协作的行先删,否则整批 UPDATE 失败
	if _, err := crrepo.DeleteDuplicatedCollaboration(ctx, req.FromUserID, req.ToUserID); err != nil {
		return nil, fmt.Errorf("清理重复客户协作失败: %v", err)
	}

	// 按表批量更新归属字段,统计影响行数
	updates := []struct {
		table   string
		field   string // 归属字段名
		counter *int64
	}{
		// ── CRM ──
		{"crm_customer", "owner_id", &result.Customer},
		{"crm_lead", "owner_id", &result.Lead},
		{"crm_opportunity", "owner_id", &result.Opportunity},
		{"crm_contract", "owner_id", &result.Contract},
		{"follow_up_record", "owner_id", &result.FollowRec},
		{"follow_up_plan", "owner_id", &result.FollowPlan},
		{"crm_customer_collaboration", "user_id", &result.Collab},
		{"crm_ticket", "handler_id", &result.Ticket},
		{"crm_contract_template", "owner_id", &result.ContractTpl},
		// ── 项目 ──
		{"proj_project", "manager_id", &result.Project},
		{"proj_task", "assignee_id", &result.Task},
		// ── 云盘/进销存 ──
		{"cloud_file", "owner_id", &result.CloudFile},
		{"psi_asset", "owner_id", &result.Asset},
		{"psi_warehouse", "manager_id", &result.Warehouse},
	}

	for _, u := range updates {
		n, err := repository.TransferColumnOwnerWhere(ctx, u.table, u.field, req.FromUserID, req.ToUserID, "")
		if err != nil {
			xlogger.ErrorfCtx(ctx, "离职交接失败 table=%s: %v", u.table, err)
			return nil, fmt.Errorf("转移%s失败: %v", u.table, err)
		}
		*u.counter = n
	}

	// 未办结的审批任务转移给接收人(已办结的历史任务保留原审批人)
	n, err := repository.TransferColumnOwnerWhere(ctx, "approval_task", "approver_id",
		req.FromUserID, req.ToUserID,
		"status IN (?)", []string{approval.TaskStatusPending, approval.TaskStatusApproving})
	if err != nil {
		xlogger.ErrorfCtx(ctx, "离职交接失败 table=approval_task: %v", err)
		return nil, fmt.Errorf("转移待办审批失败: %v", err)
	}
	result.ApprovalTask = n

	// 同步转移跟进人(follower_id,失败不影响主流程)
	for _, table := range []string{"crm_customer", "crm_lead", "crm_opportunity", "crm_contract"} {
		_, _ = repository.TransferColumnOwnerWhere(ctx, table, "follower_id", req.FromUserID, req.ToUserID, "")
	}

	// 记录客户归属历史(批量,失败不影响主流程)
	_ = crrepo.BatchInsertTransferHistory(ctx, req.FromUserID, req.ToUserID)

	return result, nil
}
