package crm

import (
	"context"
	"time"

	"github.com/shopspring/decimal"
	"gorm.io/gorm"

	crmmodel "qzt-go-server/internal/model/crm"
	"qzt-go-server/internal/repository"
	"qzt-go-server/pkg/xtime"
)

// contract.go 合同 + 回款计划 + 回款记录 + 工商抬头 repository。

type ContractRepo struct {
	repository.BaseRepo[crmmodel.CrmContract]
}

func NewContractRepo() *ContractRepo { return &ContractRepo{} }

func (r *ContractRepo) Update(ctx context.Context, m *crmmodel.CrmContract) error {
	return r.BaseRepo.Update(ctx, m,
		"ContractNo", "Name", "CustomerID", "OpportunityID", "TitleID", "TotalAmount",
		"ReceivedAmount", "SignedDate", "StartDate", "EndDate", "Stage",
		"OwnerID", "FollowerID", "FollowTime", "Content",
		"Category", "ArchivedAt", "ArchivedBy", "ExpireRemindedOn")
}

// Archive 归档合同(置 archived_at/archived_by)。
func (r *ContractRepo) Archive(ctx context.Context, id, byUserID uint, archivedAt xtime.DateTime) error {
	return repoDB(ctx).Model(&crmmodel.CrmContract{}).Where("id = ?", id).
		Updates(map[string]any{"archived_at": archivedAt, "archived_by": byUserID}).Error
}

// Unarchive 取消归档(清空归档字段)。
func (r *ContractRepo) Unarchive(ctx context.Context, id uint) error {
	return repoDB(ctx).Model(&crmmodel.CrmContract{}).Where("id = ?", id).
		Updates(map[string]any{"archived_at": nil, "archived_by": nil}).Error
}

// ── 合同统计(P30-#2) ──

// unarchivedStages stats 口径:全部未归档 EXECUTING+SIGNED+COMPLETED 合计金额。
var unarchivedStages = []string{
	crmmodel.ContractStageExecuting, crmmodel.ContractStageSigned, crmmodel.ContractStageCompleted,
}

// StatsTotalAmount 未归档 EXECUTING+SIGNED+COMPLETED 的合同金额合计。
func (r *ContractRepo) StatsTotalAmount(ctx context.Context) (decimal.Decimal, error) {
	var total decimal.Decimal
	err := repoDB(ctx).Model(&crmmodel.CrmContract{}).
		Where("stage IN ? AND archived_at IS NULL", unarchivedStages).
		Select("COALESCE(SUM(total_amount), 0)").Scan(&total).Error
	return total, err
}

// StageStatRow 分阶段聚合原始行(SQL GROUP BY 输出)。
type StageStatRow struct {
	Stage  string          `json:"stage"`
	Count  int64           `json:"count"`
	Amount decimal.Decimal `json:"amount"`
}

// StatsByStage 按阶段聚合未归档合同(阶段/条数/金额),service 层再排序补零。
func (r *ContractRepo) StatsByStage(ctx context.Context) ([]StageStatRow, error) {
	rows := make([]StageStatRow, 0, 6)
	err := repoDB(ctx).Model(&crmmodel.CrmContract{}).
		Where("archived_at IS NULL").
		Select("stage, COUNT(*) AS count, COALESCE(SUM(total_amount), 0) AS amount").
		Group("stage").Scan(&rows).Error
	return rows, err
}

// SignedMonthAmount 本月签订合同金额合计(signed_date 落在 [monthStart, monthEnd])。
func (r *ContractRepo) SignedMonthAmount(ctx context.Context, monthStart, monthEnd time.Time) (decimal.Decimal, error) {
	var total decimal.Decimal
	err := repoDB(ctx).Model(&crmmodel.CrmContract{}).
		Where("signed_date >= ? AND signed_date <= ?", monthStart, monthEnd).
		Select("COALESCE(SUM(total_amount), 0)").Scan(&total).Error
	return total, err
}

// ExpiringRow 临期合同行(带客户名/负责人名)。
type ExpiringRow struct {
	ID           uint               `json:"id"`
	Name         string             `json:"name"`
	CustomerName string             `json:"customer_name"`
	EndDate      xtime.NullDateTime `json:"end_date"`
	DaysLeft     int                `json:"days_left"`
	OwnerName    string             `json:"owner_name"`
	Stage        string             `json:"stage"`
}

