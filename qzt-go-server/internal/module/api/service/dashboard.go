package service

import (
	"context"
	"time"

	"github.com/shopspring/decimal"

	"qzt-go-server/internal/pkg/datascope"
	"qzt-go-server/internal/repository"
)

// dashboard.go 仪表盘报表服务。
// 聚合 CRM/PSI/审批/通知 的统计数据,供首页工作台展示。
// 所有跨模块 .Table(...) 聚合查询已下沉到 repository.DashboardRepo(报表聚合层),
// service 只负责参数校验、datascope 行级权限条件构造与结果组装。
// datascope 条件留在 service 构造(datascope 包 import 了 repository,不能反向依赖),
// 以 ds 参数传给 repo 方法,repo 只做机械拼接。

// DashboardService 仪表盘服务。
type DashboardService struct {
	repo *repository.DashboardRepo
}

func NewDashboardService() *DashboardService {
	return &DashboardService{repo: repository.NewDashboardRepo()}
}

// ── 结果类型(别名指向 repository 报表行结构,字段与 JSON 输出保持不变) ──

// OverviewData 首页核心指标。
type OverviewData = repository.DashboardOverview

// TrendPoint 趋势数据点。
type TrendPoint = repository.TrendPoint

// DistItem 分布项。
type DistItem = repository.DistItem

// FunnelStage 漏斗阶段。
type FunnelStage = repository.FunnelStage

// FinanceData 财务概览。
type FinanceData = repository.DashboardFinanceData

// LabelValue 通用标签-值对(饼图/柱状图)。
type LabelValue = repository.LabelValue

// MonthValue 月份-金额(趋势折线)。
type MonthValue = repository.MonthValue

// ── 1. Overview 核心指标卡片 ──

// Overview 返回首页核心指标。
func (s *DashboardService) Overview(ctx context.Context, userID uint) (*OverviewData, error) {
	// data_scope 行级过滤(超管/ALL 返回 nil 表示不过滤)
	// crmScopeScopes 对客户/商机/合同生效,均为 owner_id 列
	dsCond := datascope.BuildCond(ctx, "owner_id")
	return s.repo.Overview(ctx, userID, dsCond), nil
}

// ── 2. SalesTrend 销售趋势 ──

// SalesTrend 近N天的回款趋势。
func (s *DashboardService) SalesTrend(ctx context.Context, days int) ([]TrendPoint, error) {
	if days <= 0 {
		days = 30
	}
	start := time.Now().AddDate(0, 0, -days).Format("2006-01-02")
	return s.repo.SalesTrend(ctx, start)
}

// ── 3. CustomerDistribution 客户分布 ──

// CustomerDistribution 按维度(level/source/industry)分组统计客户。
func (s *DashboardService) CustomerDistribution(ctx context.Context, dimension string) ([]DistItem, error) {
	// 白名单维度(防注入)
	allowed := map[string]bool{"level": true, "source": true, "industry": true, "status": true}
	if !allowed[dimension] {
		dimension = "level"
	}
	return s.repo.CustomerDistribution(ctx, dimension, datascope.BuildCond(ctx, "owner_id"))
}

// ── 4. OpportunityFunnel 商机漏斗 ──

// OpportunityFunnel 按阶段分组统计商机数量与金额。
func (s *DashboardService) OpportunityFunnel(ctx context.Context) ([]FunnelStage, error) {
	return s.repo.OpportunityFunnel(ctx, datascope.BuildCond(ctx, "owner_id"))
}

// ── 5. FinanceSummary 财务概览 ──

// FinanceSummary 按日期范围统计财务概览。
func (s *DashboardService) FinanceSummary(ctx context.Context, startDate, endDate string) (*FinanceData, error) {
	return s.repo.FinanceSummary(ctx, startDate, endDate), nil
}

// ── BI 扩展:CRM / HRM / 财务 / 进销存 聚合分析 ──

// ── CRM ──

// ContractTrend 近 N 月合同签约金额趋势。
func (s *DashboardService) ContractTrend(ctx context.Context, months int) ([]MonthValue, error) {
	if months <= 0 {
		months = 6
	}
	start := time.Now().AddDate(0, -months+1, 0).Format("2006-01")
	return s.repo.ContractTrend(ctx, start)
}

