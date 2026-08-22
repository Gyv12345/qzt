package service

import (
	"context"
	"errors"
	"fmt"

	"github.com/shopspring/decimal"

	crmmodel "qzt-go-server/internal/model/crm"
	"qzt-go-server/internal/repository"
	crrepo "qzt-go-server/internal/repository/crm"
)

// product_sku.go 商品规格 SKU 服务。
//
// 规则:
// - 每个商品至少保留一个 SKU,spec='' 的记录是「默认规格」;
// - 单规格商品(只有默认规格)的 SKU 价格/成本/图/编号随商品主表自动同步,
//   后台无需感知 SKU;多规格商品由本服务逐条维护;
// - 删除保护:已被库存结余引用的 SKU 不可删(历史单据走软删兜底展示)。

// ProductSkuService 商品规格 SKU 服务。
type ProductSkuService struct {
	repo        *crrepo.ProductSkuRepo
	productRepo *crrepo.ProductRepo
}

func NewProductSkuService() *ProductSkuService {
	return &ProductSkuService{repo: crrepo.NewProductSkuRepo(), productRepo: crrepo.NewProductRepo()}
}

// UpsertSkuRequest 新增/更新 SKU 请求。
type UpsertSkuRequest struct {
	Spec      string          `json:"spec" binding:"max=128"`
	SkuNo     string          `json:"sku_no" binding:"max=64"`
	Price     decimal.Decimal `json:"price"`
	CostPrice decimal.Decimal `json:"cost_price"`
	ImageURL  string          `json:"image_url" binding:"max=512"`
}

// ListByProduct 商品的 SKU 列表(商品不存在时报错)。
func (s *ProductSkuService) ListByProduct(ctx context.Context, productID uint) ([]crmmodel.CrmProductSku, error) {
	if _, err := s.productRepo.GetByID(ctx, productID); err != nil {
		return nil, repository.NotFoundOr(err, "商品不存在")
	}
	return s.repo.ListByProduct(ctx, productID)
}

// Create 新增 SKU。spec 为空即设默认规格(同一商品只能有一个)。
func (s *ProductSkuService) Create(ctx context.Context, productID uint, req *UpsertSkuRequest) (*crmmodel.CrmProductSku, error) {
	p, err := s.productRepo.GetByID(ctx, productID)
	if err != nil {
		return nil, repository.NotFoundOr(err, "商品不存在")
	}
	exists, err := s.repo.SpecExists(ctx, productID, req.Spec, 0)
	if err != nil {
		return nil, err
	}
	if exists {
		if req.Spec == "" {
			return nil, errors.New("默认规格已存在,请直接编辑")
		}
		return nil, fmt.Errorf("规格「%s」已存在", req.Spec)
	}
	skuNo, err := s.availableSkuNo(ctx, req.SkuNo, p.ProductNo)
	if err != nil {
		return nil, err
	}
	sku := &crmmodel.CrmProductSku{
		ProductID: productID, Spec: req.Spec, SkuNo: skuNo,
		Price: req.Price, CostPrice: req.CostPrice, ImageURL: req.ImageURL,
	}
	if err := s.repo.Create(ctx, sku); err != nil {
		return nil, err
	}
	return sku, nil
}

// Update 更新 SKU(spec 改空即转为默认规格,同样受唯一约束)。
func (s *ProductSkuService) Update(ctx context.Context, productID, skuID uint, req *UpsertSkuRequest) error {
	sku, err := s.repo.GetByID(ctx, skuID)
	if err != nil {
		return repository.NotFoundOr(err, "规格不存在")
	}
	if sku.ProductID != productID {
		return errors.New("规格与商品不匹配")
	}
	exists, err := s.repo.SpecExists(ctx, productID, req.Spec, skuID)
	if err != nil {
		return err
	}
	if exists {
		if req.Spec == "" {
			return errors.New("默认规格已存在,不能直接改为默认")
		}
		return fmt.Errorf("规格「%s」已存在", req.Spec)
	}
	sku.Spec = req.Spec
	if req.SkuNo != sku.SkuNo {
		skuNo, err := s.availableSkuNo(ctx, req.SkuNo, "")
		if err != nil {
			return err
		}
		sku.SkuNo = skuNo
	}
	sku.Price = req.Price
	sku.CostPrice = req.CostPrice
	sku.ImageURL = req.ImageURL
	return s.repo.Update(ctx, sku, "Spec", "SkuNo", "Price", "CostPrice", "ImageURL")
}

