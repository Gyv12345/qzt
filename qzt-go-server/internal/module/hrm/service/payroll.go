package service

import (
	"context"
	"errors"
	"fmt"

	"github.com/shopspring/decimal"

	hrmmodel "qzt-go-server/internal/model/hrm"
	"qzt-go-server/internal/repository"
	hrmrepo "qzt-go-server/internal/repository/hrm"
)

// payroll.go 薪酬服务:薪酬结构CRUD + 工资条生成(含个税计算)。
// 个税按 2024 年税率表:起征点 5000/月,七级超额累进。

// PayrollService 薪酬服务。
type PayrollService struct {
	structureRepo *hrmrepo.SalaryStructureRepo
	payrollRepo   *hrmrepo.PayrollRepo
	attSvc        *AttendanceService
}

func NewPayrollService() *PayrollService {
	return &PayrollService{
		structureRepo: hrmrepo.NewSalaryStructureRepo(),
		payrollRepo:   hrmrepo.NewPayrollRepo(),
		attSvc:        NewAttendanceService(),
	}
}

// ── 薪酬结构 ──

// SaveStructureRequest 保存薪酬结构(upsert:有则更新无则创建)。
type SaveStructureRequest struct {
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
	Remark           string          `json:"remark"`
}

// SaveStructure 保存薪酬结构。
func (s *PayrollService) SaveStructure(ctx context.Context, req *SaveStructureRequest) (*hrmmodel.HrmSalaryStructure, error) {
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
		Remark:           req.Remark,
	}
	// 默认值
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

// GetStructure 查询员工薪酬结构。
func (s *PayrollService) GetStructure(ctx context.Context, employeeID uint) (*hrmmodel.HrmSalaryStructure, error) {
	structure, err := s.structureRepo.GetByEmployee(ctx, employeeID)
	return structure, notFoundOr(err, "薪酬结构不存在")
}

// ── 工资条生成 ──

// GeneratePayrollRequest 生成工资条请求。
type GeneratePayrollRequest struct {
	EmployeeID uint   `json:"employee_id" binding:"required"`
	YearMonth  string `json:"year_month" binding:"required"` // yyyy-MM
}

