package service

import (
	"context"
	"encoding/json"
	"errors"
	"strings"

	"github.com/shopspring/decimal"

	hrmmodel "qzt-go-server/internal/model/hrm"
	"qzt-go-server/internal/repository"
	hrmrepo "qzt-go-server/internal/repository/hrm"
)

// payroll_v2.go 薪酬 v2 接线(P16):社保方案/工资项 CRUD + 工资条公式引擎模式。
// 双口径与考勤 v2 同原则:员工未挂方案且系统未启用工资项 → 完全走原口径(数值不变);
// 一旦启用工资项(hrm_salary_item 有启用行) → 按项求值生成,快照落工资条 items_snapshot,
// 历史工资条不可重算(重新生成才按当期公式)。

// PayrollConfigService 社保方案/工资项服务。
type PayrollConfigService struct {
	planRepo *hrmrepo.InsurancePlanRepo
	itemRepo *hrmrepo.SalaryItemRepo
}

func NewPayrollConfigService() *PayrollConfigService {
	return &PayrollConfigService{
		planRepo: hrmrepo.NewInsurancePlanRepo(),
		itemRepo: hrmrepo.NewSalaryItemRepo(),
	}
}

// ── 社保方案 ──

// InsurancePlanRequest 社保方案请求。
type InsurancePlanRequest struct {
	Name             string           `json:"name" binding:"required"`
	PensionRate      decimal.Decimal  `json:"pension_rate"`
	MedicalRate      decimal.Decimal  `json:"medical_rate"`
	UnemploymentRate decimal.Decimal  `json:"unemployment_rate"`
	InjuryRate       decimal.Decimal  `json:"injury_rate"`
	MaternityRate    decimal.Decimal  `json:"maternity_rate"`
	FundRate         decimal.Decimal  `json:"fund_rate"`
	BaseMin          *decimal.Decimal `json:"base_min"`
	BaseMax          *decimal.Decimal `json:"base_max"`
	Status           int8             `json:"status"`
}

func validPlanRates(p *InsurancePlanRequest) error {
	rates := []decimal.Decimal{p.PensionRate, p.MedicalRate, p.UnemploymentRate, p.InjuryRate, p.MaternityRate, p.FundRate}
	for _, r := range rates {
		if r.IsNegative() || r.GreaterThan(decimal.NewFromFloat(1)) {
			return errors.New("比例须在 0~1 之间")
		}
	}
	return nil
}

// CreatePlan 新建社保方案。
func (s *PayrollConfigService) CreatePlan(ctx context.Context, req *InsurancePlanRequest) (*hrmmodel.HrmInsurancePlan, error) {
	if err := validPlanRates(req); err != nil {
		return nil, err
	}
	p := &hrmmodel.HrmInsurancePlan{
		Name: req.Name, PensionRate: req.PensionRate, MedicalRate: req.MedicalRate,
		UnemploymentRate: req.UnemploymentRate, InjuryRate: req.InjuryRate,
		MaternityRate: req.MaternityRate, FundRate: req.FundRate,
		BaseMin: req.BaseMin, BaseMax: req.BaseMax, Status: 1,
	}
	if req.Status != 0 {
		p.Status = req.Status
	}
	if err := s.planRepo.Create(ctx, p); err != nil {
		return nil, err
	}
	return p, nil
}

// UpdatePlan 更新社保方案。
func (s *PayrollConfigService) UpdatePlan(ctx context.Context, id uint, req *InsurancePlanRequest) error {
	p, err := s.planRepo.GetByID(ctx, id)
	if err != nil {
		return errors.New("社保方案不存在")
	}
	if err := validPlanRates(req); err != nil {
		return err
	}
	p.Name = req.Name
	p.PensionRate = req.PensionRate
	p.MedicalRate = req.MedicalRate
	p.UnemploymentRate = req.UnemploymentRate
	p.InjuryRate = req.InjuryRate
	p.MaternityRate = req.MaternityRate
	p.FundRate = req.FundRate
	p.BaseMin = req.BaseMin
	p.BaseMax = req.BaseMax
	if req.Status != 0 {
		p.Status = req.Status
	}
	return s.planRepo.Update(ctx, p)
}

// DeletePlan 删除社保方案。
func (s *PayrollConfigService) DeletePlan(ctx context.Context, id uint) error {
	if _, err := s.planRepo.GetByID(ctx, id); err != nil {
		return errors.New("社保方案不存在")
	}
	return s.planRepo.Delete(ctx, id)
}

