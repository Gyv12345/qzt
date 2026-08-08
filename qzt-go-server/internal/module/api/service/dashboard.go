package service

import (
	"context"
	"fmt"
	"time"

	"github.com/shopspring/decimal"
	"gorm.io/gorm"

	apprmodel "qzt-go-server/internal/model/approval"
	crmmodel "qzt-go-server/internal/model/crm"
	hrmmodel "qzt-go-server/internal/model/hrm"
	psimodel "qzt-go-server/internal/model/psi"
	"qzt-go-server/internal/pkg/datascope"
	"qzt-go-server/internal/repository"
)

// dashboard.go 仪表盘报表服务。
// 聚合 CRM/PSI/审批/通知 的统计数据,供首页工作台展示。
// 计数用 BaseRepo.Count,聚合用 repository.DBFrom().Table().Group().Scan()。

// DashboardService 仪表盘服务。
type DashboardService struct{}

func NewDashboardService() *DashboardService { return &DashboardService{} }

// ── 1. Overview 核心指标卡片 ──

// OverviewData 首页核心指标。
type OverviewData struct {
	CustomerTotal    int64           `json:"customer_total"`     // 客户总数
	CustomerPublic   int64           `json:"customer_public"`    // 公海客户数
	OpportunityTotal int64           `json:"opportunity_total"`  // 商机总数
	OpportunityWon   int64           `json:"opportunity_won"`    // 已成交商机
	ContractTotal    int64           `json:"contract_total"`     // 合同总数
	ContractAmount   decimal.Decimal `json:"contract_amount"`    // 合同总金额
	ReceivedAmount   decimal.Decimal `json:"received_amount"`    // 累计回款金额
	ApprovalPending  int64           `json:"approval_pending"`   // 待审批数
	StockWarning     int64           `json:"stock_warning"`      // 库存预警数
	UnreadMessage    int64           `json:"unread_message"`     // 未读消息数
}

// Overview 返回首页核心指标。
func (s *DashboardService) Overview(ctx context.Context, userID uint) (*OverviewData, error) {
	data := &OverviewData{}
	db := repository.DBFrom(ctx)

	// data_scope 行级过滤(超管/ALL 返回 nil 表示不过滤)
	// crmScopeScopes 对客户/商机/合同生效,均为 owner_id 列
	dsCond := datascope.BuildCond(ctx, "owner_id")

	// 客户统计
	custQ := db.Table("crm_customer").Where("in_pool = ?", crmmodel.InPoolPrivate)
	if dsCond != nil {
		custQ = custQ.Where(dsCond.Query, dsCond.Args...)
	}
	custQ.Count(&data.CustomerTotal)

	custPQ := db.Table("crm_customer").Where("in_pool = ?", crmmodel.InPoolPublic)
	if dsCond != nil {
		custPQ = custPQ.Where(dsCond.Query, dsCond.Args...)
	}
	custPQ.Count(&data.CustomerPublic)

	// 商机统计
	oppQ := db.Table("crm_opportunity")
	if dsCond != nil {
		oppQ = oppQ.Where(dsCond.Query, dsCond.Args...)
	}
	oppQ.Count(&data.OpportunityTotal)

	oppWonQ := db.Table("crm_opportunity").Where("stage = ?", crmmodel.OppStageWon)
	if dsCond != nil {
		oppWonQ = oppWonQ.Where(dsCond.Query, dsCond.Args...)
	}
	oppWonQ.Count(&data.OpportunityWon)

	// 合同统计
	contractQ := db.Table("crm_contract")
	if dsCond != nil {
		contractQ = contractQ.Where(dsCond.Query, dsCond.Args...)
	}
	contractQ.Count(&data.ContractTotal)

	contractAmtQ := db.Table("crm_contract")
	if dsCond != nil {
		contractAmtQ = contractAmtQ.Where(dsCond.Query, dsCond.Args...)
	}
	contractAmtQ.Select("COALESCE(SUM(total_amount),0)").Scan(&data.ContractAmount)

	contractRecvQ := db.Table("crm_contract")
	if dsCond != nil {
		contractRecvQ = contractRecvQ.Where(dsCond.Query, dsCond.Args...)
	}
	contractRecvQ.Select("COALESCE(SUM(received_amount),0)").Scan(&data.ReceivedAmount)

	// 审批待办(当前用户)
	db.Table("approval_task").
		Where("approver_id = ? AND status = ? AND node_round >= 0", userID, apprmodel.TaskStatusApproving).
		Count(&data.ApprovalPending)

	// 库存预警(数量 <= 安全库存)
	db.Table("psi_stock").Where("quantity <= safety_stock").Count(&data.StockWarning)

	// 未读消息(当前用户)
	db.Table("sys_message").Where("receiver_id = ? AND is_read = 0", userID).Count(&data.UnreadMessage)

	return data, nil
}

