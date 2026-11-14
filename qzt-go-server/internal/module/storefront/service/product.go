package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/shopspring/decimal"

	crmmodel "qzt-go-server/internal/model/crm"
	psimodel "qzt-go-server/internal/model/psi"
	sfmodel "qzt-go-server/internal/model/storefront"
	"qzt-go-server/internal/repository"
	crmrepo "qzt-go-server/internal/repository/crm"
	sfrepo "qzt-go-server/internal/repository/storefront"
)

// product.go 跨境独立站商品服务(公开浏览 + 管理端维护)。
// 上架位 + i18n 翻译 + (CRM 商品/规格/库存只读复用);价格 USD 直标价优先,
// 否则 CRM 标价(CNY)× 汇率折算;公开 DTO 不含成本价。

// ProductService 独立站商品服务。
type ProductService struct {
	sfRepo   *sfrepo.ProductRepo
	i18nRepo *sfrepo.I18nRepo
	prodRepo *crmrepo.ProductRepo
	skuRepo  *crmrepo.ProductSkuRepo
}

// NewProductService 构造。
func NewProductService() *ProductService {
	return &ProductService{
		sfRepo:   sfrepo.NewProductRepo(),
		i18nRepo: sfrepo.NewI18nRepo(),
		prodRepo: crmrepo.NewProductRepo(),
		skuRepo:  crmrepo.NewProductSkuRepo(),
	}
}

// ── DTO ──

// SkuDTO 公开规格视图(不含成本价)。
type SkuDTO struct {
	ID       uint            `json:"id"`
	Spec     string          `json:"spec"`
	SkuNo    string          `json:"sku_no"`
	Price    decimal.Decimal `json:"price"`
	ImageURL string          `json:"image_url"`
	InStock  bool            `json:"in_stock"`
}

// PublicProductDTO 公开商品视图(已按 locale 填充翻译,不含成本价)。
type PublicProductDTO struct {
	ID uint `json:"id"`
	// 上架位ID(storefront_product.id,询盘关联用)
	StorefrontProductID uint `json:"storefront_product_id"`
	// CRM 商品ID
	ProductID uint `json:"product_id"`
	// URL 别名
	Slug string `json:"slug"`
	// 已按 locale 回落的名称/卖点(语言缺失回落 CRM 原名)
	Name    string `json:"name"`
	Summary string `json:"summary"`
	// 详情富文本(该语言;空=无翻译,前端回落 CRM 描述)
	Description string `json:"description"`
	// 展示价(直标价或折算价,带币种)
	Price    decimal.Decimal `json:"price"`
	Currency string          `json:"currency"`
	// 折算说明:价格来源 direct=直标价 converted=CRM标价折算 none=汇率缺失展示询价
	PriceSource string `json:"price_source"`
	ImageURL    string `json:"image_url"`
	// 库存参考
	InStock bool `json:"in_stock"`
	// 精选
	Featured bool `json:"featured"`
	// 翻译完整度(该商品已有翻译的语言,管理端展示用;公开端恒空)
	LocalesDone []string `json:"locales_done,omitempty"`
}

