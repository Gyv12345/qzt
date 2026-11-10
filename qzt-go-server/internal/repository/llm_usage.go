package repository

import (
	"context"

	"qzt-go-server/internal/model"
)

// LLMUsageRepo sys_llm_usage 记账表。写入方是 internal/pkg/llm 网关；
// 后续 BI/计费查询（按用户/功能/时间段聚合 token 用量）在此扩展方法。
type LLMUsageRepo struct {
	BaseRepo[model.SysLLMUsage]
}

func NewLLMUsageRepo() *LLMUsageRepo {
	return &LLMUsageRepo{}
}

// CreateUsage 落一条记账。失败由调用方记日志降级，不影响业务调用结果。
func (r *LLMUsageRepo) CreateUsage(ctx context.Context, u *model.SysLLMUsage) error {
	return r.Create(ctx, u)
}
