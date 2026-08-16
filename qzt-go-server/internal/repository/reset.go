package repository

import (
	"context"
	"fmt"
)

// reset.go 业务数据重置 repository(系统管理高危操作)。
// 表名来自服务端常量清单(businessTables),TRUNCATE 是 DDL 无法事务化,
// 逐表执行、错误收集聚合由 service 层完成。

// TruncateTable 清空指定业务表并重置自增 ID(TRUNCATE TABLE)。
func TruncateTable(ctx context.Context, table string) error {
	return dbFrom(ctx).Exec(fmt.Sprintf("TRUNCATE TABLE `%s`", table)).Error
}
