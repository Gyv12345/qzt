package service

import (
	"context"

	"github.com/shopspring/decimal"

	crmmodel "qzt-go-server/internal/model/crm"
	"qzt-go-server/internal/pkg/numbergen"
	"qzt-go-server/internal/repository"
	crrepo "qzt-go-server/internal/repository/crm"
)

// product.go 商品服务:商品 CRUD + 多价格 CRUD。

// ProductService 商品服务。
type ProductService struct {
	repo      *crrepo.ProductRepo
	priceRepo *crrepo.ProductPriceRepo
}

func NewProductService() *ProductService {
	return &ProductService{repo: crrepo.NewProductRepo(), priceRepo: crrepo.NewProductPriceRepo()}
}

// CreateProductRequest 创建商品请求。
type CreateProductRequest struct {
	Name          string          `json:"name" binding:"required"`
	ProductNo     string          `json:"product_no"`
	Category      string          `json:"category"`
	Unit          string          `json:"unit"`
	StandardPrice decimal.Decimal `json:"standard_price"`
	CostPrice     decimal.Decimal `json:"cost_price"`
	ImageURL      string          `json:"image_url"`
	Description   string          `json:"description"`
}

// Create 创建商品(默认 status=上架)。
func (s *ProductService) Create(ctx context.Context, req *CreateProductRequest) (*crmmodel.CrmProduct, error) {
	productNo := req.ProductNo
	if productNo == "" {
		productNo, _ = numbergen.Generate(ctx, "product")
	}
	p := &crmmodel.CrmProduct{
		Name: req.Name, ProductNo: productNo, Category: req.Category, Unit: req.Unit,
		StandardPrice: req.StandardPrice, CostPrice: req.CostPrice,
		Status: crmmodel.ProductStatusOn, ImageURL: req.ImageURL, Description: req.Description,
	}
	if err := s.repo.Create(ctx, p); err != nil {
		return nil, err
	}
	return p, nil
}

// GetByID 商品详情。
func (s *ProductService) GetByID(ctx context.Context, id uint) (*crmmodel.CrmProduct, error) {
	p, err := s.repo.GetByID(ctx, id)
	return p, notFoundOr(err, "商品不存在")
}

// UpdateProductRequest 更新商品请求。
type UpdateProductRequest struct {
	Name          string          `json:"name" binding:"required"`
	ProductNo     string          `json:"product_no"`
	Category      string          `json:"category"`
	Unit          string          `json:"unit"`
	StandardPrice decimal.Decimal `json:"standard_price"`
	CostPrice     decimal.Decimal `json:"cost_price"`
	Status        *int8           `json:"status"`
	ImageURL      string          `json:"image_url"`
	Description   string          `json:"description"`
}

// Update 更新商品。
func (s *ProductService) Update(ctx context.Context, id uint, req *UpdateProductRequest) error {
	p, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return notFoundOr(err, "商品不存在")
	}
	p.Name = req.Name
	p.ProductNo = req.ProductNo
	p.Category = req.Category
	p.Unit = req.Unit
	p.StandardPrice = req.StandardPrice
	p.CostPrice = req.CostPrice
	if req.Status != nil {
		p.Status = *req.Status
	}
	p.ImageURL = req.ImageURL
	p.Description = req.Description
	return s.repo.Update(ctx, p)
}

// Delete 删除商品。
func (s *ProductService) Delete(ctx context.Context, id uint) error {
	if _, err := s.repo.GetByID(ctx, id); err != nil {
		return notFoundOr(err, "商品不存在")
	}
	return s.repo.Delete(ctx, id)
}

// ── 公开(免鉴权)接口 ──

// PublicProductDTO 公开商品详情视图。不含成本价(cost_price),附加多价格。
type PublicProductDTO struct {
	ID            uint            `json:"id"`
	Name          string          `json:"name"`
	ProductNo     string          `json:"product_no"`
	Category      string          `json:"category"`
	Unit          string          `json:"unit"`
	StandardPrice decimal.Decimal `json:"standard_price"`
	Status        int8            `json:"status"`
	ImageURL      string          `json:"image_url"`
	Description   string          `json:"description"`
	Prices        []crmmodel.CrmProductPrice `json:"prices"`
}

