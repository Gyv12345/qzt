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
	PayrollStatusDraft     = "DRAFT"     // 草稿
	PayrollStatusConfirmed = "CONFIRMED" // 已确认(可发放)
	PayrollStatusPaid      = "PAID"      // 已发放
)

// HrmSalaryStructure 薪酬结构(员工的基础工资配置,1:1 with employee)。
type HrmSalaryStructure struct {
	ID uint `json:"id" gorm:"primaryKey"`
	// 员工ID
	EmployeeID uint `json:"employee_id" gorm:"uniqueIndex;not null;comment:员工ID"`
	// 基本工资
	BaseSalary decimal.Decimal `json:"base_salary" gorm:"type:decimal(12,2);comment:基本工资"`
	// 岗位津贴
	PositionAllow decimal.Decimal `json:"position_allowance" gorm:"type:decimal(12,2);comment:岗位津贴"`
	// 绩效津贴
	PerformanceAllow decimal.Decimal `json:"performance_allowance" gorm:"type:decimal(12,2);comment:绩效津贴"`
	// 餐饮补贴
	MealAllow decimal.Decimal `json:"meal_allowance" gorm:"type:decimal(12,2);comment:餐饮补贴"`
	// 交通补贴
	TransportAllow decimal.Decimal `json:"transport_allowance" gorm:"type:decimal(12,2);comment:交通补贴"`
	// 社保公积金(个人缴纳部分比例)
	SocialInsRate decimal.Decimal `json:"social_ins_rate" gorm:"type:decimal(5,4);default:0.105;comment:社保个人比例(养老8%+医疗2%+失业0.5%)" `
	// 公积金个人比例
	HousingFundRate decimal.Decimal `json:"housing_fund_rate" gorm:"type:decimal(5,4);default:0.07;comment:公积金个人比例"`
	// 社保缴纳基数
	SocialInsBase decimal.Decimal `json:"social_ins_base" gorm:"type:decimal(12,2);comment:社保缴纳基数"`
	// 公积金缴纳基数
	HousingFundBase decimal.Decimal `json:"housing_fund_base" gorm:"type:decimal(12,2);comment:公积金缴纳基数"`
	// 社保方案ID(NULL=沿用 structure 内置比例;有值=按 hrm_insurance_plan 方案计算)
	PlanID *uint  `json:"plan_id" gorm:"comment:社保方案ID(NULL=沿用内置比例)"`
	Remark string `json:"remark" gorm:"size:500"`
	base.BaseModel
}

func (HrmSalaryStructure) TableName() string { return "hrm_salary_structure" }

// HrmPayroll 工资条(月度,每员工每月一条)。
type HrmPayroll struct {
	ID uint `json:"id" gorm:"primaryKey"`
	// 员工ID
	EmployeeID uint `json:"employee_id" gorm:"uniqueIndex:uk_payroll;not null;comment:员工ID"`
	// 年月(2026-08)
	YearMonth string `json:"year_month" gorm:"size:7;uniqueIndex:uk_payroll;not null;comment:年月(2026-08)"`
	// 应发(税前)
	BaseSalary decimal.Decimal `json:"base_salary" gorm:"type:decimal(12,2);comment:基本工资"`
	// 岗位津贴
	PositionAllow decimal.Decimal `json:"position_allowance" gorm:"type:decimal(12,2);comment:岗位津贴"`
	// 绩效津贴
	PerformanceAllow decimal.Decimal `json:"performance_allowance" gorm:"type:decimal(12,2);comment:绩效津贴"`
	// 其他补贴(餐补/交通)
	OtherAllow decimal.Decimal `json:"other_allowance" gorm:"type:decimal(12,2);comment:其他补贴(餐补/交通)"`
	// 加班费
	OvertimePay decimal.Decimal `json:"overtime_pay" gorm:"type:decimal(12,2);comment:加班费"`
	// 应发合计
	GrossPay decimal.Decimal `json:"gross_pay" gorm:"type:decimal(12,2);comment:应发合计"`
	// 扣除
	SocialInsDeduction decimal.Decimal `json:"social_ins_deduction" gorm:"type:decimal(12,2);comment:社保扣除(个人)"`
	// 公积金扣除(个人)
	HousingFundDeduction decimal.Decimal `json:"housing_fund_deduction" gorm:"type:decimal(12,2);comment:公积金扣除(个人)"`
	// 缺勤扣除
	AbsenceDeduction decimal.Decimal `json:"absence_deduction" gorm:"type:decimal(12,2);comment:缺勤扣除"`
	// 应纳税所得额
	TaxableIncome decimal.Decimal `json:"taxable_income" gorm:"type:decimal(12,2);comment:应纳税所得额"`
	// 个人所得税
	Tax decimal.Decimal `json:"tax" gorm:"type:decimal(12,2);comment:个人所得税"`
	// 实发
	NetPay decimal.Decimal `json:"net_pay" gorm:"type:decimal(12,2);comment:实发合计(税后)"`
	// 工资项求值快照(JSON:[{code,name,kind,amount}],公式引擎模式落快照;传统模式 NULL)
	ItemsSnapshot string `json:"items_snapshot" gorm:"type:text;comment:工资项求值快照JSON(公式引擎模式)"`
	// DRAFT/CONFIRMED/PAID
	Status string `json:"status" gorm:"size:20;default:DRAFT;index;comment:DRAFT/CONFIRMED/PAID"`
	Remark string `json:"remark" gorm:"size:500"`
	base.BaseModel
}