// ── 2. SalesTrend 销售趋势 ──

// TrendPoint 趋势数据点。
type TrendPoint struct {
	Date   string          `json:"date"`
	Count  int64           `json:"count"`
	Amount decimal.Decimal `json:"amount"`
}

// SalesTrend 近N天的回款趋势。
func (s *DashboardService) SalesTrend(ctx context.Context, days int) ([]TrendPoint, error) {
	if days <= 0 {
		days = 30
	}
	start := time.Now().AddDate(0, 0, -days).Format("2006-01-02")
	var rows []TrendPoint
	err := repository.DBFrom(ctx).Table("crm_contract_payment_record").
		Select("DATE(received_date) AS date, COUNT(*) AS count, COALESCE(SUM(amount),0) AS amount").
		Where("received_date >= ?", start).
		Group("DATE(received_date)").
		Order("date ASC").
		Scan(&rows).Error
	return rows, err
}

// ── 3. CustomerDistribution 客户分布 ──

// DistItem 分布项。
type DistItem struct {
	Label string `json:"label"`
	Count int64  `json:"count"`
}

// CustomerDistribution 按维度(level/source/industry)分组统计客户。
func (s *DashboardService) CustomerDistribution(ctx context.Context, dimension string) ([]DistItem, error) {
	// 白名单维度(防注入)
	allowed := map[string]bool{"level": true, "source": true, "industry": true, "status": true}
	if !allowed[dimension] {
		dimension = "level"
	}
	q := repository.DBFrom(ctx).Table("crm_customer").
		Where(dimension + " != ''")
	if cond := datascope.BuildCond(ctx, "owner_id"); cond != nil {
		q = q.Where(cond.Query, cond.Args...)
	}
	var rows []DistItem
	err := q.Select(dimension+" AS label, COUNT(*) AS count").
		Group(dimension).
		Order("count DESC").
		Scan(&rows).Error
	return rows, err
}

// ── 4. OpportunityFunnel 商机漏斗 ──

// FunnelStage 漏斗阶段。
type FunnelStage struct {
	Stage  string          `json:"stage"`
	Count  int64           `json:"count"`
	Amount decimal.Decimal `json:"amount"`
}

// OpportunityFunnel 按阶段分组统计商机数量与金额。
func (s *DashboardService) OpportunityFunnel(ctx context.Context) ([]FunnelStage, error) {
	q := repository.DBFrom(ctx).Table("crm_opportunity")
	if cond := datascope.BuildCond(ctx, "owner_id"); cond != nil {
		q = q.Where(cond.Query, cond.Args...)
	}
	var rows []FunnelStage
	err := q.Select("stage, COUNT(*) AS count, COALESCE(SUM(expected_amount),0) AS amount").
		Group("stage").
		Order("count DESC").
		Scan(&rows).Error
	return rows, err
}

// ── 5. FinanceSummary 财务概览 ──

