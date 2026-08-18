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

// ResetFileKey 数据重置时待删除的存储文件标识。
type ResetFileKey struct {
	ObjectKey  string
	Visibility string // storage.VisibilityPublic / VisibilityPrivate
}

// ListResetAttachments 附件登记表(sys_attachment)全量 object_key+visibility。
// 附件 Tab 的文件均登记于此,重置删存储文件的主数据源。
func ListResetAttachments(ctx context.Context) ([]ResetFileKey, error) {
	var rows []ResetFileKey
	err := dbFrom(ctx).Table("sys_attachment").
		Select("object_key, visibility").Find(&rows).Error
	if err != nil {
		return nil, fmt.Errorf("scan sys_attachment: %w", err)
	}
	return rows, nil
}

// ListResetColumnValues 扫描指定表单列的全部非空值(表名/列名均为服务端常量,
// 不接受外部输入)。用于收集内嵌在业务字段里的文件 URL(文章封面/正文图片/简历链接)。
func ListResetColumnValues(ctx context.Context, table, column string) ([]string, error) {
	var vals []string
	err := dbFrom(ctx).Table(table).
		Where("`"+column+"` != ''").Pluck("`"+column+"`", &vals).Error
	if err != nil {
		return nil, fmt.Errorf("scan %s.%s: %w", table, column, err)
	}
	return vals, nil
}
