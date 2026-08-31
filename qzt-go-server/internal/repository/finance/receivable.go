package finance

import (
	"context"

	"gorm.io/gorm"

	finmodel "qzt-go-server/internal/model/finance"
	"qzt-go-server/internal/repository"
)

// receivable.go 应收应付 repository。

func finDB(ctx context.Context) *gorm.DB { return repository.DBFrom(ctx) }

type ReceivableRepo struct {
	repository.BaseRepo[finmodel.FinReceivable]
}

func NewReceivableRepo() *ReceivableRepo { return &ReceivableRepo{} }

// PageList 分页查询(支持方向/往来方/状态/业务类型筛选)。
func (r *ReceivableRepo) PageList(ctx context.Context, page, pageSize int, direction, partyType string, partyID uint, status int8, bizType string, keyword string) ([]finmodel.FinReceivable, int64, error) {
	var list []finmodel.FinReceivable
	q := finDB(ctx).Model(&finmodel.FinReceivable{})
	if direction != "" {
		q = q.Where("direction = ?", direction)
	}
	if partyType != "" {
		q = q.Where("party_type = ?", partyType)
	}
	if partyID > 0 {
		q = q.Where("party_id = ?", partyID)
	}
	if status >= 0 {
		q = q.Where("status = ?", status)
	}
	if bizType != "" {
		q = q.Where("biz_type = ?", bizType)
	}
	if keyword != "" {
		q = q.Where("party_name LIKE ? OR doc_no LIKE ?", "%"+keyword+"%", "%"+keyword+"%")
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	err := q.Order("id DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&list).Error
	return list, total, err
}

func (r *ReceivableRepo) Update(ctx context.Context, m *finmodel.FinReceivable) error {
	return r.BaseRepo.Update(ctx, m, "PartyType", "PartyID", "PartyName", "OccurDate", "DueDate", "OriginalAmount", "SettledAmount", "BizType", "BizID", "Status", "Remark")
}

// CountByNoPrefix 统计同前缀往来单数(单号 YS/YF+日期+序号 推算用)。
func (r *ReceivableRepo) CountByNoPrefix(ctx context.Context, prefix string) (int64, error) {
	var count int64
	err := finDB(ctx).Unscoped().Model(&finmodel.FinReceivable{}).
		Where("doc_no LIKE ?", prefix+"%").
		Count(&count).Error
	return count, err
}