// FinanceData 财务概览。
type FinanceData struct {
	PurchaseAmount decimal.Decimal `json:"purchase_amount"` // 采购总额(已入库)
	SalesAmount    decimal.Decimal `json:"sales_amount"`    // 销售总额(已出库)
	ReceivedAmount decimal.Decimal `json:"received_amount"` // 回款总额
	StockValue     decimal.Decimal `json:"stock_value"`     // 库存总值(数量*成本)
}

// FinanceSummary 按日期范围统计财务概览。
func (s *DashboardService) FinanceSummary(ctx context.Context, startDate, endDate string) (*FinanceData, error) {
	data := &FinanceData{}
	db := repository.DBFrom(ctx)

	// 采购总额(已入库)
	pq := db.Table("psi_purchase_order").Where("status = ?", psimodel.PurchaseStatusReceipt)
	pq = applyDateRange(pq, "order_date", startDate, endDate)
	pq.Select("COALESCE(SUM(total_amount),0)").Scan(&data.PurchaseAmount)

	// 销售总额(已出库)
	sq := db.Table("psi_sales_order").Where("status = ?", psimodel.SalesStatusShipped)
	sq = applyDateRange(sq, "order_date", startDate, endDate)
	sq.Select("COALESCE(SUM(total_amount),0)").Scan(&data.SalesAmount)

	// 回款总额
	rq := db.Table("crm_contract_payment_record")
	rq = applyDateRange(rq, "received_date", startDate, endDate)
	rq.Select("COALESCE(SUM(amount),0)").Scan(&data.ReceivedAmount)

	// 库存总值(在手数量 × 商品成本价,关联 crm_product.cost_price)
	db.Table("psi_stock AS s").
		Joins("LEFT JOIN crm_product AS p ON p.id = s.product_id").
		Where("s.deleted_at IS NULL").
		Select("COALESCE(SUM(s.quantity * p.cost_price),0)").Scan(&data.StockValue)

	return data, nil
}

// applyDateRange 给 *gorm.DB 加日期范围过滤(startDate/endDate 为 yyyy-MM-dd,可空)。
func applyDateRange(db *gorm.DB, col, start, end string) *gorm.DB {
	if start != "" {
		db = db.Where("DATE("+col+") >= ?", start)
	}
	if end != "" {
		db = db.Where("DATE("+col+") <= ?", end)
	}
	return db
}

// ── BI 扩展:CRM / HRM / 财务 / 进销存 聚合分析 ──

// LabelValue 通用标签-值对(饼图/柱状图)。
type LabelValue struct {
	Label string          `json:"label"`
	Value decimal.Decimal `json:"value"`
}

// MonthValue 月份-金额(趋势折线)。
type MonthValue struct {
	Month  string          `json:"month"`
	Amount decimal.Decimal `json:"amount"`
	Count  int64           `json:"count"`
}

// ── CRM ──

// ContractTrend 近 N 月合同签约金额趋势。
func (s *DashboardService) ContractTrend(ctx context.Context, months int) ([]MonthValue, error) {
	if months <= 0 {
		months = 6
	}
	start := time.Now().AddDate(0, -months+1, 0).Format("2006-01")
	var rows []MonthValue
	err := repository.DBFrom(ctx).Table("crm_contract").
		Select("DATE_FORMAT(signed_date, '%Y-%m') AS month, COALESCE(SUM(total_amount),0) AS amount, COUNT(*) AS count").
		Where("signed_date >= ?", start+"-01").Where("deleted_at IS NULL").
		Group("month").Order("month ASC").Scan(&rows).Error
	return rows, err
}