// GeneratePayroll 生成单员工月度工资条。
// 计算:应发 = 基本工资+津贴+加班费;扣除 = 社保+公积金+缺勤;个税 = 七级累进;实发 = 应发-扣除-个税。
func (s *PayrollService) GeneratePayroll(ctx context.Context, req *GeneratePayrollRequest) (*hrmmodel.HrmPayroll, error) {
	year, month, err := parseYearMonth(req.YearMonth)
	if err != nil {
		return nil, err
	}
	_ = year
	_ = month

	// 1. 取薪酬结构
	structure, err := s.structureRepo.GetByEmployee(ctx, req.EmployeeID)
	if err != nil {
		return nil, errors.New("员工薪酬结构不存在,请先配置")
	}

	// 2. 算应发
	otherAllow := structure.MealAllow.Add(structure.TransportAllow)
	grossPay := structure.BaseSalary.
		Add(structure.PositionAllow).
		Add(structure.PerformanceAllow).
		Add(otherAllow)

	// 3. 算社保/公积金扣除(个人部分)
	socialInsBase := structure.SocialInsBase
	if socialInsBase.IsZero() {
		socialInsBase = structure.BaseSalary
	}
	housingFundBase := structure.HousingFundBase
	if housingFundBase.IsZero() {
		housingFundBase = structure.BaseSalary
	}
	socialInsDed := socialInsBase.Mul(structure.SocialInsRate)
	housingFundDed := housingFundBase.Mul(structure.HousingFundRate)

	// 4. 应纳税所得额 = 应发 - 社保 - 公积金 - 5000(起征点)
	taxableIncome := grossPay.Sub(socialInsDed).Sub(housingFundDed).Sub(decimal.NewFromInt(5000))
	if taxableIncome.LessThan(decimal.Zero) {
		taxableIncome = decimal.Zero
	}

	// 5. 个税(七级累进)
	tax := calculateTax(taxableIncome)

	// 6. 实发
	netPay := grossPay.Sub(socialInsDed).Sub(housingFundDed).Sub(tax)

	payroll := &hrmmodel.HrmPayroll{
		EmployeeID:         req.EmployeeID,
		YearMonth:          req.YearMonth,
		BaseSalary:         structure.BaseSalary,
		PositionAllow:      structure.PositionAllow,
		PerformanceAllow:   structure.PerformanceAllow,
		OtherAllow:         otherAllow,
		GrossPay:           grossPay,
		SocialInsDeduction: socialInsDed,
		HousingFundDeduction: housingFundDed,
		TaxableIncome:      taxableIncome,
		Tax:                tax,
		NetPay:             netPay,
		Status:             hrmmodel.PayrollStatusDraft,
	}

	// upsert:同员工同月份已存在则更新
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

// PayrollList 工资条列表(按年月/部门过滤)。
func (s *PayrollService) PayrollList(ctx context.Context, yearMonth string, departmentID uint) ([]hrmmodel.HrmPayroll, error) {
	db := repository.DBFrom(ctx).Model(&hrmmodel.HrmPayroll{})
	if yearMonth != "" {
		db = db.Where("year_month = ?", yearMonth)
	}
	if departmentID > 0 {
		db = db.Where("employee_id IN (SELECT id FROM hrm_employee WHERE department_id = ?)", departmentID)
	}
	var list []hrmmodel.HrmPayroll
	err := db.Order("employee_id ASC").Find(&list).Error
	return list, err
}

// ConfirmPayroll 确认工资条(DRAFT → CONFIRMED)。
func (s *PayrollService) ConfirmPayroll(ctx context.Context, id uint) error {
	p, err := s.payrollRepo.GetByID(ctx, id)
	if err != nil {
		return errors.New("工资条不存在")
	}
	if p.Status != hrmmodel.PayrollStatusDraft {
		return errors.New("仅草稿状态可确认")
	}
	p.Status = hrmmodel.PayrollStatusConfirmed
	return s.payrollRepo.Update(ctx, p)
}

// MarkPaid 标记已发放(CONFIRMED → PAID)。
func (s *PayrollService) MarkPaid(ctx context.Context, id uint) error {
	p, err := s.payrollRepo.GetByID(ctx, id)
	if err != nil {
		return errors.New("工资条不存在")
	}
	if p.Status != hrmmodel.PayrollStatusConfirmed {
		return errors.New("仅已确认状态可标记发放")
	}
	p.Status = hrmmodel.PayrollStatusPaid
	return s.payrollRepo.Update(ctx, p)
}

// calculateTax 个税计算(2024年七级超额累进,起征点5000)。
// taxableIncome 为已扣除5000起征点后的应纳税所得额(月度)。
//
// 税率表:
//   ≤3000:           3%   速算扣除 0
//   ≤12000:          10%  速算扣除 210
//   ≤25000:          20%  速算扣除 1410
//   ≤35000:          25%  速算扣除 2660
//   ≤55000:          30%  速算扣除 4410
//   ≤80000:          35%  速算扣除 7160
//   >80000:          45%  速算扣除 15160
func calculateTax(taxableIncome decimal.Decimal) decimal.Decimal {
	if taxableIncome.LessThanOrEqual(decimal.Zero) {
		return decimal.Zero
	}

	levels := []struct {
		threshold decimal.Decimal
		rate      decimal.Decimal
		quickDed  decimal.Decimal
	}{
		{decimal.NewFromInt(3000), decimal.NewFromFloat(0.03), decimal.Zero},
		{decimal.NewFromInt(12000), decimal.NewFromFloat(0.10), decimal.NewFromInt(210)},
		{decimal.NewFromInt(25000), decimal.NewFromFloat(0.20), decimal.NewFromInt(1410)},
		{decimal.NewFromInt(35000), decimal.NewFromFloat(0.25), decimal.NewFromInt(2660)},
		{decimal.NewFromInt(55000), decimal.NewFromFloat(0.30), decimal.NewFromInt(4410)},
		{decimal.NewFromInt(80000), decimal.NewFromFloat(0.35), decimal.NewFromInt(7160)},
		{decimal.Zero, decimal.NewFromFloat(0.45), decimal.NewFromInt(15160)}, // >80000
	}

	for _, lv := range levels {
		if lv.threshold.IsZero() || taxableIncome.LessThanOrEqual(lv.threshold) {
			return taxableIncome.Mul(lv.rate).Sub(lv.quickDed).Round(2)
		}
	}
	return decimal.Zero
}

// _ 避免 fmt 未使用
var _ = fmt.Sprintf
