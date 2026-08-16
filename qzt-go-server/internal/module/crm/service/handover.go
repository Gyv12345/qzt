package service

// handover.go 离职交接:批量转移用户名下的所有业务资源给接收人。

import (
	"context"
	"fmt"

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
	Customer    int64 `json:"customer"`      // 转移的客户数
	Lead        int64 `json:"lead"`          // 转移的线索数
	Opportunity int64 `json:"opportunity"`   // 转移的商机数
	Contract    int64 `json:"contract"`      // 转移的合同数
	FollowRec   int64 `json:"follow_record"` // 转移的跟进记录数
	FollowPlan  int64 `json:"follow_plan"`   // 转移的跟进计划数
}

// Handover 批量转移 fromUserID 名下的所有业务资源到 toUserID。
// 批量 UPDATE 走 repository(不走单条 Transfer,性能高)。
func (s *HandoverService) Handover(ctx context.Context, req *HandoverRequest) (*HandoverResult, error) {
	if req.FromUserID == req.ToUserID {
		return nil, fmt.Errorf("离职人和接收人不能是同一人")
	}

	result := &HandoverResult{}

	// 按表批量更新 owner_id,统计影响行数
	updates := []struct {
		table   string
		field   string // owner 字段名
		counter *int64
	}{
		{"crm_customer", "owner_id", &result.Customer},
		{"crm_lead", "owner_id", &result.Lead},
		{"crm_opportunity", "owner_id", &result.Opportunity},
		{"crm_contract", "owner_id", &result.Contract},
		{"follow_up_record", "owner_id", &result.FollowRec},
		{"follow_up_plan", "owner_id", &result.FollowPlan},
	}

	for _, u := range updates {
		n, err := crrepo.TransferColumnOwner(ctx, u.table, u.field, req.FromUserID, req.ToUserID)
		if err != nil {
			xlogger.ErrorfCtx(ctx, "离职交接失败 table=%s: %v", u.table, err)
			return nil, fmt.Errorf("转移%s失败: %v", u.table, err)
		}
		*u.counter = n
	}

	// 同步转移跟进人(follower_id,失败不影响主流程)
	for _, table := range []string{"crm_customer", "crm_lead", "crm_opportunity", "crm_contract"} {
		_, _ = crrepo.TransferColumnOwner(ctx, table, "follower_id", req.FromUserID, req.ToUserID)
	}

	// 记录客户归属历史(批量,失败不影响主流程)
	_ = crrepo.BatchInsertTransferHistory(ctx, req.FromUserID, req.ToUserID)

	return result, nil
}