// ListPlans 社保方案列表。
func (s *PayrollConfigService) ListPlans(ctx context.Context, page, pageSize int) ([]hrmmodel.HrmInsurancePlan, int64, error) {
	return s.planRepo.PageList(ctx, page, pageSize, &repository.QueryOptions{Order: []string{"id DESC"}})
}

// ── 工资项 ──

// SalaryItemRequest 工资项请求。
type SalaryItemRequest struct {
	Code        string          `json:"code" binding:"required"`
	Name        string          `json:"name" binding:"required"`
	Kind        string          `json:"kind" binding:"required"`
	Formula     string          `json:"formula"`
	FixedAmount decimal.Decimal `json:"fixed_amount"`
	Sort        int             `json:"sort"`
	Status      int8            `json:"status"`
}

func validSalaryItemCode(code string) bool {
	if code == "" || len(code) > 32 {
		return false
	}
	for i, c := range code {
		ok := c >= 'A' && c <= 'Z' || c == '_'
		if i > 0 {
			ok = ok || c >= '0' && c <= '9'
		}
		if !ok {
			return false
		}
	}
	return true
}

// CreateItem 新建工资项。
func (s *PayrollConfigService) CreateItem(ctx context.Context, req *SalaryItemRequest) (*hrmmodel.HrmSalaryItem, error) {
	if !validSalaryItemCode(req.Code) {
		return nil, errors.New("编码只能是大写字母开头的大写字母/数字/下划线")
	}
	if req.Kind != hrmmodel.SalaryItemKindIncome && req.Kind != hrmmodel.SalaryItemKindDeduct && req.Kind != hrmmodel.SalaryItemKindTax {
		return nil, errors.New("类别只能是 INCOME/DEDUCT/TAX")
	}
	it := &hrmmodel.HrmSalaryItem{
		Code: req.Code, Name: req.Name, Kind: req.Kind,
		Formula: req.Formula, FixedAmount: req.FixedAmount,
		Sort: req.Sort, Status: 1,
	}
	if req.Status != 0 {
		it.Status = req.Status
	}
	if err := s.itemRepo.Create(ctx, it); err != nil {
		return nil, errors.New("保存失败(编码可能已存在)")
	}
	return it, nil
}

// UpdateItem 更新工资项。
func (s *PayrollConfigService) UpdateItem(ctx context.Context, id uint, req *SalaryItemRequest) error {
	it, err := s.itemRepo.GetByID(ctx, id)
	if err != nil {
		return errors.New("工资项不存在")
	}
	if !validSalaryItemCode(req.Code) {
		return errors.New("编码只能是大写字母开头的大写字母/数字/下划线")
	}
	if req.Kind != hrmmodel.SalaryItemKindIncome && req.Kind != hrmmodel.SalaryItemKindDeduct && req.Kind != hrmmodel.SalaryItemKindTax {
		return errors.New("类别只能是 INCOME/DEDUCT/TAX")
	}
	it.Code = req.Code
	it.Name = req.Name
	it.Kind = req.Kind
	it.Formula = req.Formula
	it.FixedAmount = req.FixedAmount
	it.Sort = req.Sort
	if req.Status != 0 {
		it.Status = req.Status
	}
	return s.itemRepo.Update(ctx, it)
}

// DeleteItem 删除工资项。
func (s *PayrollConfigService) DeleteItem(ctx context.Context, id uint) error {
	if _, err := s.itemRepo.GetByID(ctx, id); err != nil {
		return errors.New("工资项不存在")
	}
	return s.itemRepo.Delete(ctx, id)
}

// ListItems 工资项列表(按 sort 升序)。
func (s *PayrollConfigService) ListItems(ctx context.Context, page, pageSize int) ([]hrmmodel.HrmSalaryItem, int64, error) {
	return s.itemRepo.PageList(ctx, page, pageSize, &repository.QueryOptions{Order: []string{"sort ASC, id ASC"}})
}

// ── 公式引擎模式工资条 ──

// PayrollItemSnapshot 工资条快照行。
type PayrollItemSnapshot struct {
	Code   string `json:"code"`
	Name   string `json:"name"`
	Kind   string `json:"kind"`
	Amount string `json:"amount"`
}

