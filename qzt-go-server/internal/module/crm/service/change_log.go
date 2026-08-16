package service

// change_log.go 字段变更日志写入工具。
// 在 Update 事务内调用 recordChanges,把 diff 出来的变更批量写入 sys_field_change_log。
// 失败仅记日志不回滚主流程(变更日志是附属信息,不应阻断业务更新)。

import (
	"context"
	"log"

	"qzt-go-server/internal/model"
	"qzt-go-server/internal/pkg/diff"
	"qzt-go-server/internal/repository"
)

// recordChanges 在事务内批量记录字段变更。
// 必须在 repository.Transaction 的 fn 内调用,以便写入同一事务。
func recordChanges(ctx context.Context, bizType string, resourceID, operatorID uint, changes []diff.FieldChange) {
	if len(changes) == 0 {
		return
	}
	logs := make([]model.SysFieldChangeLog, 0, len(changes))
	for _, c := range changes {
		logs = append(logs, model.SysFieldChangeLog{
			BizType:    bizType,
			ResourceID: resourceID,
			Field:      c.Field,
			FieldLabel: c.FieldLabel,
			OldValue:   c.OldValue,
			NewValue:   c.NewValue,
			OperatorID: operatorID,
		})
	}
	// 变更日志写入失败只记日志,不影响主业务事务。
	if err := repository.BulkCreateFieldChangeLogs(ctx, logs); err != nil {
		log.Printf("[change_log] write failed biz=%s resource=%d operator=%d err=%v", bizType, resourceID, operatorID, err)
	}
}
