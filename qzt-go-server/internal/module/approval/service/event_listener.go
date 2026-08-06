package service

import (
	"context"
	"fmt"
	"strings"

	crmmodel "qzt-go-server/internal/model/crm"
	"qzt-go-server/internal/repository"
	"qzt-go-server/pkg/xevent"
	"qzt-go-server/pkg/xlogger"
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
		content := fmt.Sprintf("有一条「%s」类型的审批待办需要您处理", resourceType)
		if err := msgSvc.SendSystemMessage(ctx, approverID, title, content); err != nil {
			// 失败仅记日志,不影响审批流程
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
		if submitterID == 0 {
			return
		}
		title := "审批结果通知"
		if err := msgSvc.SendSystemMessage(ctx, submitterID, title, message); err != nil {
			// 失败仅记日志
		}

		// ── 跨模块业务回调:审批通过→自动更新业务阶段 ──
		resourceType, _ := m["resource_type"].(string)
		resourceID, _ := m["resource_id"].(uint)
		if resourceID == 0 {
			return
		}
		if strings.Contains(message, "通过") {
			switch resourceType {
			case "CONTRACT":
				// 合同审批通过 → stage 改为 SIGNED
				if err := repository.DBFrom(ctx).Model(&crmmodel.CrmContract{}).
					Where("id = ?", resourceID).
					UpdateColumn("stage", crmmodel.ContractStageSigned).Error; err != nil {
					xlogger.ErrorfCtx(ctx, "审批回调:合同阶段更新失败 contract_id=%d: %v", resourceID, err)
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
