package repository

import (
	"context"

	"github.com/shopspring/decimal"
	"gorm.io/gorm"

	apprmodel "qzt-go-server/internal/model/approval"
	crmmodel "qzt-go-server/internal/model/crm"
	psimodel "qzt-go-server/internal/model/psi"
)

// dashboard.go 仪表盘报表聚合 repository。
//
// 仪表盘查询横跨 crm/psi/oa/hrm/finance 多个模块的表,属跨模块报表聚合层,
// 因此放在全局 repository 包(而非任何单模块子包),由 DashboardRepo 统一收口
// 所有 .Table(...) 原生聚合查询,service 只调本 repo 的方法。
//
// 数据权限(datascope)约定:internal/pkg/datascope 自身 import 了本包(用于
// 构造 *Cond),本包不能反向 import datascope(会循环引用);因此行级过滤条件
// 由 service 层调 datascope.BuildCond(ctx, "owner_id") 生成后以 ds 参数传入,
// repo 只负责机械拼接,ds == nil 表示不过滤(超管/ALL)。
//
// 错误处理约定:为保持与下沉前 service 实现完全一致的行为,Overview/
// FinanceSummary/月度考勤等"多指标尽力填充"类查询沿袭忽略单条查询错误的语义,
// 其余单结果查询正常返回 error。

// DashboardRepo 仪表盘聚合查询(只读,无 BaseRepo 主表)。
type DashboardRepo struct{}

func NewDashboardRepo() *DashboardRepo { return &DashboardRepo{} }

// ── 结果行结构(api/service 以类型别名引用,字段与 JSON 输出保持不变) ──

// DashboardOverview 首页核心指标。
type DashboardOverview struct {
	CustomerTotal    int64           `json:"customer_total"`    // 客户总数
	CustomerPublic   int64           `json:"customer_public"`   // 公海客户数
	OpportunityTotal int64           `json:"opportunity_total"` // 商机总数
	OpportunityWon   int64           `json:"opportunity_won"`   // 已成交商机
	ContractTotal    int64           `json:"contract_total"`    // 合同总数
	ContractAmount   decimal.Decimal `json:"contract_amount"`   // 合同总金额
	ReceivedAmount   decimal.Decimal `json:"received_amount"`   // 累计回款金额
	ApprovalPending  int64           `json:"approval_pending"`  // 待审批数
	StockWarning     int64           `json:"stock_warning"`     // 库存预警数
	UnreadMessage    int64           `json:"unread_message"`    // 未读消息数
}

// TrendPoint 趋势数据点。
type TrendPoint struct {
	Date   string          `json:"date"`
	Count  int64           `json:"count"`
	Amount decimal.Decimal `json:"amount"`
}

// DistItem 分布项。
type DistItem struct {
	Label string `json:"label"`
	Count int64  `json:"count"`
}

// FunnelStage 漏斗阶段。
type FunnelStage struct {
	Stage  string          `json:"stage"`
	Count  int64           `json:"count"`
	Amount decimal.Decimal `json:"amount"`
}

// DashboardFinanceData 财务概览。
type DashboardFinanceData struct {
	PurchaseAmount decimal.Decimal `json:"purchase_amount"` // 采购总额(已入库)
	SalesAmount    decimal.Decimal `json:"sales_amount"`    // 销售总额(已出库)
	ReceivedAmount decimal.Decimal `json:"received_amount"` // 回款总额
	StockValue     decimal.Decimal `json:"stock_value"`     // 库存总值(数量*成本)
}

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

// OwnerContractAgg 合同按负责人聚合的中间结果。
type OwnerContractAgg struct {
	OwnerID uint            `json:"owner_id"`
	Amount  decimal.Decimal `json:"amount"`
	Count   int64           `json:"count"`
}

// SalesRankRow 销售业绩排行行。
type SalesRankRow struct {
	OwnerID   uint            `json:"owner_id"`
	OwnerName string          `json:"owner_name"`
	Amount    decimal.Decimal `json:"amount"`
	Count     int64           `json:"count"`
}

// DeptLeaveAgg 请假按部门聚合的中间结果。
type DeptLeaveAgg struct {
	Dept string          `json:"dept"`
	Days decimal.Decimal `json:"days"`
}

