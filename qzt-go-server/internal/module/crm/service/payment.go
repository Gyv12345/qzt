package service

import (
	"context"
	"errors"
	"time"

	"github.com/shopspring/decimal"
	"gorm.io/gorm"

	crmmodel "qzt-go-server/internal/model/crm"
	"qzt-go-server/internal/repository"
	crrepo "qzt-go-server/internal/repository/crm"
	"qzt-go-server/pkg/xevent"
	"qzt-go-server/pkg/xtime"
)

// payment.go 回款服务:计划 + 记录,维护合同/计划的累计已回款金额与状态。
// 核心不变式:合同 received_amount == 其全部记录 amount 之和;
// 计划 received_amount == 关联该计划的全部记录 amount 之和。
// 记录创建正向累加,删除反向扣减(负数取 0)。

// PaymentService 回款服务。
type PaymentService struct {
	planRepo     *crrepo.PaymentPlanRepo
	recordRepo   *crrepo.PaymentRecordRepo
	contractRepo *crrepo.ContractRepo
}

func NewPaymentService() *PaymentService {
	return &PaymentService{
		planRepo:     crrepo.NewPaymentPlanRepo(),
		recordRepo:   crrepo.NewPaymentRecordRepo(),
		contractRepo: crrepo.NewContractRepo(),
	}
}

// ── 回款计划 ──

// CreatePaymentPlanRequest 创建回款计划请求。
type CreatePaymentPlanRequest struct {
	ContractID uint              `json:"contract_id"`
	PlanDate   xtime.NullDateTime `json:"plan_date" binding:"required"`
	PlanAmount decimal.Decimal   `json:"plan_amount" binding:"required"`
	Remark     string            `json:"remark"`
}

// CreatePlan 创建单条回款计划(received_amount 默认 0)。
func (s *PaymentService) CreatePlan(ctx context.Context, req *CreatePaymentPlanRequest) (*crmmodel.CrmContractPaymentPlan, error) {
	if req.PlanAmount.LessThanOrEqual(decimal.Zero) {
		return nil, errors.New("计划回款金额必须大于 0")
	}
	plan := &crmmodel.CrmContractPaymentPlan{
		ContractID: req.ContractID, PlanDate: req.PlanDate, PlanAmount: req.PlanAmount,
		ReceivedAmount: decimal.Zero, Status: crmmodel.PaymentPlanUnpaid, Remark: req.Remark,
	}
	if err := s.planRepo.Create(ctx, plan); err != nil {
		return nil, err
	}
	return plan, nil
}

// CreatePlanList 批量创建回款计划。
func (s *PaymentService) CreatePlanList(ctx context.Context, reqs []CreatePaymentPlanRequest) error {
	if len(reqs) == 0 {
		return nil
	}
	return repository.Transaction(ctx, func(ctx context.Context) error {
		for i := range reqs {
			req := reqs[i]
			if req.PlanAmount.LessThanOrEqual(decimal.Zero) {
				return errors.New("计划回款金额必须大于 0")
			}
			plan := &crmmodel.CrmContractPaymentPlan{
				ContractID: req.ContractID, PlanDate: req.PlanDate, PlanAmount: req.PlanAmount,
				ReceivedAmount: decimal.Zero, Status: crmmodel.PaymentPlanUnpaid, Remark: req.Remark,
			}
			if err := s.planRepo.Create(ctx, plan); err != nil {
				return err
			}
		}
		return nil
	})
}

// GetPlan 回款计划详情。
func (s *PaymentService) GetPlan(ctx context.Context, id uint) (*crmmodel.CrmContractPaymentPlan, error) {
	plan, err := s.planRepo.GetByID(ctx, id)
	return plan, notFoundOr(err, "回款计划不存在")
}

// UpdatePaymentPlanRequest 更新回款计划请求。
type UpdatePaymentPlanRequest struct {
	PlanDate   xtime.NullDateTime `json:"plan_date" binding:"required"`
	PlanAmount decimal.Decimal   `json:"plan_amount" binding:"required"`
	Remark     string            `json:"remark"`
}

