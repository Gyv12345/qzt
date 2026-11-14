package service

import "context"

// crm_message_client.go CRM 模块站内信客户端注入(镜像 approval 模块同款模式)。
// notify.Dispatch 只有 SSE 实时推送 + 企微/服务号外推,不落站内信;定时提醒类
// 通知(到期提醒等)必须显式走该客户端落 oa_message,否则演示模式下外部通道
// 被护栏拦截后提醒会完全蒸发。

// MessageClient 站内信客户端(enterprise(oa) 模块启动时注入)。
type MessageClient interface {
	SendSystemMessage(ctx context.Context, receiverID uint, title, content string) error
	SendSystemMessageWithPath(ctx context.Context, receiverID uint, title, content, path string) error
}

var globalMessageClient MessageClient

// SetMessageClient 注入站内信客户端(cmd/server/main.go 启动时调用)。
func SetMessageClient(client MessageClient) {
	globalMessageClient = client
}

// newMessageClient 取注入的客户端;enterprise 未初始化时返回空操作(不 panic)。
func newMessageClient() MessageClient {
	if globalMessageClient != nil {
		return globalMessageClient
	}
	return noopMessageClient{}
}

type noopMessageClient struct{}

func (noopMessageClient) SendSystemMessage(context.Context, uint, string, string) error {
	return nil
}

func (noopMessageClient) SendSystemMessageWithPath(context.Context, uint, string, string, string) error {
	return nil
}