// DeptOTAgg 加班按部门聚合的中间结果。
type DeptOTAgg struct {
	Dept  string          `json:"dept"`
	Hours decimal.Decimal `json:"hours"`
}

// FinanceTrendRow 月度收支趋势行。
type FinanceTrendRow struct {
	Month   string          `json:"month"`
	Income  decimal.Decimal `json:"income"`
	Expense decimal.Decimal `json:"expense"`
}

// WarehouseStockValueRow 仓库库存总值行。
type WarehouseStockValueRow struct {
	Warehouse  string          `json:"warehouse"`
	StockValue decimal.Decimal `json:"stock_value"`
	Quantity   decimal.Decimal `json:"quantity"`
}

// MonthAmountAgg 月度金额聚合的中间结果。
type MonthAmountAgg struct {
	Month  string          `json:"month"`
	Amount decimal.Decimal `json:"amount"`
}

// PurchaseVsSalesRow 采购 vs 销售对比行。
type PurchaseVsSalesRow struct {
	Month          string          `json:"month"`
	PurchaseAmount decimal.Decimal `json:"purchase_amount"`
	SalesAmount    decimal.Decimal `json:"sales_amount"`
}

// ── 1. Overview 核心指标卡片 ──

// Overview 汇总首页核心指标。ds 为数据权限条件(nil 表示不过滤)。
// 与原实现一致:单条统计出错不中断,尽力填充。
func (r *DashboardRepo) Overview(ctx context.Context, userID uint, ds *Cond) *DashboardOverview {
	data := &DashboardOverview{}
	db := dbFrom(ctx)

	// 客户统计(私海/公海均需排除软删;Table 原生查询不自动过滤 deleted_at)
	custQ := db.Table("crm_customer").Where("deleted_at IS NULL").Where("in_pool = ?", crmmodel.InPoolPrivate)
	if ds != nil {
		custQ = custQ.Where(ds.Query, ds.Args...)
	}
	custQ.Count(&data.CustomerTotal)

	custPQ := db.Table("crm_customer").Where("deleted_at IS NULL").Where("in_pool = ?", crmmodel.InPoolPublic)
	if ds != nil {
		custPQ = custPQ.Where(ds.Query, ds.Args...)
	}
	custPQ.Count(&data.CustomerPublic)

	// 商机统计
	oppQ := db.Table("crm_opportunity").Where("deleted_at IS NULL")
	if ds != nil {
		oppQ = oppQ.Where(ds.Query, ds.Args...)
	}
	oppQ.Count(&data.OpportunityTotal)

	oppWonQ := db.Table("crm_opportunity").Where("deleted_at IS NULL").Where("stage = ?", crmmodel.OppStageWon)
	if ds != nil {
		oppWonQ = oppWonQ.Where(ds.Query, ds.Args...)
	}
	oppWonQ.Count(&data.OpportunityWon)

	// 合同统计
	contractQ := db.Table("crm_contract").Where("deleted_at IS NULL")
	if ds != nil {
		contractQ = contractQ.Where(ds.Query, ds.Args...)
	}
	contractQ.Count(&data.ContractTotal)

	contractAmtQ := db.Table("crm_contract").Where("deleted_at IS NULL")
	if ds != nil {
		contractAmtQ = contractAmtQ.Where(ds.Query, ds.Args...)
	}
	contractAmtQ.Select("COALESCE(SUM(total_amount),0)").Scan(&data.ContractAmount)

	contractRecvQ := db.Table("crm_contract").Where("deleted_at IS NULL")
	if ds != nil {
		contractRecvQ = contractRecvQ.Where(ds.Query, ds.Args...)
	}
	contractRecvQ.Select("COALESCE(SUM(received_amount),0)").Scan(&data.ReceivedAmount)

	// 审批待办(当前用户)
	db.Table("approval_task").Where("deleted_at IS NULL").
		Where("approver_id = ? AND status = ? AND node_round >= 0", userID, apprmodel.TaskStatusApproving).
		Count(&data.ApprovalPending)

	// 库存预警(数量 <= 安全库存)
	db.Table("psi_stock").Where("deleted_at IS NULL").Where("quantity <= safety_stock").Count(&data.StockWarning)

	// 未读消息(当前用户)
	db.Table("oa_message").Where("deleted_at IS NULL").Where("receiver_id = ? AND is_read = 0", userID).Count(&data.UnreadMessage)

	return data
}