// SalesRanking 销售业绩排行(按合同负责人汇总 total_amount)。
func (s *DashboardService) SalesRanking(ctx context.Context, limit int) ([]struct {
	OwnerID   uint            `json:"owner_id"`
	OwnerName string          `json:"owner_name"`
	Amount    decimal.Decimal `json:"amount"`
	Count     int64           `json:"count"`
}, error) {
	if limit <= 0 || limit > 50 {
		limit = 10
	}
	var rows []struct {
		OwnerID   uint            `json:"owner_id"`
		OwnerName string          `json:"owner_name"`
		Amount    decimal.Decimal `json:"amount"`
		Count     int64           `json:"count"`
	}
	// 先按 owner_id 聚合
	type agg struct {
		OwnerID uint            `json:"owner_id"`
		Amount  decimal.Decimal `json:"amount"`
		Count   int64           `json:"count"`
	}
	var aggs []agg
	err := repository.DBFrom(ctx).Table("crm_contract").
		Select("owner_id, COALESCE(SUM(total_amount),0) AS amount, COUNT(*) AS count").
		Where("owner_id IS NOT NULL AND deleted_at IS NULL").
		Group("owner_id").Order("amount DESC").Limit(limit).Scan(&aggs).Error
	if err != nil {
		return rows, err
	}
	// 批量查用户名
	userNames := make(map[uint]string)
	for _, a := range aggs {
		var name string
		repository.DBFrom(ctx).Table("sys_user").
			Select("COALESCE(NULLIF(nickname,''), username)").Where("id = ?", a.OwnerID).Scan(&name)
		userNames[a.OwnerID] = name
	}
	for _, a := range aggs {
		rows = append(rows, struct {
			OwnerID   uint            `json:"owner_id"`
			OwnerName string          `json:"owner_name"`
			Amount    decimal.Decimal `json:"amount"`
			Count     int64           `json:"count"`
		}{a.OwnerID, userNames[a.OwnerID], a.Amount, a.Count})
	}
	return rows, nil
}

// LeadSourceDistribution 线索来源分布。
func (s *DashboardService) LeadSourceDistribution(ctx context.Context) ([]LabelValue, error) {
	var rows []LabelValue
	err := repository.DBFrom(ctx).Table("crm_lead").
		Select("source AS label, COUNT(*) AS value").
		Where("source != '' AND deleted_at IS NULL").
		Group("source").Order("value DESC").Scan(&rows).Error
	return rows, err
}

// ── HRM ──

// EmployeeDistribution 员工分布(department/gender/status)。
func (s *DashboardService) EmployeeDistribution(ctx context.Context, dimension string) ([]LabelValue, error) {
	var rows []LabelValue
	switch dimension {
	case "gender":
		err := repository.DBFrom(ctx).Table("hrm_employee").
			Select(fmt.Sprintf("CASE gender WHEN 1 THEN '男' WHEN 2 THEN '女' ELSE '未知' END AS label, COUNT(*) AS value")).
			Where("deleted_at IS NULL").Group("gender").Order("value DESC").Scan(&rows).Error
		return rows, err
	case "status":
		err := repository.DBFrom(ctx).Table("hrm_employee").
			Select(fmt.Sprintf("CASE status WHEN 1 THEN '在职' WHEN 2 THEN '试用' WHEN 3 THEN '离职' ELSE '未知' END AS label, COUNT(*) AS value")).
			Where("deleted_at IS NULL").Group("status").Order("value DESC").Scan(&rows).Error
		return rows, err
	default: // department
		err := repository.DBFrom(ctx).Table("hrm_employee AS e").
			Select("COALESCE(d.name,'未分配') AS label, COUNT(*) AS value").
			Joins("LEFT JOIN hrm_department AS d ON d.id = e.department_id").
			Where("e.deleted_at IS NULL").
			Group("d.id").Order("value DESC").Scan(&rows).Error
		return rows, err
	}
}

// HeadcountTrend 近 N 月入职人数趋势。
func (s *DashboardService) HeadcountTrend(ctx context.Context, months int) ([]MonthValue, error) {
	if months <= 0 {
		months = 6
	}
	start := time.Now().AddDate(0, -months+1, 0).Format("2006-01")
	var rows []MonthValue
	err := repository.DBFrom(ctx).Table("hrm_employee").
		Select("DATE_FORMAT(entry_date, '%Y-%m') AS month, 0 AS amount, COUNT(*) AS count").
		Where("entry_date >= ?", start+"-01").Where("deleted_at IS NULL").
		Group("month").Order("month ASC").Scan(&rows).Error
	return rows, err
}

