package service

import (
	"context"
	"errors"
	"fmt"

	crmmodel "qzt-go-server/internal/model/crm"
	"qzt-go-server/internal/repository"
	crrepo "qzt-go-server/internal/repository/crm"
)

// product_category.go 产品分类树服务:分类定义的唯一来源(迁自系统字典 PRODUCT_CATEGORY)。
// crm_product.category 仍存叶子名字符串,本表不回写商品数据;admin 树选择写叶子名,
// 官网按名字符串筛选。删除分类不阻断商品引用(强拦会卡死改名场景),
// 只在返回消息里提示引用数。

// ProductCategoryNode 分类树节点。
type ProductCategoryNode struct {
	ID       uint                   `json:"id"`
	ParentID uint                   `json:"parent_id"`
	Name     string                 `json:"name"`
	Sort     int                    `json:"sort"`
	Status   int8                   `json:"status"`
	Children []*ProductCategoryNode `json:"children"`
}

// ProductCategoryService 产品分类树服务。
type ProductCategoryService struct {
	repo        *crrepo.ProductCategoryRepo
	productRepo *crrepo.ProductRepo
}

func NewProductCategoryService() *ProductCategoryService {
	return &ProductCategoryService{
		repo:        crrepo.NewProductCategoryRepo(),
		productRepo: crrepo.NewProductRepo(),
	}
}

// Tree 全量查内存组树。includeDisabled=true 时含停用节点(管理端),否则只回启用的
// (公开端);停用节点连同其子树整体不出现,列表已按 sort ASC 排序,组树后顺序保持。
func (s *ProductCategoryService) Tree(ctx context.Context, includeDisabled bool) ([]*ProductCategoryNode, error) {
	list, err := s.repo.ListAll(ctx)
	if err != nil {
		return nil, err
	}
	byID := make(map[uint]*ProductCategoryNode, len(list))
	for i := range list {
		n := &list[i]
		if !includeDisabled && n.Status != crmmodel.ProductCategoryStatusOn {
			continue
		}
		byID[n.ID] = &ProductCategoryNode{
			ID: n.ID, ParentID: n.ParentID, Name: n.Name, Sort: n.Sort, Status: n.Status,
			Children: []*ProductCategoryNode{},
		}
	}
	roots := make([]*ProductCategoryNode, 0)
	for _, n := range list {
		node, ok := byID[n.ID]
		if !ok {
			continue
		}
		if node.ParentID == 0 {
			roots = append(roots, node)
			continue
		}
		// 父节点被过滤(停用)或不存在(脏数据)时子节点悬空:直接丢弃,不回填为根
		if p, ok := byID[node.ParentID]; ok {
			p.Children = append(p.Children, node)
		}
	}
	return roots, nil
}

// PublicTree 免鉴权公开树:只回启用的节点。
func (s *ProductCategoryService) PublicTree(ctx context.Context) ([]*ProductCategoryNode, error) {
	return s.Tree(ctx, false)
}

// ProductCategoryCreateRequest 创建分类请求。
// (命名带前缀避免与 cms/service.CreateCategoryRequest 在 swag 全局类型表里撞名)
type ProductCategoryCreateRequest struct {
	ParentID uint   `json:"parent_id"`
	Name     string `json:"name" binding:"required"`
	Sort     int    `json:"sort"`
	Status   int8   `json:"status"`
}

// ProductCategoryUpdateRequest 更新分类请求(半增量:ParentID/Sort/Status 指针,未传不覆盖)。
type ProductCategoryUpdateRequest struct {
	Name     string `json:"name" binding:"required"`
	ParentID *uint  `json:"parent_id"`
	Sort     *int   `json:"sort"`
	Status   *int8  `json:"status"`
}

// validateStatus 校验状态取值。
func validateStatus(status int8) error {
	if status != crmmodel.ProductCategoryStatusOn && status != crmmodel.ProductCategoryStatusOff {
		return errors.New("status 仅支持 1(启用) 或 2(停用)")
	}
	return nil
}

// checkSiblingNameUnique 同层同名校验(excludeID 用于更新时排除自身)。
func (s *ProductCategoryService) checkSiblingNameUnique(ctx context.Context, parentID uint, name string, excludeID uint) error {
	q := &repository.QueryOptions{
		Where: map[string]any{"parent_id": parentID, "name": name},
	}
	if excludeID > 0 {
		q.Conds = []repository.Cond{{Query: "id <> ?", Args: []any{excludeID}}}
	}
	dup, err := s.repo.Exists(ctx, q)
	if err != nil {
		return err
	}
	if dup {
		return fmt.Errorf("同级下已存在同名分类: %s", name)
	}
	return nil
}