// ListExpiring 临期合同:未归档 SIGNED/EXECUTING 且 end_date ∈ [today, horizon],
// 按 end_date 升序,limit 上限。客户名/负责人名 JOIN 取回。
func (r *ContractRepo) ListExpiring(ctx context.Context, today, horizon time.Time, limit int) ([]ExpiringRow, error) {
	rows := make([]ExpiringRow, 0, limit)
	err := repoDB(ctx).Model(&crmmodel.CrmContract{}).
		Where("crm_contract.stage IN ? AND crm_contract.archived_at IS NULL AND crm_contract.owner_id IS NOT NULL", []string{
			crmmodel.ContractStageSigned, crmmodel.ContractStageExecuting}).
		Where("crm_contract.end_date >= ? AND crm_contract.end_date <= ?", today, horizon).
		Joins("LEFT JOIN crm_customer c ON c.id = crm_contract.customer_id AND c.deleted_at IS NULL").
		Joins("LEFT JOIN sys_user u ON u.id = crm_contract.owner_id AND u.deleted_at IS NULL").
		Select("crm_contract.id, crm_contract.name, crm_contract.end_date, crm_contract.stage, " +
			"COALESCE(c.name, '') AS customer_name, COALESCE(u.nickname, '') AS owner_name").
		Order("crm_contract.end_date ASC").
		Limit(limit).
		Scan(&rows).Error
	return rows, err
}

// ListForExpireRemind 到期提醒 job 扫描:end_date 等于目标日、未归档、
// SIGNED/EXECUTING、负责人非空、当日尚未提醒过(expire_reminded_on 为空或 ≠ 今天)。
func (r *ContractRepo) ListForExpireRemind(ctx context.Context, targetDate time.Time) ([]crmmodel.CrmContract, error) {
	list := make([]crmmodel.CrmContract, 0, 16)
	err := repoDB(ctx).Model(&crmmodel.CrmContract{}).
		Where("stage IN ? AND archived_at IS NULL AND owner_id IS NOT NULL", []string{
			crmmodel.ContractStageSigned, crmmodel.ContractStageExecuting}).
		Where("end_date = ?", targetDate).
		Where("(expire_reminded_on IS NULL OR expire_reminded_on <> ?)", targetDate).
		Limit(200).
		Find(&list).Error
	return list, err
}

// MarkExpireReminded 批量置 expire_reminded_on(发送成功后防重)。
func (r *ContractRepo) MarkExpireReminded(ctx context.Context, ids []uint, day time.Time) error {
	if len(ids) == 0 {
		return nil
	}
	return repoDB(ctx).Model(&crmmodel.CrmContract{}).
		Where("id IN ?", ids).
		UpdateColumn("expire_reminded_on", day.Format("2006-01-02")).Error
}

// ── 合同变更记录 ──

type ContractChangeRepo struct {
	repository.BaseRepo[crmmodel.CrmContractChange]
}

func NewContractChangeRepo() *ContractChangeRepo { return &ContractChangeRepo{} }

// ContractChangeView 变更记录视图(带操作人姓名)。
type ContractChangeView struct {
	crmmodel.CrmContractChange
	CreatedByName string `json:"created_by_name"`
}

// ListByContract 按合同倒序列变更记录(带操作人姓名)。
func (r *ContractChangeRepo) ListByContract(ctx context.Context, contractID uint) ([]ContractChangeView, error) {
	rows := make([]ContractChangeView, 0, 16)
	err := repoDB(ctx).Model(&crmmodel.CrmContractChange{}).
		Joins("LEFT JOIN sys_user u ON u.id = crm_contract_change.created_by AND u.deleted_at IS NULL").
		Where("crm_contract_change.contract_id = ?", contractID).
		Select("crm_contract_change.*, COALESCE(u.nickname, '') AS created_by_name").
		Order("crm_contract_change.id DESC").
		Scan(&rows).Error
	return rows, err
}

// AddReceivedAmount 在 received_amount 上原子加 amount(回款累计用);amount 为负即扣减。
// 用 GREATEST 兜底 0,避免删除记录反向扣减时出现负数。
func (r *ContractRepo) AddReceivedAmount(ctx context.Context, id uint, amount string) error {
	return repoDB(ctx).Model(&crmmodel.CrmContract{}).Where("id = ?", id).
		UpdateColumn("received_amount",
			gorm.Expr("GREATEST(received_amount + ?, 0)", amount)).Error
}

// UpdateStageByID 按合同 ID 更新阶段列(审批通过回调:合同 → SIGNED)。
func (r *ContractRepo) UpdateStageByID(ctx context.Context, id uint, stage string) error {
	return repoDB(ctx).Model(&crmmodel.CrmContract{}).Where("id = ?", id).
		UpdateColumn("stage", stage).Error
}