// generatePayrollByItems 公式引擎模式:按启用的工资项逐项求值生成工资条。
// 社保:structure.plan_id 有值时按方案比例(五险合计)与基数钳制;无方案按 structure 比例。
// 个税:有 TAX 类工资项用其求值合计;否则按内置七级累进(应纳税所得额=应发-社保-公积金-5000)。
func (s *PayrollService) generatePayrollByItems(
	ctx context.Context,
	req *GeneratePayrollRequest,
	structure *hrmmodel.HrmSalaryStructure,
	items []hrmmodel.HrmSalaryItem,
) (*hrmmodel.HrmPayroll, error) {
	// 1. 社保比例与基数(方案优先)
	socialRate, fundRate := structure.SocialInsRate, structure.HousingFundRate
	if structure.PlanID != nil && *structure.PlanID > 0 {
		plan, err := s.insurancePlanRepo.GetByID(ctx, *structure.PlanID)
		if err != nil {
			return nil, errors.New("薪酬结构挂载的社保方案不存在")
		}
		socialRate = plan.PensionRate.Add(plan.MedicalRate).
			Add(plan.UnemploymentRate).Add(plan.InjuryRate).Add(plan.MaternityRate)
		fundRate = plan.FundRate
		// 基数钳制(plan.base_min/base_max)
		clamp := func(base decimal.Decimal) decimal.Decimal {
			if plan.BaseMin != nil && base.LessThan(*plan.BaseMin) {
				return *plan.BaseMin
			}
			if plan.BaseMax != nil && base.GreaterThan(*plan.BaseMax) {
				return *plan.BaseMax
			}
			return base
		}
		structure.SocialInsBase = clamp(structure.SocialInsBase)
		structure.HousingFundBase = clamp(structure.HousingFundBase)
	}

	// 2. 初始变量(结构字段 → 大写编码;基数回退同旧口径)
	socialBase := structure.SocialInsBase
	if socialBase.IsZero() {
		socialBase = structure.BaseSalary
	}
	fundBase := structure.HousingFundBase
	if fundBase.IsZero() {
		fundBase = structure.BaseSalary
	}
	vars := map[string]decimal.Decimal{
		"BASE_SALARY":           structure.BaseSalary,
		"POSITION_ALLOWANCE":    structure.PositionAllow,
		"PERFORMANCE_ALLOWANCE": structure.PerformanceAllow,
		"MEAL_ALLOWANCE":        structure.MealAllow,
		"TRANSPORT_ALLOWANCE":   structure.TransportAllow,
		"SOCIAL_INS_BASE":       socialBase,
		"HOUSING_FUND_BASE":     fundBase,
		"SOCIAL_INS_RATE":       socialRate,
		"HOUSING_FUND_RATE":     fundRate,
	}

	// 3. 逐项求值(sort 升序;公式为空取固定值;每项结果入 vars 供后续项引用)
	snap := make([]PayrollItemSnapshot, 0, len(items))
	sumIncome, sumDeduct, sumTax := decimal.Zero, decimal.Zero, decimal.Zero
	for _, it := range items {
		val, err := func() (decimal.Decimal, error) {
			if strings.TrimSpace(it.Formula) != "" {
				return EvalSalaryFormula(it.Formula, vars)
			}
			return it.FixedAmount, nil
		}()
		if err != nil {
			return nil, errors.New("工资项「" + it.Name + "」计算失败: " + err.Error())
		}
		val = val.Round(2)
		vars[it.Code] = val
		snap = append(snap, PayrollItemSnapshot{Code: it.Code, Name: it.Name, Kind: it.Kind, Amount: val.StringFixed(2)})
		switch it.Kind {
		case hrmmodel.SalaryItemKindIncome:
			sumIncome = sumIncome.Add(val)
		case hrmmodel.SalaryItemKindDeduct:
			sumDeduct = sumDeduct.Add(val)
		case hrmmodel.SalaryItemKindTax:
			sumTax = sumTax.Add(val)
		}
	}

	// 4. 字段映射(兼容现有工资条列)
	socialDed := vars["SOCIAL_INS_DEDUCT"]
	fundDed := vars["HOUSING_FUND_DEDUCT"]
	tax := sumTax
	taxable := sumIncome.Sub(socialDed).Sub(fundDed).Sub(decimal.NewFromInt(5000))
	if taxable.LessThan(decimal.Zero) {
		taxable = decimal.Zero
	}
	if sumTax.IsZero() {
		tax = calculateTax(taxable)
	}
	net := sumIncome.Sub(sumDeduct).Sub(tax)

	snapJSON, _ := json.Marshal(snap)
	payroll := &hrmmodel.HrmPayroll{
		EmployeeID:           req.EmployeeID,
		YearMonth:            req.YearMonth,
		BaseSalary:           vars["BASE_SALARY"],
		PositionAllow:        vars["POSITION_ALLOWANCE"],
		PerformanceAllow:     vars["PERFORMANCE_ALLOWANCE"],
		OtherAllow:           vars["MEAL_ALLOWANCE"].Add(vars["TRANSPORT_ALLOWANCE"]),
		GrossPay:             sumIncome.Round(2),
		SocialInsDeduction:   socialDed,
		HousingFundDeduction: fundDed,
		TaxableIncome:        taxable,
		Tax:                  tax,
		NetPay:               net,
		ItemsSnapshot:        string(snapJSON),
		Status:               hrmmodel.PayrollStatusDraft,
	}

	// 5. upsert(同原口径)
	existing, err := s.payrollRepo.GetByEmpMonth(ctx, req.EmployeeID, req.YearMonth)
	if err == nil && existing != nil {
		payroll.ID = existing.ID
		if err := s.payrollRepo.Update(ctx, payroll); err != nil {
			return nil, err
		}
	} else {
		if err := s.payrollRepo.Create(ctx, payroll); err != nil {
			return nil, err
		}
	}
	return payroll, nil
}