// ListPublished 公开上架商品分页列表(只返回 status=上架)。
func (s *ProductService) ListPublished(ctx context.Context, page, pageSize int, keyword, category string) ([]crmmodel.CrmProduct, int64, error) {
	opts := &repository.QueryOptions{
		Where: map[string]any{"status": crmmodel.ProductStatusOn},
		Order: []string{"id DESC"},
	}
	if keyword != "" {
		opts.Search = map[string]string{"name": keyword, "product_no": keyword}
	}
	if category != "" {
		opts.Where["category"] = category
	}
	return s.repo.PageList(ctx, page, pageSize, opts)
}

// GetPublishedByID 公开商品详情(仅上架)。附带多价格,隐藏成本价。
func (s *ProductService) GetPublishedByID(ctx context.Context, id uint) (*PublicProductDTO, error) {
	p, err := s.repo.GetOne(ctx, &repository.QueryOptions{
		Where: map[string]any{"id": id, "status": crmmodel.ProductStatusOn},
	})
	if err != nil {
		return nil, notFoundOr(err, "商品不存在")
	}
	prices, err := s.priceRepo.ListByProduct(ctx, id)
	if err != nil {
		return nil, err
	}
	return &PublicProductDTO{
		ID: p.ID, Name: p.Name, ProductNo: p.ProductNo, Category: p.Category,
		Unit: p.Unit, StandardPrice: p.StandardPrice, Status: p.Status, ImageURL: p.ImageURL, Description: p.Description,
		Prices: prices,
	}, nil
}

// List 商品列表(分页 + keyword 名称模糊 + category + status 过滤)。
func (s *ProductService) List(ctx context.Context, page, pageSize int, keyword, category string, status int8) ([]crmmodel.CrmProduct, int64, error) {
	q := &repository.QueryOptions{Order: []string{"id DESC"}}
	where := map[string]any{}
	if keyword != "" {
		q.Search = map[string]string{"name": keyword}
	}
	if category != "" {
		where["category"] = category
	}
	if status > 0 {
		where["status"] = status
	}
	if len(where) > 0 {
		q.Where = where
	}
	return s.repo.PageList(ctx, page, pageSize, q)
}

// ── 商品多价格 ──

// CreateProductPriceRequest 创建商品价格请求。
type CreateProductPriceRequest struct {
	ProductID   uint            `json:"product_id" binding:"required"`
	PriceType   string          `json:"price_type" binding:"required"`
	Price       decimal.Decimal `json:"price" binding:"required"`
	MinQuantity *int            `json:"min_quantity"`
	Remark      string          `json:"remark"`
}

// CreatePrice 新增商品价格。
func (s *ProductService) CreatePrice(ctx context.Context, req *CreateProductPriceRequest) (*crmmodel.CrmProductPrice, error) {
	price := &crmmodel.CrmProductPrice{
		ProductID: req.ProductID, PriceType: req.PriceType, Price: req.Price,
		MinQuantity: req.MinQuantity, Remark: req.Remark,
	}
	if err := s.priceRepo.Create(ctx, price); err != nil {
		return nil, err
	}
	return price, nil
}

// UpdateProductPriceRequest 更新商品价格请求。
type UpdateProductPriceRequest struct {
	PriceType   string          `json:"price_type" binding:"required"`
	Price       decimal.Decimal `json:"price" binding:"required"`
	MinQuantity *int            `json:"min_quantity"`
	Remark      string          `json:"remark"`
}

// UpdatePrice 更新商品价格。
func (s *ProductService) UpdatePrice(ctx context.Context, id uint, req *UpdateProductPriceRequest) error {
	price, err := s.priceRepo.GetByID(ctx, id)
	if err != nil {
		return notFoundOr(err, "商品价格不存在")
	}
	price.PriceType = req.PriceType
	price.Price = req.Price
	price.MinQuantity = req.MinQuantity
	price.Remark = req.Remark
	return s.priceRepo.Update(ctx, price)
}

// DeletePrice 删除商品价格。
func (s *ProductService) DeletePrice(ctx context.Context, id uint) error {
	return s.priceRepo.Delete(ctx, id)
}

// ListPricesByProduct 按商品列价格。
func (s *ProductService) ListPricesByProduct(ctx context.Context, productID uint) ([]crmmodel.CrmProductPrice, error) {
	return s.priceRepo.ListByProduct(ctx, productID)
}
