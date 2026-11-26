package service

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"time"

	psimodel "qzt-go-server/internal/model/psi"
	"qzt-go-server/internal/pkg/numbergen"
	"qzt-go-server/internal/repository"
	psirepo "qzt-go-server/internal/repository/psi"
	"qzt-go-server/pkg/xlogger"
	"qzt-go-server/pkg/xtime"
)

// asset_stocktake.go 资产盘点单服务(区别于库存盘点 stocktake.go)。
// 范围快照式:发起时按范围冻结在盘资产明细(编号/名称/状态快照),逐项填报结果,
// 完成时要求全部明细已盘,并按缺失/损坏联动资产状态(缺失→丢失、损坏→维修)。
// 编号走 numbergen(asset_stocktake 规则,前缀 PD),禁用/未注册时回落纳秒尾单号。

type AssetStocktakeService struct {
	repo      *psirepo.AssetStocktakeRepo
	itemRepo  *psirepo.AssetStocktakeItemRepo
	assetRepo *psirepo.AssetRepo
}

func NewAssetStocktakeService() *AssetStocktakeService {
	return &AssetStocktakeService{
		repo:      psirepo.NewAssetStocktakeRepo(),
		itemRepo:  psirepo.NewAssetStocktakeItemRepo(),
		assetRepo: psirepo.NewAssetRepo(),
	}
}

// CreateAssetStocktakeRequest 创建资产盘点单。
type CreateAssetStocktakeRequest struct {
	// 范围类型:all/category/dept
	ScopeType string `json:"scope_type" binding:"required"`
	// 范围值:category=分类名,dept=部门ID;all 时留空
	ScopeValue string `json:"scope_value"`
	Remark     string `json:"remark"`
}

