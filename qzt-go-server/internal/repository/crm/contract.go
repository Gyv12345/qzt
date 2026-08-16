package crm

import (
	"context"

	"gorm.io/gorm"

	crmmodel "qzt-go-server/internal/model/crm"
	"qzt-go-server/internal/repository"
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
		"OwnerID", "FollowerID", "FollowTime", "Content")
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
	err := repoDB(ctx).Model(&crmmodel.CrmContract{}).
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

// ── 工商抬头 ──

type BusinessTitleRepo struct {
	repository.BaseRepo[crmmodel.CrmBusinessTitle]
}

func NewBusinessTitleRepo() *BusinessTitleRepo { return &BusinessTitleRepo{} }

func (r *BusinessTitleRepo) Update(ctx context.Context, m *crmmodel.CrmBusinessTitle) error {
	return r.BaseRepo.Update(ctx, m, "Name", "TaxNo", "Address", "Phone", "BankName", "BankAccount")
}