// Delete 删除 SKU(软删)。至少保留一个;被库存结余引用的不可删。
func (s *ProductSkuService) Delete(ctx context.Context, productID, skuID uint) error {
	sku, err := s.repo.GetByID(ctx, skuID)
	if err != nil {
		return repository.NotFoundOr(err, "规格不存在")
	}
	if sku.ProductID != productID {
		return errors.New("规格与商品不匹配")
	}
	total, err := s.repo.Count(ctx, &repository.QueryOptions{Where: map[string]any{"product_id": productID}})
	if err != nil {
		return err
	}
	if total <= 1 {
		return errors.New("每个商品至少保留一个规格")
	}
	used, err := SkuStockExists(ctx, skuID)
	if err != nil {
		return err
	}
	if used {
		return errors.New("该规格已有库存记录,不可删除(可将库存清零后停用商品)")
	}
	return s.repo.Delete(ctx, sku.ID)
}

// availableSkuNo 生成/校验 SKU 编号:留空时默认规格取商品编号、其余取「商品编号-序号」。
func (s *ProductSkuService) availableSkuNo(ctx context.Context, skuNo, productNo string) (string, error) {
	if skuNo != "" {
		exists, err := s.repo.Exists(ctx, &repository.QueryOptions{Where: map[string]any{"sku_no": skuNo}})
		if err != nil {
			return "", err
		}
		if exists {
			return "", fmt.Errorf("SKU编号「%s」已被占用", skuNo)
		}
		return skuNo, nil
	}
	base := productNo
	if base == "" {
		base = "SKU"
	}
	for i := 0; i < 100; i++ {
		candidate := base
		if i > 0 {
			candidate = fmt.Sprintf("%s-%02d", base, i)
		}
		exists, err := s.repo.Exists(ctx, &repository.QueryOptions{Where: map[string]any{"sku_no": candidate}})
		if err != nil {
			return "", err
		}
		if !exists {
			return candidate, nil
		}
	}
	return "", errors.New("SKU编号生成失败,请手动填写")
}

// ── 默认规格自动维护(商品主表钩子) ──

// EnsureDefaultSKU 商品创建后补默认规格(spec='',跟随商品主表价格/图)。
func EnsureDefaultSKU(ctx context.Context, p *crmmodel.CrmProduct) error {
	repo := crrepo.NewProductSkuRepo()
	skus, err := repo.ListByProduct(ctx, p.ID)
	if err != nil {
		return err
	}
	if len(skus) > 0 {
		return nil
	}
	skuNo := p.ProductNo
	if skuNo == "" {
		skuNo = fmt.Sprintf("SKU-P%d", p.ID)
	}
	// 商品编号被其他商品的 SKU 占用时(理论上不会,编号唯一约定)追加商品ID兜底
	if exists, err := repo.Exists(ctx, &repository.QueryOptions{Where: map[string]any{"sku_no": skuNo}}); err != nil {
		return err
	} else if exists {
		skuNo = fmt.Sprintf("%s-P%d", p.ProductNo, p.ID)
	}
	return repo.Create(ctx, &crmmodel.CrmProductSku{
		ProductID: p.ID, Spec: "", SkuNo: skuNo,
		Price: p.StandardPrice, CostPrice: p.CostPrice, ImageURL: p.ImageURL,
	})
}

// SyncDefaultSKU 商品更新后同步默认规格(仅当商品仍是单规格:只有一条 spec='' 的 SKU)。
// 多规格商品不同步——各规格价格独立,商品主表价格仅作展示锚点。
func SyncDefaultSKU(ctx context.Context, p *crmmodel.CrmProduct) error {
	repo := crrepo.NewProductSkuRepo()
	skus, err := repo.ListByProduct(ctx, p.ID)
	if err != nil {
		return err
	}
	if len(skus) != 1 || skus[0].Spec != "" {
		return nil
	}
	sku := &skus[0]
	sku.Price = p.StandardPrice
	sku.CostPrice = p.CostPrice
	sku.ImageURL = p.ImageURL
	return repo.Update(ctx, sku, "Price", "CostPrice", "ImageURL")
}

// DeleteSKUsByProduct 商品删除后清理其 SKU(软删,同事务)。
func DeleteSKUsByProduct(ctx context.Context, productID uint) error {
	return repository.DBFrom(ctx).
		Where("product_id = ?", productID).
		Delete(&crmmodel.CrmProductSku{}).Error
}

// SkuStockExists SKU 是否已有库存结余记录(psi_stock,删除保护用)。
// 跨模块只读查询收口此处,避免 service 层互引。
func SkuStockExists(ctx context.Context, skuID uint) (bool, error) {
	var n int64
	err := repository.DBFrom(ctx).Table("psi_stock").
		Where("sku_id = ? AND deleted_at IS NULL", skuID).
		Count(&n).Error
	return n > 0, err
}