// AttendanceSummary 月度考勤汇总(按部门: 请假天数 + 加班小时)。
func (s *DashboardService) AttendanceSummary(ctx context.Context, month string) ([]struct {
	Department string          `json:"department"`
	LeaveDays  decimal.Decimal `json:"leave_days"`
	OTHours    decimal.Decimal `json:"ot_hours"`
}, error) {
	if month == "" {
		month = time.Now().Format("2006-01")
	}
	var rows []struct {
		Department string          `json:"department"`
		LeaveDays  decimal.Decimal `json:"leave_days"`
		OTHours    decimal.Decimal `json:"ot_hours"`
	}
	// 请假 by dept
	type leaveAgg struct {
		Dept string
		Days decimal.Decimal
	}
	var leaves []leaveAgg
	repository.DBFrom(ctx).Table("hrm_leave AS l").
		Select("COALESCE(d.name,'未分配') AS dept, COALESCE(SUM(l.duration_days),0) AS days").
		Joins("LEFT JOIN hrm_employee AS e ON e.id = l.employee_id").
		Joins("LEFT JOIN hrm_department AS d ON d.id = e.department_id").
		Where("DATE_FORMAT(l.start_date, '%Y-%m') = ?", month).Where("l.deleted_at IS NULL").
		Group("d.id").Scan(&leaves)

	// 加班 by dept
	type otAgg struct {
		Dept  string
		Hours decimal.Decimal
	}
	var ots []otAgg
	repository.DBFrom(ctx).Table("hrm_overtime AS o").
		Select("COALESCE(d.name,'未分配') AS dept, COALESCE(SUM(o.duration_hours),0) AS hours").
		Joins("LEFT JOIN hrm_employee AS e ON e.id = o.employee_id").
		Joins("LEFT JOIN hrm_department AS d ON d.id = e.department_id").
		Where("DATE_FORMAT(o.start_date, '%Y-%m') = ?", month).Where("o.deleted_at IS NULL").
		Group("d.id").Scan(&ots)

	// merge
	deptMap := make(map[string]*struct {
		Department string          `json:"department"`
		LeaveDays  decimal.Decimal `json:"leave_days"`
		OTHours    decimal.Decimal `json:"ot_hours"`
	})
	for _, l := range leaves {
		if _, ok := deptMap[l.Dept]; !ok {
			deptMap[l.Dept] = &struct {
				Department string          `json:"department"`
				LeaveDays  decimal.Decimal `json:"leave_days"`
				OTHours    decimal.Decimal `json:"ot_hours"`
			}{Department: l.Dept}
		}
		deptMap[l.Dept].LeaveDays = l.Days
	}
	for _, o := range ots {
		if _, ok := deptMap[o.Dept]; !ok {
			deptMap[o.Dept] = &struct {
				Department string          `json:"department"`
				LeaveDays  decimal.Decimal `json:"leave_days"`
				OTHours    decimal.Decimal `json:"ot_hours"`
			}{Department: o.Dept}
		}
		deptMap[o.Dept].OTHours = o.Hours
	}
	for _, v := range deptMap {
		rows = append(rows, *v)
	}
	return rows, nil
}

// ── 财务 ──

// FinanceTrend 近 N 月收入/支出趋势(voucher by month + direction)。
func (s *DashboardService) FinanceTrend(ctx context.Context, months int) ([]struct {
	Month   string          `json:"month"`
	Income  decimal.Decimal `json:"income"`
	Expense decimal.Decimal `json:"expense"`
}, error) {
	if months <= 0 {
		months = 6
	}
	start := time.Now().AddDate(0, -months+1, 0).Format("2006-01")
	var rows []struct {
		Month   string          `json:"month"`
		Income  decimal.Decimal `json:"income"`
		Expense decimal.Decimal `json:"expense"`
	}
	// 按月聚合 voucher:DEBIT=支出, CREDIT=收入
	err := repository.DBFrom(ctx).Table("fin_voucher").
		Select("DATE_FORMAT(voucher_date, '%Y-%m') AS month, "+
			"COALESCE(SUM(CASE WHEN direction='CREDIT' THEN amount ELSE 0 END),0) AS income, "+
			"COALESCE(SUM(CASE WHEN direction='DEBIT' THEN amount ELSE 0 END),0) AS expense").
		Where("voucher_date >= ?", start+"-01").Where("deleted_at IS NULL").
		Group("month").Order("month ASC").Scan(&rows).Error
	return rows, err
}