// Create 创建资产盘点单:按范围冻结在盘资产明细快照(头+明细同事务)。
// 范围内无可盘资产(使用中/闲置/维修中)时拒绝创建。
func (s *AssetStocktakeService) Create(ctx context.Context, req *CreateAssetStocktakeRequest, operatorID uint) (*psimodel.PsiAssetStocktake, error) {
	switch req.ScopeType {
	case psimodel.AssetStocktakeScopeAll:
	case psimodel.AssetStocktakeScopeCategory:
		if req.ScopeValue == "" {
			return nil, errors.New("按分类盘点时 scope_value(分类)必填")
		}
	case psimodel.AssetStocktakeScopeDept:
		if _, err := strconv.ParseUint(req.ScopeValue, 10, 64); err != nil {
			return nil, errors.New("按部门盘点时 scope_value 必须为部门ID")
		}
	default:
		return nil, errors.New("scope_type 仅支持 all/category/dept")
	}
	assets, err := s.assetRepo.ListByScope(ctx, req.ScopeType, req.ScopeValue)
	if err != nil {
		return nil, err
	}
	if len(assets) == 0 {
		return nil, errors.New("盘点范围内无可盘资产(状态为使用中/闲置/维修中)")
	}
	no, err := numbergen.Generate(ctx, "asset_stocktake")
	if err != nil {
		return nil, err
	}
	if no == "" {
		no = genOrderNo("PD")
	}
	order := &psimodel.PsiAssetStocktake{
		StocktakeNo: no,
		ScopeType:   req.ScopeType,
		ScopeValue:  req.ScopeValue,
		Status:      psimodel.AssetStocktakeStatusOngoing,
		TotalCount:  len(assets),
		StocktakeBy: operatorID,
		StocktakeAt: xtime.NewDateTime(time.Now()),
		Remark:      req.Remark,
	}
	err = repository.Transaction(ctx, func(ctx context.Context) error {
		if err := s.repo.Create(ctx, order); err != nil {
			return err
		}
		for i := range assets {
			a := &assets[i]
			it := &psimodel.PsiAssetStocktakeItem{
				StocktakeID:    order.ID,
				AssetID:        a.ID,
				AssetNo:        a.AssetNo,
				AssetName:      a.Name,
				ExpectedStatus: a.Status,
			}
			if err := s.itemRepo.Create(ctx, it); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return order, nil
}

// List 资产盘点单分页列表(status>0 时过滤)。
func (s *AssetStocktakeService) List(ctx context.Context, page, pageSize int, status int8) ([]psimodel.PsiAssetStocktake, int64, error) {
	q := &repository.QueryOptions{Order: []string{"id DESC"}}
	if status > 0 {
		q.Where = map[string]any{"status": status}
	}
	return s.repo.PageList(ctx, page, pageSize, q)
}

// AssetStocktakeDetailDTO 盘点单详情(头+全部明细)。
type AssetStocktakeDetailDTO struct {
	psimodel.PsiAssetStocktake
	Items []psimodel.PsiAssetStocktakeItem `json:"items"`
}

// GetByID 盘点单详情(头+全部明细)。
func (s *AssetStocktakeService) GetByID(ctx context.Context, id uint) (*AssetStocktakeDetailDTO, error) {
	order, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, repository.NotFoundOr(err, "盘点单不存在")
	}
	items, err := s.itemRepo.ListByStocktake(ctx, id)
	if err != nil {
		return nil, err
	}
	return &AssetStocktakeDetailDTO{PsiAssetStocktake: *order, Items: items}, nil
}

// SubmitAssetStocktakeItemRequest 填报盘点明细结果。
type SubmitAssetStocktakeItemRequest struct {
	// 1在库 2缺失 3损坏
	ResultStatus int8   `json:"result_status" binding:"required"`
	ResultRemark string `json:"result_remark"`
}

// SubmitItem 填报单条明细结果。
// 仅进行中的盘点单可填报;首次填报(结果为空)时盘点单已盘数 +1,重复改结果不重复加;
// 填报人/时间取当前用户/当前时间。
func (s *AssetStocktakeService) SubmitItem(ctx context.Context, stocktakeID, itemID uint, req *SubmitAssetStocktakeItemRequest, operatorID uint) error {
	if req.ResultStatus < psimodel.AssetCheckResultInStock || req.ResultStatus > psimodel.AssetCheckResultDamaged {
		return errors.New("result_status 仅支持 1在库/2缺失/3损坏")
	}
	order, err := s.repo.GetByID(ctx, stocktakeID)
	if err != nil {
		return repository.NotFoundOr(err, "盘点单不存在")
	}
	if order.Status != psimodel.AssetStocktakeStatusOngoing {
		return errors.New("盘点单已完成,不可填报")
	}
	item, err := s.itemRepo.GetByID(ctx, itemID)
	if err != nil {
		return repository.NotFoundOr(err, "盘点明细不存在")
	}
	if item.StocktakeID != stocktakeID {
		return errors.New("明细不属于该盘点单")
	}
	firstCheck := item.ResultStatus == nil
	item.ResultStatus = &req.ResultStatus
	item.ResultRemark = req.ResultRemark
	item.CheckedBy = operatorID
	item.CheckedAt = xtime.NewNullDateTimeFromTime(time.Now())
	return repository.Transaction(ctx, func(ctx context.Context) error {
		if err := s.itemRepo.Update(ctx, item, "ResultStatus", "ResultRemark", "CheckedBy", "CheckedAt"); err != nil {
			return err
		}
		if firstCheck {
			order.CheckedCount++
			return s.repo.Update(ctx, order, "CheckedCount")
		}
		return nil
	})
}

// AssetStocktakeStats 完成盘点后的差异统计。
type AssetStocktakeStats struct {
	Total   int `json:"total"`
	InStock int `json:"in_stock"`
	Missing int `json:"missing"`
	Damaged int `json:"damaged"`
}

// Finish 完成盘点:全部明细已盘才允许;完成后按差异联动资产状态
// (缺失→丢失、损坏→维修、在库不动),盘点单置已完成并记完成时间。
// 头/明细与资产状态联动同事务,任一失败整体回滚。
func (s *AssetStocktakeService) Finish(ctx context.Context, id uint) (*AssetStocktakeStats, error) {
	order, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, repository.NotFoundOr(err, "盘点单不存在")
	}
	if order.Status != psimodel.AssetStocktakeStatusOngoing {
		return nil, errors.New("盘点单已完成,不可重复完成")
	}
	items, err := s.itemRepo.ListByStocktake(ctx, id)
	if err != nil {
		return nil, err
	}
	stats := &AssetStocktakeStats{Total: len(items)}
	var missingIDs, damagedIDs []uint
	for i := range items {
		it := &items[i]
		switch {
		case it.ResultStatus == nil: // 未盘
		case *it.ResultStatus == psimodel.AssetCheckResultInStock:
			stats.InStock++
		case *it.ResultStatus == psimodel.AssetCheckResultMissing:
			stats.Missing++
			missingIDs = append(missingIDs, it.AssetID)
		case *it.ResultStatus == psimodel.AssetCheckResultDamaged:
			stats.Damaged++
			damagedIDs = append(damagedIDs, it.AssetID)
		}
	}
	if unchecked := stats.Total - stats.InStock - stats.Missing - stats.Damaged; unchecked > 0 {
		return nil, fmt.Errorf("还有 %d 项资产未填报盘点结果,不能完成", unchecked)
	}
	err = repository.Transaction(ctx, func(ctx context.Context) error {
		// 差异联动:缺失置丢失、损坏置维修,在库不动
		if err := s.assetRepo.UpdateStatusByIDs(ctx, missingIDs, psimodel.AssetStatusLost); err != nil {
			return err
		}
		if err := s.assetRepo.UpdateStatusByIDs(ctx, damagedIDs, psimodel.AssetStatusInRepair); err != nil {
			return err
		}
		order.Status = psimodel.AssetStocktakeStatusDone
		order.CheckedCount = order.TotalCount
		order.FinishedAt = xtime.NewNullDateTimeFromTime(time.Now())
		return s.repo.Update(ctx, order, "Status", "CheckedCount", "FinishedAt")
	})
	if err != nil {
		return nil, err
	}
	xlogger.InfofCtx(ctx, "资产盘点完成:单号 %s,应盘 %d,在库 %d,缺失 %d,损坏 %d",
		order.StocktakeNo, stats.Total, stats.InStock, stats.Missing, stats.Damaged)
	return stats, nil
}
