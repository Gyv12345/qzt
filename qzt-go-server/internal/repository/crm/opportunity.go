package crm

import (
	"context"
	"time"

	crmmodel "qzt-go-server/internal/model/crm"
	"qzt-go-server/internal/repository"
)

// opportunity.go 商机 repository。

type OpportunityRepo struct {
	repository.BaseRepo[crmmodel.CrmOpportunity]
}

func NewOpportunityRepo() *OpportunityRepo { return &OpportunityRepo{} }

func (r *OpportunityRepo) Update(ctx context.Context, m *crmmodel.CrmOpportunity) error {
	return r.BaseRepo.Update(ctx, m,
		"Name", "OpportunityNo", "CustomerID", "ExpectedAmount", "ExpectedCloseDate", "Stage", "StageEnteredAt",
		"LostReason", "StageStagnantRemindedOn", "Probability", "OwnerID", "FollowerID", "FollowTime", "SourceClueID", "Description")
}

// UpdateStage 以原阶段为乐观锁条件更新流转字段,避免并发请求重复推进。
func (r *OpportunityRepo) UpdateStage(ctx context.Context, id uint, fromStage, toStage string, probability int, enteredAt time.Time, lostReason string) (bool, error) {
	res := repoDB(ctx).Model(&crmmodel.CrmOpportunity{}).
		Where("id = ? AND stage = ?", id, fromStage).
		Updates(map[string]any{
			"stage":                      toStage,
			"probability":                probability,
			"stage_entered_at":           enteredAt,
			"lost_reason":                lostReason,
			"stage_stagnant_reminded_on": nil,
			"updated_at":                 time.Now(),
		})
	return res.RowsAffected == 1, res.Error
}

// CountByNoPrefix 统计 opportunity_no LIKE 前缀% 且非空的记录数(自动编号规则 SJ 推算用)。
func (r *OpportunityRepo) CountByNoPrefix(ctx context.Context, prefix string) (int64, error) {
	var n int64
	err := repoDB(ctx).Unscoped().Model(&crmmodel.CrmOpportunity{}).
		Where("opportunity_no LIKE ?", prefix+"%").
		Where("opportunity_no != ''").
		Count(&n).Error
	return n, err
}

// StagnantOpportunityRow 阶段停滞提醒扫描行。
type StagnantOpportunityRow struct {
	ID             uint
	Name           string
	OwnerID        *uint
	Stage          string
	StageEnteredAt time.Time
}

// ScanStagnantOpportunities 扫描尚未提醒的开放商机,阶段阈值由 Service 配置决定。
func (r *OpportunityRepo) ScanStagnantOpportunities(ctx context.Context) ([]StagnantOpportunityRow, error) {
	var rows []StagnantOpportunityRow
	err := repoDB(ctx).Model(&crmmodel.CrmOpportunity{}).
		Select("id, name, owner_id, stage, stage_entered_at").
		Where("owner_id IS NOT NULL AND stage_entered_at IS NOT NULL").
		Where("stage_stagnant_reminded_on IS NULL").
		Where("stage NOT IN ?", []string{crmmodel.OppStageWon, crmmodel.OppStageLost}).
		Scan(&rows).Error
	return rows, err
}

// MarkStagnantReminded 在提醒发送成功后记录当前阶段已提醒日期。
func (r *OpportunityRepo) MarkStagnantReminded(ctx context.Context, ids []uint, remindedOn time.Time) error {
	if len(ids) == 0 {
		return nil
	}
	return repoDB(ctx).Model(&crmmodel.CrmOpportunity{}).
		Where("id IN ?", ids).
		Update("stage_stagnant_reminded_on", remindedOn).Error
}

// ListByStage 按阶段分组(看板用),可附加数据权限条件。
func (r *OpportunityRepo) ListByStage(ctx context.Context, stage string, conds ...repository.Cond) ([]crmmodel.CrmOpportunity, error) {
	q := &repository.QueryOptions{Order: []string{"id DESC"}, Conds: conds}
	if stage != "" {
		q.Where = map[string]any{"stage": stage}
	}
	return r.List(ctx, q)
}