// isDescendant 判断 targetID 是否位于 ancestorID 的子树内(防把自己挂到自己后代造成环)。
func (s *ProductCategoryService) isDescendant(ctx context.Context, targetID, ancestorID uint) (bool, error) {
	cur := targetID
	for i := 0; cur != 0 && i < 16; i++ { // 层数上限兜底,脏数据成环时不死循环
		n, err := s.repo.GetByID(ctx, cur)
		if err != nil {
			return false, repository.NotFoundOr(err, "父分类不存在")
		}
		if n.ID == ancestorID {
			return true, nil
		}
		cur = n.ParentID
	}
	return false, nil
}

// Create 创建分类(默认 status=1 启用)。
func (s *ProductCategoryService) Create(ctx context.Context, req *ProductCategoryCreateRequest) (*crmmodel.CrmProductCategory, error) {
	status := req.Status
	if status == 0 {
		status = crmmodel.ProductCategoryStatusOn
	}
	if err := validateStatus(status); err != nil {
		return nil, err
	}
	if req.ParentID > 0 {
		if _, err := s.repo.GetByID(ctx, req.ParentID); err != nil {
			return nil, repository.NotFoundOr(err, "父分类不存在")
		}
	}
	if err := s.checkSiblingNameUnique(ctx, req.ParentID, req.Name, 0); err != nil {
		return nil, err
	}
	n := &crmmodel.CrmProductCategory{
		ParentID: req.ParentID, Name: req.Name, Sort: req.Sort, Status: status,
	}
	// (parent_id,name) 唯一索引 + 软删:同键软删旧行不硬删,新建必撞唯一键
	if err := repository.Transaction(ctx, func(ctx context.Context) error {
		if err := s.repo.HardDeleteSoftDeletedByName(ctx, req.ParentID, req.Name); err != nil {
			return err
		}
		return s.repo.Create(ctx, n)
	}); err != nil {
		return nil, err
	}
	return n, nil
}

// Update 更新分类。改名不回写 crm_product.category(存量数据不动,商品仍按旧名筛选);
// 换父时校验父存在且不落入自身子树(防环)。
func (s *ProductCategoryService) Update(ctx context.Context, id uint, req *ProductCategoryUpdateRequest) error {
	n, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return repository.NotFoundOr(err, "分类不存在")
	}
	status := n.Status
	if req.Status != nil {
		if err := validateStatus(*req.Status); err != nil {
			return err
		}
		status = *req.Status
	}
	parentID := n.ParentID
	if req.ParentID != nil && *req.ParentID != n.ParentID {
		if *req.ParentID == id {
			return errors.New("不能把自己设为父分类")
		}
		if *req.ParentID > 0 {
			if _, err := s.repo.GetByID(ctx, *req.ParentID); err != nil {
				return repository.NotFoundOr(err, "父分类不存在")
			}
			inSub, err := s.isDescendant(ctx, *req.ParentID, id)
			if err != nil {
				return err
			}
			if inSub {
				return errors.New("不能把分类挂到自己的子树下")
			}
		}
		parentID = *req.ParentID
	}
	if err := s.checkSiblingNameUnique(ctx, parentID, req.Name, id); err != nil {
		return err
	}
	n.Name = req.Name
	n.ParentID = parentID
	n.Status = status
	if req.Sort != nil {
		n.Sort = *req.Sort
	}
	return repository.Transaction(ctx, func(ctx context.Context) error {
		// 改名/换父:目标键位的同键软删旧行先硬删,再落更新
		if err := s.repo.HardDeleteSoftDeletedByName(ctx, parentID, req.Name); err != nil {
			return err
		}
		return s.repo.Update(ctx, n, "Name", "ParentID", "Sort", "Status")
	})
}

// Delete 删除分类。有子节点拒绝删;商品引用只在返回消息里提示引用数但仍允许删
// (叶子名已进商品数据,强拦会卡死改名场景)。返回提示消息(无引用时为空串)。
func (s *ProductCategoryService) Delete(ctx context.Context, id uint) (string, error) {
	n, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return "", repository.NotFoundOr(err, "分类不存在")
	}
	hasChild, err := s.repo.HasChild(ctx, id)
	if err != nil {
		return "", err
	}
	if hasChild {
		return "", errors.New("存在子分类,请先删除子分类")
	}
	var refCount int64
	if n.Name != "" {
		refCount, err = s.productRepo.Count(ctx, &repository.QueryOptions{
			Where: map[string]any{"category": n.Name},
		})
		if err != nil {
			return "", err
		}
	}
	if err := s.repo.Delete(ctx, id); err != nil {
		return "", err
	}
	if refCount > 0 {
		return fmt.Sprintf("分类已删除;仍有 %d 个商品使用该分类名「%s」,商品数据未变动", refCount, n.Name), nil
	}
	return "", nil
}
