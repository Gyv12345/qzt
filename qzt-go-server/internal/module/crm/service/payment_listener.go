package service

// payment_listener.go CRM 回款事件监听:回款→自动生成财务凭证。
// CRM 是上游业务,依赖 finance 是合理的方向(finance 不应知道 CRM 存在)。

import (
	"context"
	"fmt"

	"github.com/shopspring/decimal"

	finmodel "qzt-go-server/internal/model/finance"
	finsvc "qzt-go-server/internal/module/finance/service"
	"qzt-go-server/internal/pkg/setting"
	crrepo "qzt-go-server/internal/repository/crm"
	finrepo "qzt-go-server/internal/repository/finance"
	"qzt-go-server/pkg/xevent"
	"qzt-go-server/pkg/xlogger"
)

// 跨模块回调用的 repo(事件闭包共享,无状态)。
var (
	voucherCountRepo = finrepo.NewVoucherRepo()
	contractNameRepo = crrepo.NewContractRepo()
	accountLeafRepo  = finrepo.NewAccountRepo()
)

// RegisterPaymentListener 注册回款→凭证的事件监听器。
// 在 main.go 启动时调用(app.DB 初始化之后)。
func RegisterPaymentListener(ctx context.Context) error {
	xevent.Subscribe("crm.payment.created", func(ctx context.Context, payload any) {
		m, ok := payload.(map[string]any)
		if !ok {
			return
		}
		recordID, _ := m["record_id"].(uint)
		contractID, _ := m["contract_id"].(uint)
		amountStr, _ := m["amount"].(string)
		dateStr, _ := m["received_date"].(string)

		if recordID == 0 || amountStr == "" {
			return
		}

		// 幂等:检查是否已生成过凭证
		count, _ := voucherCountRepo.CountByBiz(ctx, "CONTRACT_PAYMENT", recordID)
		if count > 0 {
			return // 已生成,跳过
		}

		// 找回款对应的科目:优先用 sys_config 配置,否则找第一个 INCOME 末级科目
		accountID := findPaymentAccountID(ctx)
		if accountID == 0 {
			xlogger.InfofCtx(ctx, "回款凭证跳过:未配置 finance.payment_account_id 且无可用收入科目, record_id=%d", recordID)
			return
		}

		// 查合同名作为摘要(合同列是 name;title_id 是工商抬头ID,勿混用)
		contractName, _ := contractNameRepo.GetNameByID(ctx, contractID)
		if contractName == "" {
			contractName = fmt.Sprintf("合同#%d", contractID)
		}

		// 创建凭证(贷方=收入,方向 CREDIT)
		finSvc := finsvc.NewFinanceService()
		_, err := finSvc.CreateVoucher(ctx, &finsvc.CreateVoucherRequest{
			AccountID:   accountID,
			VoucherDate: dateStr,
			Description: fmt.Sprintf("回款收入 - %s", contractName),
			Direction:   finmodel.BalanceDirCredit,
			Amount:      amountStr,
			BizType:     "CONTRACT_PAYMENT",
			BizID:       &recordID,
			Remark:      fmt.Sprintf("%s 回款自动生成", contractName),
		}, 0) // operatorID=0 表示系统自动生成
		if err != nil {
			xlogger.ErrorfCtx(ctx, "回款自动生成凭证失败 record_id=%d: %v", recordID, err)
		}
	})
	return nil
}

// findPaymentAccountID 找回款凭证的默认科目:
// 1. 读 sys_config "finance.payment_account_id"
// 2. fallback:第一个 type=INCOME 且 is_leaf=1 的末级科目
func findPaymentAccountID(ctx context.Context) uint {
	// 1. sys_config 配置
	if v := setting.Get(ctx, "finance.payment_account_id"); v != "" {
		var id uint
		fmt.Sscanf(v, "%d", &id)
		if id > 0 {
			return id
		}
	}
	// 2. fallback:第一个 INCOME 末级科目
	acc, err := accountLeafRepo.FirstLeafByType(ctx, finmodel.AccountTypeIncome)
	if err != nil || acc == nil {
		return 0
	}
	return acc.ID
}

// 防止 decimal 包未使用警告(实际在 payment.go 用了)
var _ = decimal.Zero