// ── 2. SalesTrend 销售趋势 ──

// SalesTrend 回款趋势(start 为 yyyy-MM-dd 起始日)。
func (r *DashboardRepo) SalesTrend(ctx context.Context, start string) ([]TrendPoint, error) {
	var rows []TrendPoint
	err := dbFrom(ctx).Table("crm_contract_payment_record").
		Select("DATE(received_date) AS date, COUNT(*) AS count, COALESCE(SUM(amount),0) AS amount").
		Where("received_date >= ?", start).
		Group("DATE(received_date)").
		Order("date ASC").
		Scan(&rows).Error
	return rows, err
}

// ── 3. CustomerDistribution 客户分布 ──

// CustomerDistribution 按维度分组统计客户。dimension 必须是 service 层白名单
// 校验后的列名(level/source/industry/status,防注入)。
func (r *DashboardRepo) CustomerDistribution(ctx context.Context, dimension string, ds *Cond) ([]DistItem, error) {
	q := dbFrom(ctx).Table("crm_customer").
		Where(dimension + " != ''")
	if ds != nil {
		q = q.Where(ds.Query, ds.Args...)
	}
	var rows []DistItem
	err := q.Select(dimension + " AS label, COUNT(*) AS count").
		Group(dimension).
		Order("count DESC").
		Scan(&rows).Error
	return rows, err
}

// ── 4. OpportunityFunnel 商机漏斗 ──

// OpportunityFunnel 按阶段分组统计商机数量与金额。
func (r *DashboardRepo) OpportunityFunnel(ctx context.Context, ds *Cond) ([]FunnelStage, error) {
	q := dbFrom(ctx).Table("crm_opportunity")
	if ds != nil {
		q = q.Where(ds.Query, ds.Args...)
	}
	var rows []FunnelStage
	err := q.Select("stage, COUNT(*) AS count, COALESCE(SUM(expected_amount),0) AS amount").
		Group("stage").
		Order("count DESC").
		Scan(&rows).Error
	return rows, err
}

// ── 5. FinanceSummary 财务概览 ──

// FinanceSummary 按日期范围统计财务概览。与原实现一致:单条查询出错不中断。
func (r *DashboardRepo) FinanceSummary(ctx context.Context, startDate, endDate string) *DashboardFinanceData {
	data := &DashboardFinanceData{}
	db := dbFrom(ctx)

	// 采购总额(已入库)
	pq := db.Table("psi_purchase_order").Where("status = ?", psimodel.PurchaseStatusReceipt)
	pq = applyDashboardDateRange(pq, "order_date", startDate, endDate)
	pq.Select("COALESCE(SUM(total_amount),0)").Scan(&data.PurchaseAmount)

	// 销售总额(已出库)
	sq := db.Table("psi_sales_order").Where("status = ?", psimodel.SalesStatusShipped)
	sq = applyDashboardDateRange(sq, "order_date", startDate, endDate)
	sq.Select("COALESCE(SUM(total_amount),0)").Scan(&data.SalesAmount)

	// 回款总额
	rq := db.Table("crm_contract_payment_record")
	rq = applyDashboardDateRange(rq, "received_date", startDate, endDate)
	rq.Select("COALESCE(SUM(amount),0)").Scan(&data.ReceivedAmount)

	// 库存总值(在手数量 × 商品成本价,关联 crm_product.cost_price)
	db.Table("psi_stock AS s").
		Joins("LEFT JOIN crm_product AS p ON p.id = s.product_id").
		Where("s.deleted_at IS NULL").
		Select("COALESCE(SUM(s.quantity * p.cost_price),0)").Scan(&data.StockValue)

	return data
}

// applyDashboardDateRange 给 *gorm.DB 加日期范围过滤(startDate/endDate 为 yyyy-MM-dd,可空)。
func applyDashboardDateRange(db *gorm.DB, col, start, end string) *gorm.DB {
	if start != "" {
		db = db.Where("DATE("+col+") >= ?", start)
	}
	if end != "" {
		db = db.Where("DATE("+col+") <= ?", end)
	}
	return db
}

// ── BI 扩展:CRM / HRM / 财务 / 进销存 聚合分析 ──