// ── 薪酬结构 v2(支持挂社保方案) ──

// SaveStructureV2Request 保存薪酬结构(v2:支持挂社保方案;plan_id 缺省/0=清除挂载)。
type SaveStructureV2Request struct {
	EmployeeID       uint            `json:"employee_id" binding:"required"`
	BaseSalary       decimal.Decimal `json:"base_salary"`
	PositionAllow    decimal.Decimal `json:"position_allowance"`
	PerformanceAllow decimal.Decimal `json:"performance_allowance"`
	MealAllow        decimal.Decimal `json:"meal_allowance"`
	TransportAllow   decimal.Decimal `json:"transport_allowance"`
	SocialInsRate    decimal.Decimal `json:"social_ins_rate"`
	HousingFundRate  decimal.Decimal `json:"housing_fund_rate"`
	SocialInsBase    decimal.Decimal `json:"social_ins_base"`
	HousingFundBase  decimal.Decimal `json:"housing_fund_base"`
	PlanID           *uint           `json:"plan_id"`
	Remark           string          `json:"remark"`
}

// SaveStructureV2 保存薪酬结构(v2):同原 upsert 语义,支持挂/清社保方案。
func (s *PayrollService) SaveStructureV2(ctx context.Context, req *SaveStructureV2Request, _ uint) (*hrmmodel.HrmSalaryStructure, error) {
	if req.PlanID != nil && *req.PlanID == 0 {
		req.PlanID = nil
	}
	existing, err := s.structureRepo.GetByEmployee(ctx, req.EmployeeID)
	structure := &hrmmodel.HrmSalaryStructure{
		EmployeeID:       req.EmployeeID,
		BaseSalary:       req.BaseSalary,
		PositionAllow:    req.PositionAllow,
		PerformanceAllow: req.PerformanceAllow,
		MealAllow:        req.MealAllow,
		TransportAllow:   req.TransportAllow,
		SocialInsRate:    req.SocialInsRate,
		HousingFundRate:  req.HousingFundRate,
		SocialInsBase:    req.SocialInsBase,
		HousingFundBase:  req.HousingFundBase,
		PlanID:           req.PlanID,
		Remark:           req.Remark,
	}
	if structure.SocialInsRate.IsZero() {
		structure.SocialInsRate = decimal.NewFromFloat(0.105)
	}
	if structure.HousingFundRate.IsZero() {
		structure.HousingFundRate = decimal.NewFromFloat(0.07)
	}
	if err == nil && existing != nil {
		structure.ID = existing.ID
		if err := s.structureRepo.Update(ctx, structure); err != nil {
			return nil, err
		}
	} else {
		if err := s.structureRepo.Create(ctx, structure); err != nil {
			return nil, err
		}
	}
	return structure, nil
}
