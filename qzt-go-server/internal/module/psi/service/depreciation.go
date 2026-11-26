package service

import (
	"context"
	"errors"
	"strconv"
	"strings"
	"time"

	psimodel "qzt-go-server/internal/model/psi"
	entsvc "qzt-go-server/internal/module/enterprise/service"
	"qzt-go-server/internal/repository"
	psirepo "qzt-go-server/internal/repository/psi"
	"qzt-go-server/pkg/xlogger"
)

// depreciation.go 固定资产折旧计提(直线法)。
// 口径:monthly = 采购价 / 使用年限(月);amount = min(monthly, 剩余可提 = 采购价 - 已折旧);
// 月中购入资产当月也全额计提一个月(中小企业直线法简化口径)。
// 幂等:psi_asset_depreciation_log (asset_id, period) 唯一索引,已存在即跳过,
// 定时任务与手动端点共用本核心函数,重复触发不重复计提。
// 金额字段(采购价/已折旧)是 varchar(32),无法解析为浮点的资产记日志跳过;
// 已折旧为空串按 0 处理(语义即从未折旧)。

// DepreciateJobBeanClass 月度折旧计提定时任务 bean_class(sys_job 种子由 SQL 配,cron 每月 1 号)。
const DepreciateJobBeanClass = "asset.depreciate.monthly"

// DepreciationStats 计提统计。
type DepreciationStats struct {
	// 本期实际计提的资产数
	Count int `json:"count"`
	// 本期折旧总额(2 位小数字符串)
	TotalAmount string `json:"total_amount"`
}

// RunDepreciation 对指定期间(period, YYYY-MM,空=当前日历月)执行折旧计提。
// 逐资产写日志 + 更新资产已折旧/净值(单资产事务,失败记日志继续不影响其他资产)。
func RunDepreciation(ctx context.Context, period string) (*DepreciationStats, error) {
	if period == "" {
		period = time.Now().Format("2006-01")
	}
	if _, err := time.Parse("2006-01", period); err != nil {
		return nil, errors.New("period 格式应为 YYYY-MM")
	}
	assetRepo := psirepo.NewAssetRepo()
	depRepo := psirepo.NewDepreciationRepo()
	assets, err := assetRepo.ListDepreciable(ctx)
	if err != nil {
		return nil, err
	}
	doneIDs, err := depRepo.ListAssetIDsByPeriod(ctx, period)
	if err != nil {
		return nil, err
	}

	stats := &DepreciationStats{}
	total := 0.0
	for i := range assets {
		a := &assets[i]
		if doneIDs[a.ID] {
			continue // 该期间已计提,幂等跳过
		}
		price, err := strconv.ParseFloat(strings.TrimSpace(a.PurchasePrice), 64)
		if err != nil {
			xlogger.InfofCtx(ctx, "折旧计提:资产 %d(%s) 采购价 %q 无法解析为数字,跳过", a.ID, a.AssetNo, a.PurchasePrice)
			continue
		}
		depreciated := 0.0
		if depStr := strings.TrimSpace(a.Depreciation); depStr != "" {
			depreciated, err = strconv.ParseFloat(depStr, 64)
			if err != nil {
				xlogger.InfofCtx(ctx, "折旧计提:资产 %d(%s) 已折旧 %q 无法解析为数字,跳过", a.ID, a.AssetNo, a.Depreciation)
				continue
			}
		}
		if price <= 0 {
			continue // 无原值,无可提金额
		}
		monthly := price / float64(a.UsefulLife)
		remaining := price - depreciated
		amount := monthly
		if remaining < amount {
			amount = remaining
		}
		if amount <= 0 {
			continue // 已提满
		}
		amountStr := strconv.FormatFloat(amount, 'f', 2, 64)
		beforeStr := strconv.FormatFloat(depreciated, 'f', 2, 64)
		afterStr := strconv.FormatFloat(depreciated+amount, 'f', 2, 64)
		// 单资产事务:写计提日志 + 更新资产已折旧/净值,失败记日志继续下一资产
		err = repository.Transaction(ctx, func(ctx context.Context) error {
			if err := depRepo.Create(ctx, &psimodel.PsiAssetDepreciationLog{
				AssetID:            a.ID,
				Period:             period,
				Amount:             amountStr,
				BeforeDepreciation: beforeStr,
				AfterDepreciation:  afterStr,
			}); err != nil {
				return err
			}
			a.Depreciation = afterStr
			a.NetValue = strconv.FormatFloat(price-(depreciated+amount), 'f', 2, 64)
			// AssetRepo.Update 固定更新字段列表(含 Depreciation/NetValue)
			return assetRepo.Update(ctx, a)
		})
		if err != nil {
			xlogger.ErrorfCtx(ctx, "折旧计提:资产 %d(%s) 计提失败: %v", a.ID, a.AssetNo, err)
			continue
		}
		stats.Count++
		total += amount
	}
	stats.TotalAmount = strconv.FormatFloat(total, 'f', 2, 64)
	xlogger.InfofCtx(ctx, "折旧计提完成:期间 %s,计提 %d 项资产,折旧总额 %s", period, stats.Count, stats.TotalAmount)
	return stats, nil
}

// ListDepreciationLogs 某资产的折旧计提日志(期间升序)。
func ListDepreciationLogs(ctx context.Context, assetID uint) ([]psimodel.PsiAssetDepreciationLog, error) {
	return psirepo.NewDepreciationRepo().ListByAsset(ctx, assetID)
}

// ── 定时任务处理器 ──

// assetDepreciateJob 月度折旧计提任务处理器(sys_job.bean_class=asset.depreciate.monthly)。
// handler 计提「当前日历月」:cron 每月 1 号触发即计提当月,月中购入资产当月也全额计提一个月。
type assetDepreciateJob struct{}

func (h *assetDepreciateJob) Execute(ctx context.Context) error {
	_, err := RunDepreciation(ctx, time.Now().Format("2006-01"))
	return err
}

func init() {
	entsvc.RegisterJobHandler(DepreciateJobBeanClass, &assetDepreciateJob{})
}