// ── 进销存 ──

// StockValueByWarehouse 各仓库库存总值(quantity * unit_cost)。
func (s *DashboardService) StockValueByWarehouse(ctx context.Context) ([]struct {
	Warehouse  string          `json:"warehouse"`
	StockValue decimal.Decimal `json:"stock_value"`
	Quantity   decimal.Decimal `json:"quantity"`
}, error) {
	var rows []struct {
		Warehouse  string          `json:"warehouse"`
		StockValue decimal.Decimal `json:"stock_value"`
		Quantity   decimal.Decimal `json:"quantity"`
	}
	err := repository.DBFrom(ctx).Table("psi_stock AS s").
		Select("COALESCE(w.name,'未知') AS warehouse, COALESCE(SUM(s.quantity * p.cost_price),0) AS stock_value, COALESCE(SUM(s.quantity),0) AS quantity").
		Joins("LEFT JOIN psi_warehouse AS w ON w.id = s.warehouse_id").
		Joins("LEFT JOIN crm_product AS p ON p.id = s.product_id").
		Where("s.deleted_at IS NULL").
		Group("w.id").Order("stock_value DESC").Scan(&rows).Error
	return rows, err
}

// SalesVsPurchase 近 N 月采购额 vs 销售额对比。
func (s *DashboardService) SalesVsPurchase(ctx context.Context, months int) ([]struct {
	Month         string          `json:"month"`
	PurchaseAmount decimal.Decimal `json:"purchase_amount"`
	SalesAmount    decimal.Decimal `json:"sales_amount"`
}, error) {
	if months <= 0 {
		months = 6
	}
	start := time.Now().AddDate(0, -months+1, 0).Format("2006-01")
	var rows []struct {
		Month         string          `json:"month"`
		PurchaseAmount decimal.Decimal `json:"purchase_amount"`
		SalesAmount    decimal.Decimal `json:"sales_amount"`
	}
	err := repository.DBFrom(ctx).Table("psi_purchase_order AS po").
		Select("DATE_FORMAT(po.order_date, '%Y-%m') AS month, "+
			"COALESCE(SUM(po.total_amount),0) AS purchase_amount, 0 AS sales_amount").
		Where("po.order_date >= ?", start+"-01").Where("po.deleted_at IS NULL").
		Group("month").Scan(&rows).Error

	// 销售额
	type salesAgg struct {
		Month  string
		Amount decimal.Decimal
	}
	var sales []salesAgg
	repository.DBFrom(ctx).Table("psi_sales_order AS so").
		Select("DATE_FORMAT(so.order_date, '%Y-%m') AS month, COALESCE(SUM(so.total_amount),0) AS amount").
		Where("so.order_date >= ?", start+"-01").Where("so.deleted_at IS NULL").
		Group("month").Scan(&sales)

	salesMap := make(map[string]decimal.Decimal)
	for _, s := range sales {
		salesMap[s.Month] = s.Amount
	}
	for i := range rows {
		if v, ok := salesMap[rows[i].Month]; ok {
			rows[i].SalesAmount = v
		}
	}
	return rows, err
}

// ── 引用避免 unused ──
var _ = crmmodel.CrmCustomer{}
var _ = psimodel.PsiStock{}
var _ = hrmmodel.HrmEmployee{}
var _ = apprmodel.ApprovalTask{}