// UpdatePlan 更新回款计划(重算状态,因为 plan_amount 可能变化)。
func (s *PaymentService) UpdatePlan(ctx context.Context, id uint, req *UpdatePaymentPlanRequest) error {
	if req.PlanAmount.LessThanOrEqual(decimal.Zero) {
		return errors.New("计划回款金额必须大于 0")
	}
	plan, err := s.planRepo.GetByID(ctx, id)
	if err != nil {
		return notFoundOr(err, "回款计划不存在")
	}
	plan.PlanDate = req.PlanDate
	plan.PlanAmount = req.PlanAmount
	plan.Remark = req.Remark
	plan.Status = computePlanStatus(plan.ReceivedAmount, plan.PlanAmount)
	return s.planRepo.Update(ctx, plan)
}

// DeletePlan 删除回款计划(要求该计划已无关联记录:received_amount=0,避免累计悬空)。
func (s *PaymentService) DeletePlan(ctx context.Context, id uint) error {
	plan, err := s.planRepo.GetByID(ctx, id)
	if err != nil {
		return notFoundOr(err, "回款计划不存在")
	}
	if plan.ReceivedAmount.GreaterThan(decimal.Zero) {
		return errors.New("该计划已有回款记录,无法删除")
	}
	return s.planRepo.Delete(ctx, id)
}

// ListPlansByContract 按合同列回款计划(按计划日期升序)。
func (s *PaymentService) ListPlansByContract(ctx context.Context, contractID uint) ([]crmmodel.CrmContractPaymentPlan, error) {
	return s.planRepo.ListByContract(ctx, contractID)
}

// ── 回款记录 ──

// CreatePaymentRecordRequest 创建回款记录请求。
type CreatePaymentRecordRequest struct {
	ContractID   uint                `json:"contract_id"`
	PlanID       *uint               `json:"plan_id"`
	ReceivedDate xtime.NullDateTime  `json:"received_date" binding:"required"`
	Amount       decimal.Decimal     `json:"amount" binding:"required"`
	Method       string              `json:"method"`
	Remark       string              `json:"remark"`
}

// CreateRecord 创建回款记录并双向累计:
//   - 若 planID 属于该合同,AddPlanReceived(planID, amount) 并重算 plan.Status;
//   - AddReceivedAmount(contractID, amount) 累加合同已回款。
func (s *PaymentService) CreateRecord(ctx context.Context, req *CreatePaymentRecordRequest) (*crmmodel.CrmContractPaymentRecord, error) {
	if req.Amount.LessThanOrEqual(decimal.Zero) {
		return nil, errors.New("回款金额必须大于 0")
	}
	rec := &crmmodel.CrmContractPaymentRecord{
		ContractID: req.ContractID, PlanID: req.PlanID, ReceivedDate: req.ReceivedDate,
		Amount: req.Amount, Method: req.Method, Remark: req.Remark,
	}
	err := repository.Transaction(ctx, func(ctx context.Context) error {
		if err := s.recordRepo.Create(ctx, rec); err != nil {
			return err
		}
		// 关联计划校验 + 累计
		if req.PlanID != nil {
			plan, err := s.planRepo.GetByID(ctx, *req.PlanID)
			if err == nil && plan != nil && plan.ContractID == req.ContractID {
				if err := s.planRepo.AddPlanReceived(ctx, plan.ID, req.Amount.String()); err != nil {
					return err
				}
				// 重算状态(AddPlanReceived 是列级更新,需用内存值重算后整体 Update)
				plan.ReceivedAmount = plan.ReceivedAmount.Add(req.Amount)
				plan.Status = computePlanStatus(plan.ReceivedAmount, plan.PlanAmount)
				if err := s.planRepo.Update(ctx, plan); err != nil {
					return err
				}
			} else if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
				return err
			}
		}
		return s.contractRepo.AddReceivedAmount(ctx, req.ContractID, req.Amount.String())
	})
	if err != nil {
		return nil, err
	}

	// 事务成功后发事件:通知财务模块自动生成凭证(事务外,失败不影响回款)
	dateStr := ""
	if !rec.ReceivedDate.IsZero() {
		dateStr = time.Time(rec.ReceivedDate).Format("2006-01-02")
	}
	xevent.Publish(ctx, "crm.payment.created", map[string]any{
		"record_id":     rec.ID,
		"contract_id":   req.ContractID,
		"amount":        req.Amount.String(),
		"received_date": dateStr,
	})

	return rec, nil
}

// GetRecord 回款记录详情。
func (s *PaymentService) GetRecord(ctx context.Context, id uint) (*crmmodel.CrmContractPaymentRecord, error) {
	rec, err := s.recordRepo.GetByID(ctx, id)
	return rec, notFoundOr(err, "回款记录不存在")
}

