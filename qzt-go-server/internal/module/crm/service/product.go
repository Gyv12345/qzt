package service

import (
	"context"
	"errors"

	"github.com/shopspring/decimal"
	"gorm.io/gorm"

	"qzt-go-server/internal/model"
	crmmodel "qzt-go-server/internal/model/crm"
	"qzt-go-server/internal/pkg/numbergen"
	"qzt-go-server/internal/repository"
	crrepo "qzt-go-server/internal/repository/crm"
)

// product.go 商品服务:商品 CRUD。

// ProductService 商品服务。
type ProductService struct {
	repo *crrepo.ProductRepo
	// 官网产品由「官网内容→官网首页配置→产品」精选决定,
	// 公开接口据此过滤,未精选的商品不对外露出。
	homepageModuleRepo  *repository.HomepageModuleRepo
	homepageFeatureRepo *repository.HomepageFeatureRepo
}

func NewProductService() *ProductService {
	return &ProductService{
		repo:                crrepo.NewProductRepo(),
		homepageModuleRepo:  repository.NewHomepageModuleRepo(),
		homepageFeatureRepo: repository.NewHomepageFeatureRepo(),
	}
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
	return p, repository.NotFoundOr(err, "商品不存在")
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
		return repository.NotFoundOr(err, "商品不存在")
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
		return repository.NotFoundOr(err, "商品不存在")
	}
	return s.repo.Delete(ctx, id)
}

// ── 公开(免鉴权)接口 ──

// PublicProductDTO 公开商品详情视图。不含成本价(cost_price)。
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
}

// curatedProductFeatures 返回产品板块的精选条目(板块关闭或缺失时返回 nil,表示不对外展示)。
func (s *ProductService) curatedProductFeatures(ctx context.Context) ([]model.CmsHomepageFeature, error) {
	mod, err := s.homepageModuleRepo.GetOne(ctx, &repository.QueryOptions{
		Where: map[string]any{"module": "product"},
	})
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	if !mod.Enabled {
		return nil, nil
	}
	return s.homepageFeatureRepo.ListByModule(ctx, "product")
}

// ListPublished 公开产品列表,只返回「官网内容→官网首页配置→产品」精选的
// 上架商品,按精选顺序排列;板块关闭或未配置精选时返回空列表,绝不回退
// 为全量上架商品。返回 PublicProductDTO,不含成本价。
func (s *ProductService) ListPublished(ctx context.Context) ([]PublicProductDTO, int64, error) {
	features, err := s.curatedProductFeatures(ctx)
	if err != nil {
		return nil, 0, err
	}
	if len(features) == 0 {
		return []PublicProductDTO{}, 0, nil
	}
	ids := make([]uint, 0, len(features))
	for _, f := range features {
		ids = append(ids, f.ItemID)
	}

	// 精选里可能混入已下架/已删除的商品,按 status=上架 过滤后按精选顺序重排
	products, err := s.repo.List(ctx, &repository.QueryOptions{
		Where: map[string]any{"status": crmmodel.ProductStatusOn},
		Conds: []repository.Cond{{Query: "id IN ?", Args: []any{ids}}},
	})
	if err != nil {
		return nil, 0, err
	}
	byID := make(map[uint]*crmmodel.CrmProduct, len(products))
	for i := range products {
		byID[products[i].ID] = &products[i]
	}
	out := make([]PublicProductDTO, 0, len(ids))
	for _, id := range ids {
		p, ok := byID[id]
		if !ok {
			continue
		}
		out = append(out, PublicProductDTO{
			ID: p.ID, Name: p.Name, ProductNo: p.ProductNo, Category: p.Category,
			Unit: p.Unit, StandardPrice: p.StandardPrice, Status: p.Status, ImageURL: p.ImageURL, Description: p.Description,
		})
	}
	return out, int64(len(out)), nil
}

// GetPublishedByID 公开商品详情(仅「精选 + 上架」)。隐藏成本价。
func (s *ProductService) GetPublishedByID(ctx context.Context, id uint) (*PublicProductDTO, error) {
	features, err := s.curatedProductFeatures(ctx)
	if err != nil {
		return nil, err
	}
	curated := false
	for _, f := range features {
		if f.ItemID == id {
			curated = true
			break
		}
	}
	// 未精选/板块关闭一律按不存在返回,避免直接猜 ID 探到未公开商品
	if !curated {
		return nil, repository.NotFoundOr(gorm.ErrRecordNotFound, "商品不存在")
	}
	p, err := s.repo.GetOne(ctx, &repository.QueryOptions{
		Where: map[string]any{"id": id, "status": crmmodel.ProductStatusOn},
	})
	if err != nil {
		return nil, repository.NotFoundOr(err, "商品不存在")
	}
	return &PublicProductDTO{
		ID: p.ID, Name: p.Name, ProductNo: p.ProductNo, Category: p.Category,
		Unit: p.Unit, StandardPrice: p.StandardPrice, Status: p.Status, ImageURL: p.ImageURL, Description: p.Description,
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
