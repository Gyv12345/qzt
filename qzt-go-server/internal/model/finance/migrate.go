package finance

import (
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// migrate.go 财务模块建表 + 种子数据。

func allModels() []any {
	return []any{
		&FinAccount{},
		&FinVoucher{},
		&FinInvoice{},
	}
}

func AutoMigrate(db *gorm.DB) error {
	return db.AutoMigrate(allModels()...)
}

// SeedFinanceData 写入标准会计科目体系(企业会计准则一级科目)。
// 幂等:fin_account 表有数据则跳过。
func SeedFinanceData(db *gorm.DB) error {
	var count int64
	db.Model(&FinAccount{}).Count(&count)
	if count > 0 {
		return nil
	}
	zap.S().Info("开始写入财务科目体系...")
	accounts := defaultAccounts()
	if err := db.Create(&accounts).Error; err != nil {
		return err
	}
	zap.S().Info("财务科目体系写入完成(%d 个科目)", len(accounts))
	return nil
}

// defaultAccounts 标准企业会计一级科目(简化版)。
func defaultAccounts() []FinAccount {
	return []FinAccount{
		// 资产类(1xxx)
		{Code: "1001", Name: "库存现金", Type: AccountTypeAsset, BalanceDir: BalanceDirDebit, Level: 1, IsLeaf: true, Status: 1, Sort: 1},
		{Code: "1002", Name: "银行存款", Type: AccountTypeAsset, BalanceDir: BalanceDirDebit, Level: 1, IsLeaf: true, Status: 1, Sort: 2},
		{Code: "1122", Name: "应收账款", Type: AccountTypeAsset, BalanceDir: BalanceDirDebit, Level: 1, IsLeaf: true, Status: 1, Sort: 3},
		{Code: "1123", Name: "预付账款", Type: AccountTypeAsset, BalanceDir: BalanceDirDebit, Level: 1, IsLeaf: true, Status: 1, Sort: 4},
		{Code: "1405", Name: "库存商品", Type: AccountTypeAsset, BalanceDir: BalanceDirDebit, Level: 1, IsLeaf: true, Status: 1, Sort: 5},
		{Code: "1601", Name: "固定资产", Type: AccountTypeAsset, BalanceDir: BalanceDirDebit, Level: 1, IsLeaf: true, Status: 1, Sort: 6},
		// 负债类(2xxx)
		{Code: "2202", Name: "应付账款", Type: AccountTypeLiability, BalanceDir: BalanceDirCredit, Level: 1, IsLeaf: true, Status: 1, Sort: 10},
		{Code: "2203", Name: "预收账款", Type: AccountTypeLiability, BalanceDir: BalanceDirCredit, Level: 1, IsLeaf: true, Status: 1, Sort: 11},
		{Code: "2211", Name: "应付职工薪酬", Type: AccountTypeLiability, BalanceDir: BalanceDirCredit, Level: 1, IsLeaf: true, Status: 1, Sort: 12},
		{Code: "2221", Name: "应交税费", Type: AccountTypeLiability, BalanceDir: BalanceDirCredit, Level: 1, IsLeaf: true, Status: 1, Sort: 13},
		// 权益类(4xxx)
		{Code: "4001", Name: "实收资本", Type: AccountTypeEquity, BalanceDir: BalanceDirCredit, Level: 1, IsLeaf: true, Status: 1, Sort: 20},
		{Code: "4103", Name: "本年利润", Type: AccountTypeEquity, BalanceDir: BalanceDirCredit, Level: 1, IsLeaf: true, Status: 1, Sort: 21},
		// 收入类(6xxx)
		{Code: "6001", Name: "主营业务收入", Type: AccountTypeIncome, BalanceDir: BalanceDirCredit, Level: 1, IsLeaf: true, Status: 1, Sort: 30},
		{Code: "6051", Name: "其他业务收入", Type: AccountTypeIncome, BalanceDir: BalanceDirCredit, Level: 1, IsLeaf: true, Status: 1, Sort: 31},
		// 支出类(7xxx)
		{Code: "6601", Name: "销售费用", Type: AccountTypeExpense, BalanceDir: BalanceDirDebit, Level: 1, IsLeaf: true, Status: 1, Sort: 40},
		{Code: "6602", Name: "管理费用", Type: AccountTypeExpense, BalanceDir: BalanceDirDebit, Level: 1, IsLeaf: true, Status: 1, Sort: 41},
		{Code: "6603", Name: "财务费用", Type: AccountTypeExpense, BalanceDir: BalanceDirDebit, Level: 1, IsLeaf: true, Status: 1, Sort: 42},
		{Code: "6401", Name: "主营业务成本", Type: AccountTypeExpense, BalanceDir: BalanceDirDebit, Level: 1, IsLeaf: true, Status: 1, Sort: 43},
	}
}