// DeleteRecord 删除回款记录并原子反向扣减累计金额(floor 0,与 CreateRecord 走同一套原子路径,
// 避免读改写并发丢更新)。
func (s *PaymentService) DeleteRecord(ctx context.Context, id uint) error {
	rec, err := s.recordRepo.GetByID(ctx, id)
	if err != nil {
		return notFoundOr(err, "回款记录不存在")
	}
	return repository.Transaction(ctx, func(ctx context.Context) error {
		// 反向扣减计划累计(负数 + GREATEST 兜底 0),并重算计划状态
		if rec.PlanID != nil {
			plan, err := s.planRepo.GetByID(ctx, *rec.PlanID)
			if err == nil && plan != nil && plan.ContractID == rec.ContractID {
				// 原子扣减计划已回款
				if err := s.planRepo.AddPlanReceived(ctx, plan.ID, "-"+rec.Amount.String()); err != nil {
					return err
				}
				// 重算状态:用扣减后的实际值重新读 plan(received_amount 由 DB 原子更新,内存值不可信)
				fresh, err := s.planRepo.GetByID(ctx, plan.ID)
				if err != nil {
					return err
				}
				fresh.Status = computePlanStatus(fresh.ReceivedAmount, fresh.PlanAmount)
				if err := s.planRepo.Update(ctx, fresh); err != nil {
					return err
				}
			} else if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
				return err
			}
		}
		// 反向扣减合同累计(原子,负数 + GREATEST 兜底 0)
		if err := s.contractRepo.AddReceivedAmount(ctx, rec.ContractID, "-"+rec.Amount.String()); err != nil {
			return err
		}
		return s.recordRepo.Delete(ctx, id)
	})
}

// UpdatePaymentRecordRequest 更新回款记录请求(amount/plan 不可改,避免重算复杂度)。
type UpdatePaymentRecordRequest struct {
	ReceivedDate xtime.NullDateTime `json:"received_date" binding:"required"`
	Method       string             `json:"method"`
	Remark       string             `json:"remark"`
}

// UpdateRecord 仅更新 received_date/method/remark(amount 与 plan 不可改)。
func (s *PaymentService) UpdateRecord(ctx context.Context, id uint, req *UpdatePaymentRecordRequest) error {
	rec, err := s.recordRepo.GetByID(ctx, id)
	if err != nil {
		return notFoundOr(err, "回款记录不存在")
	}
	rec.ReceivedDate = req.ReceivedDate
	rec.Method = req.Method
	rec.Remark = req.Remark
	return s.recordRepo.Update(ctx, rec)
}

// ListRecordsByContract 按合同列回款记录(按回款日期降序)。
func (s *PaymentService) ListRecordsByContract(ctx context.Context, contractID uint) ([]crmmodel.CrmContractPaymentRecord, error) {
	return s.recordRepo.ListByContract(ctx, contractID)
}

// ContractPaymentSummary 合同回款汇总。
type ContractPaymentSummary struct {
	TotalAmount    decimal.Decimal                   `json:"total_amount"`
	ReceivedAmount decimal.Decimal                   `json:"received_amount"`
	Plans          []crmmodel.CrmContractPaymentPlan `json:"plans"`
}

// ContractPaymentSummary 汇总合同回款:总额、已回款、计划列表。
func (s *PaymentService) ContractPaymentSummary(ctx context.Context, contractID uint) (*ContractPaymentSummary, error) {
	contract, err := s.contractRepo.GetByID(ctx, contractID)
	if err != nil {
		return nil, notFoundOr(err, "合同不存在")
	}
	plans, err := s.planRepo.ListByContract(ctx, contractID)
	if err != nil {
		return nil, err
	}
	return &ContractPaymentSummary{
		TotalAmount: contract.TotalAmount, ReceivedAmount: contract.ReceivedAmount, Plans: plans,
	}, nil
}

// computePlanStatus 根据已回款与计划金额计算状态:
//   - received >= planAmount → 2(已回款)
//   - received > 0           → 1(部分)
//   - 否则                     → 0(未回款)
func computePlanStatus(received, planAmount decimal.Decimal) int8 {
	switch {
	case received.GreaterThanOrEqual(planAmount):
		return crmmodel.PaymentPlanPaid
	case received.GreaterThan(decimal.Zero):
		return crmmodel.PaymentPlanPartial
	default:
		return crmmodel.PaymentPlanUnpaid
	}
}
