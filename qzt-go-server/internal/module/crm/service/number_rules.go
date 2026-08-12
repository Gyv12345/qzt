package service

import (
	"context"
	"time"

	crmmodel "qzt-go-server/internal/model/crm"
	"qzt-go-server/internal/pkg/numbergen"
	"qzt-go-server/internal/repository"
)

// number_rules.go 注册 CRM 各业务的编号规则到公共 numbergen 包。
// init() 在包加载时自动执行,无需手动调用。

func init() {
	datePart := func() string { return time.Now().Format("20060102") }

	// 客户 KH
	numbergen.Register("customer", numbergen.Rule{
		Enabled: true, Prefix: "KH", DateFormat: "YYYYMMDD", SeqWidth: 3,
		CountFunc: countLike(&crmmodel.CrmCustomer{}, "customer_no"),
	})
	// 线索 X
	numbergen.Register("lead", numbergen.Rule{
		Enabled: true, Prefix: "X", DateFormat: "YYYYMMDD", SeqWidth: 3,
		CountFunc: countLike(&crmmodel.CrmLead{}, "lead_no"),
	})
	// 合同 HT
	numbergen.Register("contract", numbergen.Rule{
		Enabled: true, Prefix: "HT", DateFormat: "YYYYMMDD", SeqWidth: 3,
		CountFunc: countLike(&crmmodel.CrmContract{}, "contract_no"),
	})
	// 商机 SJ
	numbergen.Register("opportunity", numbergen.Rule{
		Enabled: true, Prefix: "SJ", DateFormat: "YYYYMMDD", SeqWidth: 3,
		CountFunc: countLike(&crmmodel.CrmOpportunity{}, "opportunity_no"),
	})
	// 商品 CP
	numbergen.Register("product", numbergen.Rule{
		Enabled: true, Prefix: "CP", DateFormat: "YYYYMMDD", SeqWidth: 3,
		CountFunc: countLike(&crmmodel.CrmProduct{}, "product_no"),
	})
	// 联系人 LXR
	numbergen.Register("contact", numbergen.Rule{
		Enabled: true, Prefix: "LXR", DateFormat: "YYYYMMDD", SeqWidth: 3,
		CountFunc: countLike(&crmmodel.CrmCustomerContact{}, "contact_no"),
	})
	// 跟进记录 GJ
	numbergen.Register("follow", numbergen.Rule{
		Enabled: true, Prefix: "GJ", DateFormat: "YYYYMMDD", SeqWidth: 3,
		CountFunc: countLike(&crmmodel.FollowUpRecord{}, "follow_no"),
	})
	// 售后工单 GD
	numbergen.Register("ticket", numbergen.Rule{
		Enabled: true, Prefix: "GD", DateFormat: "YYYYMMDD", SeqWidth: 3,
		CountFunc: countLike(&crmmodel.CrmTicket{}, "ticket_no"),
	})

	_ = datePart
}

// countLike 返回一个 CountFunc:统计指定 model 表中 column 列 LIKE "前缀+日期%" 且非空的记录数。
func countLike(model any, column string) func(ctx context.Context, prefix, datePart string) (int64, error) {
	return func(ctx context.Context, prefix, datePart string) (int64, error) {
		var n int64
		err := repository.DBFrom(ctx).Model(model).
			Where(column+" LIKE ?", prefix+datePart+"%").
			Where(column + " != ''").
			Count(&n).Error
		return n, err
	}
}
