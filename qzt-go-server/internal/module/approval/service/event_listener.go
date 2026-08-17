package service

import (
	"context"
	"fmt"
	"time"

	"github.com/shopspring/decimal"

	crmmodel "qzt-go-server/internal/model/crm"
	finmodel "qzt-go-server/internal/model/finance"
	crmrepo "qzt-go-server/internal/repository/crm"
	finrepo "qzt-go-server/internal/repository/finance"
	hrmrepo "qzt-go-server/internal/repository/hrm"
	oarepo "qzt-go-server/internal/repository/oa"
	"qzt-go-server/pkg/xevent"
	"qzt-go-server/pkg/xlogger"
	"qzt-go-server/pkg/xtime"
)

// event_listener.go 审批引擎事件监听器。
// 启动时注册:审批任务分配/完成 → 发站内信。
// 跨模块业务回调(合同阶段/请假状态/借款凭证)统一走各模块 repository。

// 跨模块回调用的 repo(事件闭包共享,无状态)。
var (
	contractRepo = crmrepo.NewContractRepo()
	loanRepo     = oarepo.NewLoanRepo()
	accountRepo  = finrepo.NewAccountRepo()
	voucherRepo  = finrepo.NewVoucherRepo()
)

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
		// SendSystemMessageWithPath 内部已含 SSE+企微分发,勿再调 notify.Dispatch(会双发)
		if err := msgSvc.SendSystemMessageWithPath(ctx, approverID, title, content, "/approval/todo"); err != nil {
			// 失败仅记日志,不影响审批流程
		}
	})

	// 节点开始审批 → 抄送通知(cc_type=MEMBER 的用户,纯知会)
	xevent.Subscribe("approval.cc", func(ctx context.Context, payload any) {
		m, ok := payload.(map[string]any)
		if !ok {
			return
		}
		ccIDs, ok := m["cc_ids"].([]uint)
		if !ok || len(ccIDs) == 0 {
			return
		}
		content, _ := m["message"].(string)
		if content == "" {
			return
		}
		for _, uid := range ccIDs {
			if uid == 0 {
				continue
			}
			if err := msgSvc.SendSystemMessageWithPath(ctx, uid, "审批抄送通知", content, "/oa/message"); err != nil {
				// 失败仅记日志,不影响审批流程
			}
		}
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
		// SendSystemMessageWithPath 内部已含 SSE+企微分发,勿再调 notify.Dispatch(会双发)
		if err := msgSvc.SendSystemMessageWithPath(ctx, submitterID, title, message, "/approval/mine"); err != nil {
			// 失败仅记日志,不影响审批流程
		}
		// 全通过时同步通知所有参与审批人(已排除提交人,不重复):审批人需知晓流程最终结果
		if result == resultApprove {
			if pIDs, ok := m["participant_ids"].([]uint); ok {
				for _, pid := range pIDs {
					if pid == 0 || pid == submitterID {
						continue
					}
					if err := msgSvc.SendSystemMessageWithPath(ctx, pid, title, message, "/approval/processed"); err != nil {
						// 失败仅记日志,不影响审批流程
					}
				}
			}
		}

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
				if err := contractRepo.UpdateStageByID(ctx, resourceID, crmmodel.ContractStageSigned); err != nil {
					xlogger.ErrorfCtx(ctx, "审批回调:合同阶段更新失败 contract_id=%d: %v", resourceID, err)
				}
			case "EXPENSE":
				// 报销单审批通过 → 后续可在此生成财务凭证(当前仅记日志)
				xlogger.InfofCtx(ctx, "审批回调:报销单 %d 审批通过,等待打款", resourceID)
			case "LEAVE":
				// 请假审批通过 → 同步旧 Status 字段(兼容现有考勤查询)
				if err := hrmrepo.UpdateLeaveStatus(ctx, resourceID, "APPROVED"); err != nil {
					xlogger.ErrorfCtx(ctx, "审批回调:请假状态同步失败 leave_id=%d: %v", resourceID, err)
				}
			case "LOAN":
				// 借款审批通过 → 生成财务凭证(其他应收-员工借款,DEBIT 借方)
				loan, err := loanRepo.GetVoucherSource(ctx, resourceID)
				if err != nil || loan.LoanNo == "" {
					xlogger.ErrorfCtx(ctx, "审批回调:查询借款单失败 loan_id=%d: %v", resourceID, err)
				} else {
					// 查找应收类科目(EXPENSE 类型第一个,作为兜底;正式应配专用科目)
					account, err := accountRepo.FirstActiveByType(ctx, finmodel.AccountTypeAsset)
					if err == nil && account != nil && account.ID > 0 {
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
						if err := voucherRepo.Create(ctx, voucher); err != nil {
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
	SendSystemMessageWithPath(ctx context.Context, receiverID uint, title, content, path string) error
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

func (n *noopMessageClient) SendSystemMessageWithPath(ctx context.Context, receiverID uint, title, content, path string) error {
	return nil
}
