package service

import (
	"context"

	"qzt-go-server/internal/pkg/numbergen"
	crrepo "qzt-go-server/internal/repository/crm"
)

// number_rules.go 注册 CRM 各业务的编号规则到公共 numbergen 包。
// init() 在包加载时自动执行,无需手动调用;计数走各实体 repository 的 CountByNoPrefix。

// noCount 把实体 repo 的 CountByNoPrefix 适配成 numbergen 的 CountFunc。
func noCount(repo interface {
	CountByNoPrefix(ctx context.Context, prefix string) (int64, error)
}) func(ctx context.Context, prefix, datePart string) (int64, error) {
	return func(ctx context.Context, prefix, datePart string) (int64, error) {
		return repo.CountByNoPrefix(ctx, prefix+datePart)
	}
}

func init() {
	// 客户 KH
	numbergen.Register("customer", numbergen.Rule{
		Enabled: true, Prefix: "KH", DateFormat: "YYYYMMDD", SeqWidth: 3,
		CountFunc: noCount(crrepo.NewCustomerRepo()),
	})
	// 线索 X
	numbergen.Register("lead", numbergen.Rule{
		Enabled: true, Prefix: "X", DateFormat: "YYYYMMDD", SeqWidth: 3,
		CountFunc: noCount(crrepo.NewLeadRepo()),
	})
	// 合同 HT
	numbergen.Register("contract", numbergen.Rule{
		Enabled: true, Prefix: "HT", DateFormat: "YYYYMMDD", SeqWidth: 3,
		CountFunc: noCount(crrepo.NewContractRepo()),
	})
	// 商机 SJ
	numbergen.Register("opportunity", numbergen.Rule{
		Enabled: true, Prefix: "SJ", DateFormat: "YYYYMMDD", SeqWidth: 3,
		CountFunc: noCount(crrepo.NewOpportunityRepo()),
	})
	// 商品 CP
	numbergen.Register("product", numbergen.Rule{
		Enabled: true, Prefix: "CP", DateFormat: "YYYYMMDD", SeqWidth: 3,
		CountFunc: noCount(crrepo.NewProductRepo()),
	})
	// 联系人 LXR
	numbergen.Register("contact", numbergen.Rule{
		Enabled: true, Prefix: "LXR", DateFormat: "YYYYMMDD", SeqWidth: 3,
		CountFunc: noCount(crrepo.NewCustomerContactRepo()),
	})
	// 跟进记录 GJ
	numbergen.Register("follow", numbergen.Rule{
		Enabled: true, Prefix: "GJ", DateFormat: "YYYYMMDD", SeqWidth: 3,
		CountFunc: noCount(crrepo.NewFollowUpRecordRepo()),
	})
	// 售后工单 GD
	numbergen.Register("ticket", numbergen.Rule{
		Enabled: true, Prefix: "GD", DateFormat: "YYYYMMDD", SeqWidth: 3,
		CountFunc: noCount(crrepo.NewTicketRepo()),
	})
}
