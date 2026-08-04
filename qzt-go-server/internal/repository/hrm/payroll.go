package hrm

import (
	"context"

	hrmmodel "qzt-go-server/internal/model/hrm"
	"qzt-go-server/internal/repository"
)

// payroll.go 薪酬 repository。

// ── 薪酬结构 ──

type SalaryStructureRepo struct {
	repository.BaseRepo[hrmmodel.HrmSalaryStructure]
}

func NewSalaryStructureRepo() *SalaryStructureRepo { return &SalaryStructureRepo{} }

// GetByEmployee 按员工ID查薪酬结构。
func (r *SalaryStructureRepo) GetByEmployee(ctx context.Context, employeeID uint) (*hrmmodel.HrmSalaryStructure, error) {
	var s hrmmodel.HrmSalaryStructure
	err := repoDB(ctx).Where("employee_id = ?", employeeID).First(&s).Error
	return &s, err
}

func (r *SalaryStructureRepo) Update(ctx context.Context, m *hrmmodel.HrmSalaryStructure) error {
	return r.BaseRepo.Update(ctx, m, "BaseSalary", "PositionAllow", "PerformanceAllow",
		"MealAllow", "TransportAllow", "SocialInsRate", "HousingFundRate", "SocialInsBase", "HousingFundBase", "Remark")
}

// ── 工资条 ──

type PayrollRepo struct {
	repository.BaseRepo[hrmmodel.HrmPayroll]
}

func NewPayrollRepo() *PayrollRepo { return &PayrollRepo{} }

// GetByEmpMonth 按员工+年月查工资条。
func (r *PayrollRepo) GetByEmpMonth(ctx context.Context, employeeID uint, yearMonth string) (*hrmmodel.HrmPayroll, error) {
	var p hrmmodel.HrmPayroll
	err := repoDB(ctx).Where("employee_id = ? AND year_month = ?", employeeID, yearMonth).First(&p).Error
	return &p, err
}

func (r *PayrollRepo) Update(ctx context.Context, m *hrmmodel.HrmPayroll) error {
	return r.BaseRepo.Update(ctx, m, "BaseSalary", "PositionAllow", "PerformanceAllow", "OtherAllow",
		"OvertimePay", "GrossPay", "SocialInsDeduction", "HousingFundDeduction", "AbsenceDeduction",
		"TaxableIncome", "Tax", "NetPay", "Status", "Remark")
}
