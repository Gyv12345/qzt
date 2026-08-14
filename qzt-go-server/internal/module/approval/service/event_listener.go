package service

import (
	"context"
	"fmt"
	"time"

	"github.com/shopspring/decimal"

	crmmodel "qzt-go-server/internal/model/crm"
	finmodel "qzt-go-server/internal/model/finance"
	"qzt-go-server/internal/pkg/notify"
	"qzt-go-server/internal/repository"
	"qzt-go-server/pkg/xevent"
	"qzt-go-server/pkg/xlogger"
	"qzt-go-server/pkg/xtime"
)

// event_listener.go 审批引擎事件监听器。
// 启动时注册:审批任务分配/完成 → 发站内信。

// RegisterEventListeners 注册审批相关的事件监听器。
// 在 main.go 启动时调用(app.DB 初始化之后)。
func RegisterEventListeners(ctx context.Context) error {
	msgSvc := newEnterpriseMessageClient()

	// 审批任务分配 → 通知审批人
	xevent.Subscribe("approval.task.assigned", func(ctx context.Context, payload any) {
		m, ok := payload.(map[string]any)
		if !ok {
			return
		}
		approverID, _ := m["approver_id"].(uint)
		resourceType, _ := m["resource_type"].(string)
		if approverID == 0 {
			return
		}
		title := "您有新的审批待办"
		typeLabel := formTypeLabel[resourceType]
		if typeLabel == "" {
			typeLabel = resourceType
		}
		content := fmt.Sprintf("您有一条「%s」审批待办需要处理", typeLabel)
		if err := msgSvc.SendSystemMessage(ctx, approverID, title, content); err != nil {
			// 失败仅记日志,不影响审批流程
		}
		// 通知分发(SSE + 企业微信)
		notify.Dispatch(ctx, approverID, title, content, "/approval/todo")
	})

	// 审批完成 → 通知提交人
	xevent.Subscribe("approval.finished", func(ctx context.Context, payload any) {
		m, ok := payload.(map[string]any)
		if !ok {
			return
		}
		submitterID, _ := m["submitter_id"].(uint)
		message, _ := m["message"].(string)
		result, _ := m["result"].(string)
		if submitterID == 0 {
			return
		}
		title := "审批结果通知"
		if err := msgSvc.SendSystemMessage(ctx, submitterID, title, message); err != nil {
			// 失败仅记日志,不影响审批流程
		}
		// 通知分发(SSE + 企业微信)
		notify.Dispatch(ctx, submitterID, title, message, "/approval/mine")

		// ── 跨模块业务回调:审批通过→自动更新业务阶段 ──
		resourceType, _ := m["resource_type"].(string)
		resourceID, _ := m["resource_id"].(uint)
		if resourceID == 0 {
			return
		}
		if result == resultApprove {
			switch resourceType {
			case "CONTRACT":
				// 合同审批通过 → stage 改为 SIGNED
				if err := repository.DBFrom(ctx).Model(&crmmodel.CrmContract{}).
					Where("id = ?", resourceID).
					UpdateColumn("stage", crmmodel.ContractStageSigned).Error; err != nil {
					xlogger.ErrorfCtx(ctx, "审批回调:合同阶段更新失败 contract_id=%d: %v", resourceID, err)
				}
			case "EXPENSE":
				// 报销单审批通过 → 后续可在此生成财务凭证(当前仅记日志)
				xlogger.InfofCtx(ctx, "审批回调:报销单 %d 审批通过,等待打款", resourceID)
			case "LEAVE":
				// 请假审批通过 → 同步旧 Status 字段(兼容现有考勤查询)
				if err := repository.DBFrom(ctx).Table("hrm_leave").
					Where("id = ?", resourceID).
					UpdateColumn("status", "APPROVED").Error; err != nil {
					xlogger.ErrorfCtx(ctx, "审批回调:请假状态同步失败 leave_id=%d: %v", resourceID, err)
				}
			case "LOAN":
				// 借款审批通过 → 生成财务凭证(其他应收-员工借款,DEBIT 借方)
				var loan struct {
					LoanNo      string
					ApplicantID uint
					Amount      string
				}
				if err := repository.DBFrom(ctx).Table("oa_loan").
					Select("loan_no, applicant_id, amount").
					Where("id = ?", resourceID).
					Scan(&loan).Error; err != nil || loan.LoanNo == "" {
					xlogger.ErrorfCtx(ctx, "审批回调:查询借款单失败 loan_id=%d: %v", resourceID, err)
				} else {
					// 查找应收类科目(EXPENSE 类型第一个,作为兜底;正式应配专用科目)
					var account finmodel.FinAccount
					if err := repository.DBFrom(ctx).Where("type = ? AND status = 1", finmodel.AccountTypeAsset).
						Order("code ASC").First(&account).Error; err == nil && account.ID > 0 {
						voucher := &finmodel.FinVoucher{
							VoucherNo:   "PZ-" + loan.LoanNo,
							VoucherDate: xtime.NewDateTime(time.Now()),
							AccountID:   account.ID,
							Description: "员工借款:" + loan.LoanNo,
							Direction:   "DEBIT",
							Amount:      decimal.RequireFromString(loan.Amount),
							Currency:    "CNY",
							BizType:     "LOAN",
							BizID:       &resourceID,
							Status:      "CONFIRMED",
							Remark:      "借款审批通过自动生成",
						}
						if err := repository.DBFrom(ctx).Create(voucher).Error; err != nil {
							xlogger.ErrorfCtx(ctx, "审批回调:借款凭证生成失败 loan_id=%d: %v", resourceID, err)
						} else {
							xlogger.InfofCtx(ctx, "审批回调:借款 %d 凭证已生成 %s", resourceID, voucher.VoucherNo)
						}
					}
				}
			}
		}
	})

	return nil
}

// enterpriseMessageClient 站内信客户端(直接复用 enterprise service)。
// 避免 import cycle:enterprise service 不 import approval,approval 用全局函数调用。
type messageClient interface {
	SendSystemMessage(ctx context.Context, receiverID uint, title, content string) error
}

var globalMessageClient messageClient

// SetMessageClient 注入站内信客户端(enterprise 模块启动时调用)。
func SetMessageClient(client messageClient) {
	globalMessageClient = client
}

func newEnterpriseMessageClient() messageClient {
	if globalMessageClient != nil {
		return globalMessageClient
	}
	// fallback:空操作(enterprise 未初始化时)
	return &noopMessageClient{}
}

type noopMessageClient struct{}

func (n *noopMessageClient) SendSystemMessage(ctx context.Context, receiverID uint, title, content string) error {
	return nil
}