// SalesRanking 销售业绩排行(按合同负责人汇总 total_amount)。
func (s *DashboardService) SalesRanking(ctx context.Context, limit int) ([]repository.SalesRankRow, error) {
	if limit <= 0 || limit > 50 {
		limit = 10
	}
	// 先按 owner_id 聚合,再批量补用户名
	aggs, err := s.repo.ContractAmountByOwner(ctx, limit)
	if err != nil {
		return nil, err
	}
	userNames := make(map[uint]string)
	for _, a := range aggs {
		userNames[a.OwnerID] = s.repo.UserNameByID(ctx, a.OwnerID)
	}
	var rows []repository.SalesRankRow
	for _, a := range aggs {
		rows = append(rows, repository.SalesRankRow{
			OwnerID:   a.OwnerID,
			OwnerName: userNames[a.OwnerID],
			Amount:    a.Amount,
			Count:     a.Count,
		})
	}
	return rows, nil
}

// LeadSourceDistribution 线索来源分布。
func (s *DashboardService) LeadSourceDistribution(ctx context.Context) ([]LabelValue, error) {
	return s.repo.LeadSourceDistribution(ctx)
}

// ── HRM ──

// EmployeeDistribution 员工分布(department/gender/status)。
func (s *DashboardService) EmployeeDistribution(ctx context.Context, dimension string) ([]LabelValue, error) {
	return s.repo.EmployeeDistribution(ctx, dimension)
}

// HeadcountTrend 近 N 月入职人数趋势。
func (s *DashboardService) HeadcountTrend(ctx context.Context, months int) ([]MonthValue, error) {
	if months <= 0 {
		months = 6
	}
	start := time.Now().AddDate(0, -months+1, 0).Format("2006-01")
	return s.repo.HeadcountTrend(ctx, start)
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
	// 请假/加班 by dept 两路聚合,再在内存 merge
	leaves := s.repo.LeaveDaysByDept(ctx, month)
	ots := s.repo.OTHoursByDept(ctx, month)

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
	var rows []struct {
		Department string          `json:"department"`
		LeaveDays  decimal.Decimal `json:"leave_days"`
		OTHours    decimal.Decimal `json:"ot_hours"`
	}
	for _, v := range deptMap {
		rows = append(rows, *v)
	}
	return rows, nil
}

// ── 财务 ──

// FinanceTrend 近 N 月收入/支出趋势(voucher by month + direction)。
func (s *DashboardService) FinanceTrend(ctx context.Context, months int) ([]repository.FinanceTrendRow, error) {
	if months <= 0 {
		months = 6
	}
	start := time.Now().AddDate(0, -months+1, 0).Format("2006-01")
	return s.repo.FinanceTrend(ctx, start)
}

// ── 进销存 ──

// StockValueByWarehouse 各仓库库存总值(quantity * unit_cost)。
func (s *DashboardService) StockValueByWarehouse(ctx context.Context) ([]repository.WarehouseStockValueRow, error) {
	return s.repo.StockValueByWarehouse(ctx)
}

// SalesVsPurchase 近 N 月采购额 vs 销售额对比。
func (s *DashboardService) SalesVsPurchase(ctx context.Context, months int) ([]struct {
	Month          string          `json:"month"`
	PurchaseAmount decimal.Decimal `json:"purchase_amount"`
	SalesAmount    decimal.Decimal `json:"sales_amount"`
}, error) {
	if months <= 0 {
		months = 6
	}
	start := time.Now().AddDate(0, -months+1, 0).Format("2006-01")
	// 采购额(其查询错误沿袭原语义:延迟到函数末尾返回)
	rowsAgg, err := s.repo.PurchaseAmountByMonth(ctx, start)
	var rows []struct {
		Month          string          `json:"month"`
		PurchaseAmount decimal.Decimal `json:"purchase_amount"`
		SalesAmount    decimal.Decimal `json:"sales_amount"`
	}
	for _, a := range rowsAgg {
		rows = append(rows, struct {
			Month          string          `json:"month"`
			PurchaseAmount decimal.Decimal `json:"purchase_amount"`
			SalesAmount    decimal.Decimal `json:"sales_amount"`
		}{Month: a.Month, PurchaseAmount: a.Amount})
	}

	// 销售额(查询错误沿袭原语义:忽略)
	sales, _ := s.repo.SalesAmountByMonth(ctx, start)
	salesMap := make(map[string]decimal.Decimal)
	for _, sa := range sales {
		salesMap[sa.Month] = sa.Amount
	}
	for i := range rows {
		if v, ok := salesMap[rows[i].Month]; ok {
			rows[i].SalesAmount = v
		}
	}
	return rows, err
}