// ContractTrend 合同签约金额趋势(start 为 yyyy-MM 起始月)。
func (r *DashboardRepo) ContractTrend(ctx context.Context, start string) ([]MonthValue, error) {
	var rows []MonthValue
	err := dbFrom(ctx).Table("crm_contract").
		Select("DATE_FORMAT(signed_date, '%Y-%m') AS month, COALESCE(SUM(total_amount),0) AS amount, COUNT(*) AS count").
		Where("signed_date >= ?", start+"-01").Where("deleted_at IS NULL").
		Group("month").Order("month ASC").Scan(&rows).Error
	return rows, err
}

// ContractAmountByOwner 按合同负责人聚合签约金额(limit 控制前 N)。
func (r *DashboardRepo) ContractAmountByOwner(ctx context.Context, limit int) ([]OwnerContractAgg, error) {
	var aggs []OwnerContractAgg
	err := dbFrom(ctx).Table("crm_contract").
		Select("owner_id, COALESCE(SUM(total_amount),0) AS amount, COUNT(*) AS count").
		Where("owner_id IS NOT NULL AND deleted_at IS NULL").
		Group("owner_id").Order("amount DESC").Limit(limit).Scan(&aggs).Error
	return aggs, err
}

// UserNameByID 查用户显示名(nickname 为空回落 username)。与原实现一致:出错返回空串。
func (r *DashboardRepo) UserNameByID(ctx context.Context, userID uint) string {
	var name string
	dbFrom(ctx).Table("sys_user").
		Select("COALESCE(NULLIF(nickname,''), username)").Where("id = ?", userID).Scan(&name)
	return name
}

// LeadSourceDistribution 线索来源分布。
func (r *DashboardRepo) LeadSourceDistribution(ctx context.Context) ([]LabelValue, error) {
	var rows []LabelValue
	err := dbFrom(ctx).Table("crm_lead").
		Select("source AS label, COUNT(*) AS value").
		Where("source != '' AND deleted_at IS NULL").
		Group("source").Order("value DESC").Scan(&rows).Error
	return rows, err
}

// ── HRM ──

// EmployeeDistribution 员工分布(dimension: department/gender/status)。
func (r *DashboardRepo) EmployeeDistribution(ctx context.Context, dimension string) ([]LabelValue, error) {
	var rows []LabelValue
	switch dimension {
	case "gender":
		err := dbFrom(ctx).Table("hrm_employee").
			Select("CASE gender WHEN 1 THEN '男' WHEN 2 THEN '女' ELSE '未知' END AS label, COUNT(*) AS value").
			Where("deleted_at IS NULL").Group("gender").Order("value DESC").Scan(&rows).Error
		return rows, err
	case "status":
		err := dbFrom(ctx).Table("hrm_employee").
			Select("CASE status WHEN 1 THEN '在职' WHEN 2 THEN '试用' WHEN 3 THEN '离职' ELSE '未知' END AS label, COUNT(*) AS value").
			Where("deleted_at IS NULL").Group("status").Order("value DESC").Scan(&rows).Error
		return rows, err
	default: // department
		err := dbFrom(ctx).Table("hrm_employee AS e").
			Select("COALESCE(d.name,'未分配') AS label, COUNT(*) AS value").
			Joins("LEFT JOIN hrm_department AS d ON d.id = e.department_id").
			Where("e.deleted_at IS NULL").
			Group("d.id").Order("value DESC").Scan(&rows).Error
		return rows, err
	}
}

// HeadcountTrend 入职人数趋势(start 为 yyyy-MM 起始月)。
func (r *DashboardRepo) HeadcountTrend(ctx context.Context, start string) ([]MonthValue, error) {
	var rows []MonthValue
	err := dbFrom(ctx).Table("hrm_employee").
		Select("DATE_FORMAT(entry_date, '%Y-%m') AS month, 0 AS amount, COUNT(*) AS count").
		Where("entry_date >= ?", start+"-01").Where("deleted_at IS NULL").
		Group("month").Order("month ASC").Scan(&rows).Error
	return rows, err
}

