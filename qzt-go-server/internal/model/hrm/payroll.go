package hrm

import (
	"github.com/shopspring/decimal"

	"qzt-go-server/internal/model/base"
)

// payroll.go HRM 薪酬管理。
// 工资条(月度生成) + 薪酬结构(基本工资/岗位津贴/绩效)。
// 个税按 2024 年税率表(起征点 5000,七级超额累进)。

// 工资条状态。
const (
	PayrollStatusDraft    = "DRAFT"    // 草稿
	PayrollStatusConfirmed = "CONFIRMED" // 已确认(可发放)
	PayrollStatusPaid     = "PAID"     // 已发放
)

// HrmSalaryStructure 薪酬结构(员工的基础工资配置,1:1 with employee)。
type HrmSalaryStructure struct {
	ID            uint            `json:"id" gorm:"primaryKey"`
	EmployeeID    uint            `json:"employee_id" gorm:"uniqueIndex;not null;comment:员工ID"`
	BaseSalary    decimal.Decimal `json:"base_salary" gorm:"type:decimal(12,2);comment:基本工资"`
	PositionAllow decimal.Decimal `json:"position_allowance" gorm:"type:decimal(12,2);comment:岗位津贴"`
	PerformanceAllow decimal.Decimal `json:"performance_allowance" gorm:"type:decimal(12,2);comment:绩效津贴"`
	MealAllow     decimal.Decimal `json:"meal_allowance" gorm:"type:decimal(12,2);comment:餐饮补贴"`
	TransportAllow decimal.Decimal `json:"transport_allowance" gorm:"type:decimal(12,2);comment:交通补贴"`
	// 社保公积金(个人缴纳部分比例)
	SocialInsRate decimal.Decimal `json:"social_ins_rate" gorm:"type:decimal(5,4);default:0.105;comment:社保个人比例(养老8%+医疗2%+失业0.5%)" `
	HousingFundRate decimal.Decimal `json:"housing_fund_rate" gorm:"type:decimal(5,4);default:0.07;comment:公积金个人比例"`
	SocialInsBase decimal.Decimal `json:"social_ins_base" gorm:"type:decimal(12,2);comment:社保缴纳基数"`
	HousingFundBase decimal.Decimal `json:"housing_fund_base" gorm:"type:decimal(12,2);comment:公积金缴纳基数"`
	Remark        string          `json:"remark" gorm:"size:500"`
	base.BaseModel
}

func (HrmSalaryStructure) TableName() string { return "hrm_salary_structure" }

// HrmPayroll 工资条(月度,每员工每月一条)。
type HrmPayroll struct {
	ID            uint            `json:"id" gorm:"primaryKey"`
	EmployeeID    uint            `json:"employee_id" gorm:"uniqueIndex:uk_payroll;not null;comment:员工ID"`
	YearMonth     string          `json:"year_month" gorm:"size:7;uniqueIndex:uk_payroll;not null;comment:年月(2026-08)"`
	// 应发(税前)
	BaseSalary    decimal.Decimal `json:"base_salary" gorm:"type:decimal(12,2);comment:基本工资"`
	PositionAllow decimal.Decimal `json:"position_allowance" gorm:"type:decimal(12,2);comment:岗位津贴"`
	PerformanceAllow decimal.Decimal `json:"performance_allowance" gorm:"type:decimal(12,2);comment:绩效津贴"`
	OtherAllow   decimal.Decimal `json:"other_allowance" gorm:"type:decimal(12,2);comment:其他补贴(餐补/交通)"`
	OvertimePay  decimal.Decimal `json:"overtime_pay" gorm:"type:decimal(12,2);comment:加班费"`
	GrossPay     decimal.Decimal `json:"gross_pay" gorm:"type:decimal(12,2);comment:应发合计"`
	// 扣除
	SocialInsDeduction decimal.Decimal `json:"social_ins_deduction" gorm:"type:decimal(12,2);comment:社保扣除(个人)"`
	HousingFundDeduction decimal.Decimal `json:"housing_fund_deduction" gorm:"type:decimal(12,2);comment:公积金扣除(个人)"`
	AbsenceDeduction decimal.Decimal `json:"absence_deduction" gorm:"type:decimal(12,2);comment:缺勤扣除"`
	TaxableIncome decimal.Decimal `json:"taxable_income" gorm:"type:decimal(12,2);comment:应纳税所得额"`
	Tax           decimal.Decimal `json:"tax" gorm:"type:decimal(12,2);comment:个人所得税"`
	// 实发
	NetPay       decimal.Decimal `json:"net_pay" gorm:"type:decimal(12,2);comment:实发合计(税后)"`
	Status       string          `json:"status" gorm:"size:20;default:DRAFT;index;comment:DRAFT/CONFIRMED/PAID"`
	Remark       string          `json:"remark" gorm:"size:500"`
	base.BaseModel
}

func (HrmPayroll) TableName() string { return "hrm_payroll" }