// CountByNoPrefix 统计 contract_no LIKE 前缀% 且非空的记录数(自动编号规则 HT 推算用)。
func (r *ContractRepo) CountByNoPrefix(ctx context.Context, prefix string) (int64, error) {
	var n int64
	err := repoDB(ctx).Unscoped().Model(&crmmodel.CrmContract{}).
		Where("contract_no LIKE ?", prefix+"%").
		Where("contract_no != ''").
		Count(&n).Error
	return n, err
}

// GetNameByID 取合同名称(回款凭证摘要用;合同名称列是 name,title_id 是工商抬头 ID,勿混用)。
func (r *ContractRepo) GetNameByID(ctx context.Context, id uint) (string, error) {
	var name string
	err := repoDB(ctx).Model(&crmmodel.CrmContract{}).
		Where("id = ?", id).
		Select("name").Scan(&name).Error
	return name, err
}

// ListByCustomer 按客户列合同。
func (r *ContractRepo) ListByCustomer(ctx context.Context, customerID uint) ([]crmmodel.CrmContract, error) {
	return r.List(ctx, &repository.QueryOptions{
		Where: map[string]any{"customer_id": customerID},
		Order: []string{"id DESC"},
	})
}

// ── 回款计划 ──

type PaymentPlanRepo struct {
	repository.BaseRepo[crmmodel.CrmContractPaymentPlan]
}

func NewPaymentPlanRepo() *PaymentPlanRepo { return &PaymentPlanRepo{} }

func (r *PaymentPlanRepo) Update(ctx context.Context, m *crmmodel.CrmContractPaymentPlan) error {
	return r.BaseRepo.Update(ctx, m, "PlanDate", "PlanAmount", "ReceivedAmount", "Status", "Remark")
}

func (r *PaymentPlanRepo) ListByContract(ctx context.Context, contractID uint) ([]crmmodel.CrmContractPaymentPlan, error) {
	return r.List(ctx, &repository.QueryOptions{
		Where: map[string]any{"contract_id": contractID},
		Order: []string{"plan_date ASC"},
	})
}

// AddPlanReceived 原子加计划已回款金额(amount 为负即扣减);GREATEST 兜底 0。
func (r *PaymentPlanRepo) AddPlanReceived(ctx context.Context, id uint, amount string) error {
	return repoDB(ctx).Model(&crmmodel.CrmContractPaymentPlan{}).Where("id = ?", id).
		UpdateColumn("received_amount",
			gorm.Expr("GREATEST(received_amount + ?, 0)", amount)).Error
}

// ── 回款记录 ──

type PaymentRecordRepo struct {
	repository.BaseRepo[crmmodel.CrmContractPaymentRecord]
}

func NewPaymentRecordRepo() *PaymentRecordRepo { return &PaymentRecordRepo{} }

func (r *PaymentRecordRepo) Update(ctx context.Context, m *crmmodel.CrmContractPaymentRecord) error {
	return r.BaseRepo.Update(ctx, m, "ReceivedDate", "Method", "Remark")
}

func (r *PaymentRecordRepo) ListByContract(ctx context.Context, contractID uint) ([]crmmodel.CrmContractPaymentRecord, error) {
	return r.List(ctx, &repository.QueryOptions{
		Where: map[string]any{"contract_id": contractID},
		Order: []string{"received_date DESC"},
	})
}

// SumReceivedBetween 汇总 [from, to) 日期区间的回款金额合计(按实际回款日期 received_date)。
// 无记录返回 0;AI 场景智能体「经营洞察」近 30 天回款合计用。
func (r *PaymentRecordRepo) SumReceivedBetween(ctx context.Context, from, to time.Time) (decimal.Decimal, error) {
	var sum decimal.Decimal
	err := repoDB(ctx).Model(&crmmodel.CrmContractPaymentRecord{}).
		Select("COALESCE(SUM(amount), 0)").
		Where("received_date >= ? AND received_date < ?", from.Format("2006-01-02"), to.Format("2006-01-02")).
		Scan(&sum).Error
	return sum, err
}

// ── 工商抬头 ──

type BusinessTitleRepo struct {
	repository.BaseRepo[crmmodel.CrmBusinessTitle]
}

func NewBusinessTitleRepo() *BusinessTitleRepo { return &BusinessTitleRepo{} }

func (r *BusinessTitleRepo) Update(ctx context.Context, m *crmmodel.CrmBusinessTitle) error {
	return r.BaseRepo.Update(ctx, m, "Name", "TaxNo", "Address", "Phone", "BankName", "BankAccount")
}
