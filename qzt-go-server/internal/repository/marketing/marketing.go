// Package marketing 营销模块 repository(渠道账号 + 线索同步日志)。
// 嵌入 repository.BaseRepo[T] 获得通用 CRUD;按需补充特定查询。
package marketing

import (
	"context"
	"errors"

	"gorm.io/gorm"

	mktmodel "qzt-go-server/internal/model/marketing"
	"qzt-go-server/internal/repository"
)

// repoDB 复用全局事务感知的 DB 句柄(同 crm/helpers.go 的写法)。
func repoDB(ctx context.Context) *gorm.DB { return repository.DBFrom(ctx) }

// ── 渠道账号 ──

type AccountRepo struct {
	repository.BaseRepo[mktmodel.MarketingAccount]
}

func NewAccountRepo() *AccountRepo { return &AccountRepo{} }

// Update 覆写:白名单列名(不含 channel,创建后不可改渠道)。
func (r *AccountRepo) Update(ctx context.Context, m *mktmodel.MarketingAccount) error {
	return r.BaseRepo.Update(ctx, m,
		"Name", "AppID", "AppSecret",
		"AccessToken", "RefreshToken", "TokenExpiresAt", "RefreshExpiresAt",
		"AdvertiserIDs", "Status", "Enabled", "LastSyncAt")
}

// ListSyncable 列出启用且已授权、需要定时拉取的账号。
func (r *AccountRepo) ListSyncable(ctx context.Context) ([]mktmodel.MarketingAccount, error) {
	var list []mktmodel.MarketingAccount
	err := repoDB(ctx).
		Where("enabled = ? AND status = ?", mktmodel.AccountStatusAuthed, mktmodel.AccountStatusAuthed).
		Order("id ASC").
		Find(&list).Error
	return list, err
}

// ── 线索同步日志 ──

type LeadLogRepo struct {
	repository.BaseRepo[mktmodel.MarketingLeadLog]
}

func NewLeadLogRepo() *LeadLogRepo { return &LeadLogRepo{} }

// TryInsert 幂等插入:uk(account_id, external_id) 已存在则返回 exists=true、err=nil。
// 这是跨轮同步去重的第一道闸门——定时任务重叠窗口重复拉取不会二次入库。
func (r *LeadLogRepo) TryInsert(ctx context.Context, m *mktmodel.MarketingLeadLog) (exists bool, err error) {
	err = repoDB(ctx).Create(m).Error
	if err == nil {
		return false, nil
	}
	if errors.Is(err, gorm.ErrDuplicatedKey) {
		return true, nil
	}
	return false, err
}

// FillResult 回填处理结果(lead_id/status/detail)。
func (r *LeadLogRepo) FillResult(ctx context.Context, id uint, leadID *uint, status int8, detail string) error {
	return repoDB(ctx).Model(&mktmodel.MarketingLeadLog{}).
		Where("id = ?", id).
		Updates(map[string]any{"lead_id": leadID, "status": status, "detail": detail}).Error
}

// PageList 分页查询(账号/状态/关键词/时间窗过滤)。
func (r *LeadLogRepo) PageList(ctx context.Context, page, pageSize int, accountID uint, status int8, keyword, startTime, endTime string) ([]mktmodel.MarketingLeadLog, int64, error) {
	q := &repository.QueryOptions{
		Order: []string{"id DESC"},
	}
	if accountID > 0 {
		q.Where = map[string]any{"account_id": accountID}
	}
	if status > 0 {
		if q.Where == nil {
			q.Where = map[string]any{}
		}
		q.Where["status"] = status
	}
	if keyword != "" {
		q.Search = map[string]string{"name": keyword, "phone": keyword}
	}
	if startTime != "" {
		q.Conds = append(q.Conds, repository.Cond{Query: "created_at >= ?", Args: []any{startTime}})
	}
	if endTime != "" {
		q.Conds = append(q.Conds, repository.Cond{Query: "created_at <= ?", Args: []any{endTime + " 23:59:59"}})
	}
	return r.BaseRepo.PageList(ctx, page, pageSize, q)
}