// PublicConfigDTO moved to config.go;公开商品列表:上架位 sort 升序。
func (s *ProductService) PublicProducts(ctx context.Context, locale string) ([]PublicProductDTO, error) {
	sfProducts, err := s.sfRepo.List(ctx, &repository.QueryOptions{
		Where: map[string]any{"status": sfmodel.ProductStatusOn},
		Order: []string{"sort ASC, id ASC"},
	})
	if err != nil {
		return nil, err
	}
	if len(sfProducts) == 0 {
		return []PublicProductDTO{}, nil
	}

	// 批量取 CRM 商品与翻译
	productIDs := make([]uint, 0, len(sfProducts))
	sfIDs := make([]uint, 0, len(sfProducts))
	for _, sp := range sfProducts {
		productIDs = append(productIDs, sp.ProductID)
		sfIDs = append(sfIDs, sp.ID)
	}
	crms, err := s.prodRepo.List(ctx, &repository.QueryOptions{
		Where: map[string]any{"id": productIDs},
	})
	if err != nil {
		return nil, err
	}
	crmByID := make(map[uint]crmmodel.CrmProduct, len(crms))
	for _, p := range crms {
		crmByID[p.ID] = p
	}
	var i18ns []sfmodel.StorefrontProductI18n
	if err := repository.DBFrom(ctx).
		Where("storefront_product_id IN ?", sfIDs).
		Find(&i18ns).Error; err != nil {
		return nil, err
	}
	i18nBySf := make(map[uint]map[string]sfmodel.StorefrontProductI18n, len(sfProducts))
	for _, row := range i18ns {
		if i18nBySf[row.StorefrontProductID] == nil {
			i18nBySf[row.StorefrontProductID] = map[string]sfmodel.StorefrontProductI18n{}
		}
		i18nBySf[row.StorefrontProductID][row.Locale] = row
	}

	// 汇率(CNY per unit)用于 CRM 标价折算
	rates := loadRates(ctx)

	out := make([]PublicProductDTO, 0, len(sfProducts))
	for _, sp := range sfProducts {
		crm := crmByID[sp.ProductID]
		tr := i18nBySf[sp.ID]
		name, summary := pickI18n(tr, locale, crm.Name)
		price, source, currency := resolvePrice(sp, crm.StandardPrice, rates)
		out = append(out, PublicProductDTO{
			ID:                  sp.ID,
			StorefrontProductID: sp.ID,
			ProductID:           sp.ProductID,
			Slug:                sp.Slug,
			Name:                name,
			Summary:             summary,
			Price:               price,
			Currency:            currency,
			PriceSource:         source,
			ImageURL:            crm.ImageURL,
			InStock:             true,
			Featured:            sp.Featured,
		})
	}
	return out, nil
}

// pickI18n 翻译回落:请求语言 → 主语言(en) → CRM 原名。
func pickI18n(tr map[string]sfmodel.StorefrontProductI18n, locale, fallback string) (string, string) {
	if row, ok := tr[locale]; ok && row.Name != "" {
		return row.Name, row.Summary
	}
	if row, ok := tr["en"]; ok && row.Name != "" {
		return row.Name, row.Summary
	}
	return fallback, ""
}

// loadRates 从 sys_config 读汇率(读不到回落出厂默认)。
func loadRates(ctx context.Context) map[string]float64 {
	repo := repository.NewConfigRepo()
	row, err := repo.GetByKey(ctx, "storefront.rates")
	if err == nil && row != nil && row.Value != "" {
		var rates map[string]float64
		if json.Unmarshal([]byte(row.Value), &rates) == nil && len(rates) > 0 {
			return rates
		}
	}
	return map[string]float64{"USD": 7.2, "EUR": 7.8, "GBP": 8.8}
}

// resolvePrice 价格解析:直标价优先;否则 CRM 标价(CNY)÷该币种汇率折算;
// 币种无汇率时返回 zero+source=none(前端展示询价)。
func resolvePrice(sp sfmodel.StorefrontProduct, crmPrice decimal.Decimal, rates map[string]float64) (decimal.Decimal, string, string) {
	if sp.Price != nil && sp.Price.GreaterThan(decimal.Zero) {
		return *sp.Price, "direct", sp.Currency
	}
	if crmPrice.IsZero() {
		return decimal.Zero, "none", "USD"
	}
	if sp.Currency == "CNY" || len(rates) == 0 {
		return crmPrice, "direct", "CNY"
	}
	rate, ok := rates[sp.Currency]
	if !ok || rate <= 0 {
		return decimal.Zero, "none", sp.Currency
	}
	return crmPrice.DivRound(decimal.NewFromFloat(rate), 2), "converted", sp.Currency
}

// lookupRate 汇率查询:CNY 恒为 1(中枢币种);其余取表内值(须为正)。
func lookupRate(rates map[string]float64, cur string) (float64, bool) {
	if cur == "CNY" {
		return 1, true
	}
	r, ok := rates[cur]
	return r, ok && r > 0
}