func (HrmPayroll) TableName() string { return "hrm_payroll" }

// 工资项类别。
const (
	SalaryItemKindIncome = "INCOME" // 收入(应发加项)
	SalaryItemKindDeduct = "DEDUCT" // 扣款(社保/公积金/其他扣除)
	SalaryItemKindTax    = "TAX"    // 扣税(配置后替代内置个税计算)
)

// HrmInsurancePlan 社保公积金方案(多方案,比例可配,替代 structure 内置硬比例)。
type HrmInsurancePlan struct {
	ID uint `json:"id" gorm:"primaryKey"`
	// 方案名称
	Name string `json:"name" gorm:"size:64;not null;comment:方案名称"`
	// 养老比例
	PensionRate decimal.Decimal `json:"pension_rate" gorm:"type:decimal(6,4);not null;default:0;comment:养老比例"`
	// 医疗比例
	MedicalRate decimal.Decimal `json:"medical_rate" gorm:"type:decimal(6,4);not null;default:0;comment:医疗比例"`
	// 失业比例
	UnemploymentRate decimal.Decimal `json:"unemployment_rate" gorm:"type:decimal(6,4);not null;default:0;comment:失业比例"`
	// 工伤比例
	InjuryRate decimal.Decimal `json:"injury_rate" gorm:"type:decimal(6,4);not null;default:0;comment:工伤比例"`
	// 生育比例
	MaternityRate decimal.Decimal `json:"maternity_rate" gorm:"type:decimal(6,4);not null;default:0;comment:生育比例"`
	// 公积金比例
	FundRate decimal.Decimal `json:"fund_rate" gorm:"type:decimal(6,4);not null;default:0;comment:公积金比例"`
	// 基数下限(NULL=不限)
	BaseMin *decimal.Decimal `json:"base_min" gorm:"type:decimal(14,2);comment:基数下限(NULL=不限)"`
	// 基数上限(NULL=不限)
	BaseMax *decimal.Decimal `json:"base_max" gorm:"type:decimal(14,2);comment:基数上限(NULL=不限)"`
	// 1启用 0停用
	Status int8 `json:"status" gorm:"not null;default:1;comment:1启用 0停用"`
	base.BaseModel
}

func (HrmInsurancePlan) TableName() string { return "hrm_insurance_plan" }

// HrmSalaryItem 工资项定义(公式引擎求值,sort 升序为求值顺序)。
type HrmSalaryItem struct {
	ID uint `json:"id" gorm:"primaryKey"`
	// 工资项编码(公式引用,大写字母+数字+下划线)
	Code string `json:"code" gorm:"size:32;uniqueIndex:uk_code;not null;comment:工资项编码(公式引用)"`
	// 名称
	Name string `json:"name" gorm:"size:64;not null;comment:工资项名称"`
	// INCOME收入 / DEDUCT扣款 / TAX扣税
	Kind string `json:"kind" gorm:"size:16;not null;comment:INCOME/DEDUCT/TAX"`
	// 计算公式(受限四则:数字/项编码/+ - * / 括号/round(x,n);NULL=用固定值)
	Formula string `json:"formula" gorm:"size:255;comment:计算公式(空=固定值)"`
	// 固定值(无公式时使用)
	FixedAmount decimal.Decimal `json:"fixed_amount" gorm:"type:decimal(14,2);comment:固定值(无公式时)"`
	// 排序(求值顺序,小在前)
	Sort int `json:"sort" gorm:"not null;default:0;comment:排序(求值顺序)"`
	// 1启用 0停用
	Status int8 `json:"status" gorm:"not null;default:1;comment:1启用 0停用"`
	base.BaseModel
}

func (HrmSalaryItem) TableName() string { return "hrm_salary_item" }