// LeaveDaysByDept 按部门汇总指定月份已批请假天数。与原实现一致:查询出错返回空。
func (r *DashboardRepo) LeaveDaysByDept(ctx context.Context, month string) []DeptLeaveAgg {
	var leaves []DeptLeaveAgg
	dbFrom(ctx).Table("hrm_leave AS l").
		Select("COALESCE(d.name,'未分配') AS dept, COALESCE(SUM(l.duration_days),0) AS days").
		Joins("LEFT JOIN hrm_employee AS e ON e.id = l.employee_id").
		Joins("LEFT JOIN hrm_department AS d ON d.id = e.department_id").
		Where("DATE_FORMAT(l.start_date, '%Y-%m') = ?", month).Where("l.deleted_at IS NULL").
		Group("d.id").Scan(&leaves)
	return leaves
}

// OTHoursByDept 按部门汇总指定月份加班小时。与原实现一致:查询出错返回空。
func (r *DashboardRepo) OTHoursByDept(ctx context.Context, month string) []DeptOTAgg {
	var ots []DeptOTAgg
	dbFrom(ctx).Table("hrm_overtime AS o").
		Select("COALESCE(d.name,'未分配') AS dept, COALESCE(SUM(o.duration_hours),0) AS hours").
		Joins("LEFT JOIN hrm_employee AS e ON e.id = o.employee_id").
		Joins("LEFT JOIN hrm_department AS d ON d.id = e.department_id").
		Where("DATE_FORMAT(o.start_date, '%Y-%m') = ?", month).Where("o.deleted_at IS NULL").
		Group("d.id").Scan(&ots)
	return ots
}

// ── 财务 ──

// FinanceTrend 收支趋势(start 为 yyyy-MM 起始月;DEBIT=支出, CREDIT=收入)。
func (r *DashboardRepo) FinanceTrend(ctx context.Context, start string) ([]FinanceTrendRow, error) {
	var rows []FinanceTrendRow
	err := dbFrom(ctx).Table("fin_voucher").
		Select("DATE_FORMAT(voucher_date, '%Y-%m') AS month, "+
			"COALESCE(SUM(CASE WHEN direction='CREDIT' THEN amount ELSE 0 END),0) AS income, "+
			"COALESCE(SUM(CASE WHEN direction='DEBIT' THEN amount ELSE 0 END),0) AS expense").
		Where("voucher_date >= ?", start+"-01").Where("deleted_at IS NULL").
		Group("month").Order("month ASC").Scan(&rows).Error
	return rows, err
}

// ── 进销存 ──

// StockValueByWarehouse 各仓库库存总值(quantity * unit_cost)。
func (r *DashboardRepo) StockValueByWarehouse(ctx context.Context) ([]WarehouseStockValueRow, error) {
	var rows []WarehouseStockValueRow
	err := dbFrom(ctx).Table("psi_stock AS s").
		Select("COALESCE(w.name,'未知') AS warehouse, COALESCE(SUM(s.quantity * p.cost_price),0) AS stock_value, COALESCE(SUM(s.quantity),0) AS quantity").
		Joins("LEFT JOIN psi_warehouse AS w ON w.id = s.warehouse_id").
		Joins("LEFT JOIN crm_product AS p ON p.id = s.product_id").
		Where("s.deleted_at IS NULL").
		Group("w.id").Order("stock_value DESC").Scan(&rows).Error
	return rows, err
}

// PurchaseAmountByMonth 近 N 月采购额(start 为 yyyy-MM 起始月)。
func (r *DashboardRepo) PurchaseAmountByMonth(ctx context.Context, start string) ([]MonthAmountAgg, error) {
	var rows []MonthAmountAgg
	err := dbFrom(ctx).Table("psi_purchase_order AS po").
		Select("DATE_FORMAT(po.order_date, '%Y-%m') AS month, "+
			"COALESCE(SUM(po.total_amount),0) AS amount").
		Where("po.order_date >= ?", start+"-01").Where("po.deleted_at IS NULL").
		Group("month").Scan(&rows).Error
	return rows, err
}

// SalesAmountByMonth 近 N 月销售额(start 为 yyyy-MM 起始月)。
func (r *DashboardRepo) SalesAmountByMonth(ctx context.Context, start string) ([]MonthAmountAgg, error) {
	var sales []MonthAmountAgg
	err := dbFrom(ctx).Table("psi_sales_order AS so").
		Select("DATE_FORMAT(so.order_date, '%Y-%m') AS month, COALESCE(SUM(so.total_amount),0) AS amount").
		Where("so.order_date >= ?", start+"-01").Where("so.deleted_at IS NULL").
		Group("month").Scan(&sales).Error
	return sales, err
}
