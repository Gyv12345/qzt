package service

import (
	"context"
	"time"

	"github.com/shopspring/decimal"
	"gorm.io/gorm"

	apprmodel "qzt-go-server/internal/model/approval"
	crmmodel "qzt-go-server/internal/model/crm"
	psimodel "qzt-go-server/internal/model/psi"
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

	// 客户统计
	db.Table("crm_customer").Where("in_pool = ?", crmmodel.InPoolPrivate).Count(&data.CustomerTotal)
	db.Table("crm_customer").Where("in_pool = ?", crmmodel.InPoolPublic).Count(&data.CustomerPublic)

	// 商机统计
	db.Table("crm_opportunity").Count(&data.OpportunityTotal)
	db.Table("crm_opportunity").Where("stage = ?", crmmodel.OppStageWon).Count(&data.OpportunityWon)

	// 合同统计
	db.Table("crm_contract").Count(&data.ContractTotal)
	db.Table("crm_contract").Select("COALESCE(SUM(total_amount),0)").Scan(&data.ContractAmount)
	db.Table("crm_contract").Select("COALESCE(SUM(received_amount),0)").Scan(&data.ReceivedAmount)

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
	var rows []DistItem
	err := repository.DBFrom(ctx).Table("crm_customer").
		Select(dimension+" AS label, COUNT(*) AS count").
		Where(dimension+" != ''").
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
	var rows []FunnelStage
	err := repository.DBFrom(ctx).Table("crm_opportunity").
		Select("stage, COUNT(*) AS count, COALESCE(SUM(expected_amount),0) AS amount").
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