// convertCurrency 跨币种金额换算(CNY 为中枢,round2);同币种原值返回。
// 汇率表缺该币种时报错,由调用方决定拒绝或回退。
func convertCurrency(amount decimal.Decimal, from, to string, rates map[string]float64) (decimal.Decimal, error) {
	if from == to {
		return amount, nil
	}
	rf, ok1 := lookupRate(rates, from)
	rt, ok2 := lookupRate(rates, to)
	if !ok1 || !ok2 {
		return decimal.Zero, fmt.Errorf("商品价格暂不支持换算到 %s", to)
	}
	return amount.Mul(decimal.NewFromFloat(rf)).DivRound(decimal.NewFromFloat(rt), 2), nil
}

// PublicProductDetailDTO 公开商品详情(附规格与全仓库存汇总)。
type PublicProductDetailDTO struct {
	PublicProductDTO
	// 规格列表(单规格商品只有一条 spec 为空的记录)
	Skus []SkuDTO `json:"skus"`
}

// PublicProductDetail 按 slug 查公开商品详情:复用 PublicProducts 的翻译/价格口径,
// 附规格列表与按 SKU 汇总的全仓库存(同 mall PublicGoods 口径)。
func (s *ProductService) PublicProductDetail(ctx context.Context, slug, locale string) (*PublicProductDetailDTO, error) {
	list, err := s.PublicProducts(ctx, locale)
	if err != nil {
		return nil, err
	}
	var base *PublicProductDTO
	for i := range list {
		if list[i].Slug == slug {
			base = &list[i]
			break
		}
	}
	if base == nil {
		return nil, errors.New("商品不存在或已下架")
	}
	dto := &PublicProductDetailDTO{PublicProductDTO: *base, Skus: []SkuDTO{}}

	// 详情描述:请求语言 → 主语言(en) → 空(前端可回落 CRM 描述)
	var i18ns []sfmodel.StorefrontProductI18n
	if err := repository.DBFrom(ctx).
		Where("storefront_product_id = ?", base.StorefrontProductID).
		Find(&i18ns).Error; err == nil {
		trMap := make(map[string]sfmodel.StorefrontProductI18n, len(i18ns))
		for _, t := range i18ns {
			trMap[t.Locale] = t
		}
		dto.Description = pickDescription(trMap, locale)
	}

	// 规格 + 全仓库存汇总(按 SKU group by,只做"有货/无货"参考)
	skus, err := s.skuRepo.ListByProducts(ctx, []uint{base.ProductID})
	if err != nil {
		return nil, err
	}
	skuIDs := make([]uint, 0, len(skus))
	for _, sku := range skus {
		skuIDs = append(skuIDs, sku.ID)
	}
	type stockRow struct {
		SkuID uint
		Qty   decimal.Decimal
	}
	var rows []stockRow
	if len(skuIDs) > 0 {
		if err := repository.DBFrom(ctx).
			Table(psimodel.PsiStock{}.TableName()).
			Select("sku_id AS sku_id, SUM(quantity) AS qty").
			Where("sku_id IN ?", skuIDs).
			Group("sku_id").
			Find(&rows).Error; err != nil {
			return nil, err
		}
	}
	stockBySku := make(map[uint]decimal.Decimal, len(rows))
	for _, r := range rows {
		stockBySku[r.SkuID] = r.Qty
	}
	var totalQty decimal.Decimal
	for _, sku := range skus {
		qty := stockBySku[sku.ID]
		totalQty = totalQty.Add(qty)
		dto.Skus = append(dto.Skus, SkuDTO{
			ID:       sku.ID,
			Spec:     sku.Spec,
			SkuNo:    sku.SkuNo,
			Price:    sku.Price,
			ImageURL: sku.ImageURL,
			InStock:  qty.IsPositive(),
		})
	}
	// 列表口径恒 true,详情给真实库存参考
	dto.InStock = totalQty.IsPositive()
	return dto, nil
}
