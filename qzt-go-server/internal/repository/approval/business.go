package approval

import (
	"context"
	"fmt"
)

// business.go 审批引擎对业务表单表的泛化访问。
// 表名/列名均为服务端常量(apprmodel.FormTable 白名单、service 的 resourceTitleColumn 映射),
// 不接收任何客户端输入,SQL 标识符拼接是安全的。

// ScanResourceTitles 批量查业务表标题,返回 id → 标题。
// table 与 col(可为 CONCAT_WS 等表达式)均由调用方从服务端常量映射取出,不接收客户端输入
// (待办/已办/我发起的列表 enrichment 用)。
func ScanResourceTitles(ctx context.Context, table, col string, ids []uint) (map[uint]string, error) {
	var rows []struct {
		ID    uint   `gorm:"column:id"`
		Title string `gorm:"column:title"`
	}
	err := repoDB(ctx).Table(table).
		Select(fmt.Sprintf("id, %s AS title", col)).
		Where("id IN ?", ids).
		Where("deleted_at IS NULL").
		Find(&rows).Error
	if err != nil {
		return nil, err
	}
	out := make(map[uint]string, len(rows))
	for _, r := range rows {
		out[r.ID] = r.Title
	}
	return out, nil
}

// ScanBusinessRow 裸查业务表单行到 map[列名]值(审批条件求值取数)。
func ScanBusinessRow(ctx context.Context, table string, resourceID uint, dest *map[string]any) error {
	return repoDB(ctx).Table(table).
		Where("id = ?", resourceID).
		Where("deleted_at IS NULL").
		Scan(dest).Error
}

// ScanBusinessDetailRows 裸查业务明细表多行(审批原单摘要用),按外键列过滤。
// table 与 fkCol 均为服务端常量白名单,不接收客户端输入。
func ScanBusinessDetailRows(ctx context.Context, table, fkCol string, resourceID uint, dest *[]map[string]any) error {
	return repoDB(ctx).Table(table).
		Where(fkCol+" = ?", resourceID).
		Where("deleted_at IS NULL").
		Order("id ASC").
		Scan(dest).Error
}

// ScanRefNames 批量查引用表名称列,返回 id → 名称(原单摘要里把 customer_id 等
// 外键解析成名称用)。不过滤软删:历史单据关联的名称仍应显示。
func ScanRefNames(ctx context.Context, table, col string, ids []uint) (map[uint]string, error) {
	if len(ids) == 0 {
		return map[uint]string{}, nil
	}
	var rows []struct {
		ID   uint   `gorm:"column:id"`
		Name string `gorm:"column:name"`
	}
	err := repoDB(ctx).Table(table).
		Select(fmt.Sprintf("id, %s AS name", col)).
		Where("id IN ?", ids).
		Find(&rows).Error
	if err != nil {
		return nil, err
	}
	out := make(map[uint]string, len(rows))
	for _, r := range rows {
		out[r.ID] = r.Name
	}
	return out, nil
}

// UpdateResourceApprovalStatus 更新业务资源的审批状态列(审批通过/驳回/撤回时回写)。
func UpdateResourceApprovalStatus(ctx context.Context, table string, resourceID uint, status string) error {
	return repoDB(ctx).Table(table).Where("id = ?", resourceID).
		Update("approval_status", status).Error
}
