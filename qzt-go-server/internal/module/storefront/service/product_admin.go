package service

import (
	"context"
	"encoding/json"
	"errors"
	"strings"

	"github.com/shopspring/decimal"

	crmmodel "qzt-go-server/internal/model/crm"
	sfmodel "qzt-go-server/internal/model/storefront"
	"qzt-go-server/internal/repository"
)

// product_admin.go 管理端商品维护:分页列表(含翻译完整度)+ 新增/更新上架位与翻译。
// 更新为部分字段更新:仅请求里出现的字段生效(price 用 RawMessage 区分缺省/null/数值);
// i18n 按 locale 整组覆盖,未出现的 locale 不动。slug 唯一索引 + 软删陷阱:
// 创建/改 slug 前先 Unscoped 硬删同键软删旧行。

// AdminProductDTO 管理端商品视图(含翻译完整度)。
type AdminProductDTO struct {
	PublicProductDTO
	// CRM 商品名(原始)
	CrmName string `json:"crm_name"`
	// CRM 标价(CNY)
	CrmPrice decimal.Decimal `json:"crm_price"`
	// CRM 商品状态(1上架 2下架)
	CrmStatus int8 `json:"crm_status"`
	// 上架位状态(1上架 2下架)
	Status int8 `json:"status"`
	// 直标价原值(NULL=无直标价,展示价按 CRM 价折算;管理端编辑回填用,区别于展示价)
	DirectPrice *decimal.Decimal `json:"direct_price"`
	// 排序值(小在前)
	Sort int `json:"sort"`
	// 请求语言详情富文本(空=无翻译,回落主语言)
	Description string `json:"description"`
	// 各语言翻译(key=locale;仅 AdminGet 填充,列表省略)
	I18n map[string]AdminI18nDTO `json:"i18n,omitempty"`
}

// AdminI18nDTO 管理端单语言翻译(AdminGet 返回值 / upsert 请求里 i18n map 的值)。
type AdminI18nDTO struct {
	// 商品名(该语言,必填)
	Name string `json:"name"`
	// 一句话卖点(空串=清空)
	Summary string `json:"summary"`
	// 富文本/Markdown 介绍(空串=清空)
	Description string `json:"description"`
}

// AdminUpsertRequest 新增/更新上架位请求(id=0 新增)。部分字段更新语义:
// 指针/string 字段缺省=不动;price 用 RawMessage 区分缺省(不动)/null(清除)/数值;
// i18n map 里出现的 locale 整组覆盖,未出现的 locale 不动。
type AdminUpsertRequest struct {
	// 上架位ID(0=新增)
	ID uint `json:"-"`
	// 关联 CRM 商品ID(新增必填;更新缺省=不动)
	ProductID uint `json:"product_id"`
	// URL 别名(英文小写+连字符,唯一;新增必填;更新缺省=不动)
	Slug string `json:"slug" binding:"omitempty,max=128"`
	// 上架位状态(1上架 2下架;缺省=不动,新增默认 1)
	Status *int8 `json:"status"`
	// 排序值(缺省=不动)
	Sort *int `json:"sort"`
	// 直标价:缺省=不动;"null"=清除(改按汇率折算);数值=设置
	Price json.RawMessage `json:"price"`
	// 直标价币种(ISO 4217;空=不动,新增默认 USD)
	Currency string `json:"currency" binding:"omitempty,max=3"`
	// 首页精选(缺省=不动)
	Featured *bool `json:"featured"`
	// 翻译(key=locale;出现的 locale 整组覆盖,name 必填)
	I18n map[string]AdminI18nDTO `json:"i18n"`
}

// AdminList 管理端商品列表(分页+关键词,含翻译完整度)。
func (s *ProductService) AdminList(ctx context.Context, keyword, locale string, page, size int) ([]AdminProductDTO, int64, error) {
	rows, total, err := s.sfRepo.PageList(ctx, page, size, &repository.QueryOptions{
		Search: map[string]string{"slug": keyword},
		Order:  []string{"sort ASC, id ASC"},
	})
	if err != nil {
		return nil, 0, err
	}
	if len(rows) == 0 {
		return []AdminProductDTO{}, total, nil
	}
	out, err := s.buildAdminDTOs(ctx, rows, locale, false)
	if err != nil {
		return nil, 0, err
	}
	return out, total, nil
}

// AdminGet 管理端商品详情(附全语言翻译 i18n map,供编辑表单回填)。
func (s *ProductService) AdminGet(ctx context.Context, id uint, locale string) (*AdminProductDTO, error) {
	sp, err := s.sfRepo.GetByID(ctx, id)
	if err != nil {
		return nil, repository.NotFoundOr(err, "商品不存在")
	}
	out, err := s.buildAdminDTOs(ctx, []sfmodel.StorefrontProduct{*sp}, locale, true)
	if err != nil {
		return nil, err
	}
	return &out[0], nil
}

// AdminUpsert 新增(id=0)/部分字段更新上架位与翻译,返回上架位ID。
func (s *ProductService) AdminUpsert(ctx context.Context, req *AdminUpsertRequest) (uint, error) {
	slug := strings.TrimSpace(req.Slug)
	items, err := normalizeI18n(req.I18n)
	if err != nil {
		return 0, err
	}
	price, hasPrice, err := parsePrice(req.Price)
	if err != nil {
		return 0, err
	}
	if req.ID == 0 {
		return s.createProduct(ctx, req, slug, price, hasPrice, items)
	}
	return s.updateProduct(ctx, req, slug, price, hasPrice, items)
}

// parsePrice 解析直标价请求:缺省(空 RawMessage)=不动;"null"=清除(返回 nil,true);
// 数值=设置。非法 JSON 报参数错误。
func parsePrice(raw json.RawMessage) (*decimal.Decimal, bool, error) {
	if len(raw) == 0 {
		return nil, false, nil
	}
	if string(raw) == "null" {
		return nil, true, nil
	}
	var d decimal.Decimal
	if err := json.Unmarshal(raw, &d); err != nil {
		return nil, false, errors.New("price 必须为数值或 null")
	}
	return &d, true, nil
}

// normalizeI18n 规范化翻译:locale 转小写去空白(空键跳过)、name 必填。
func normalizeI18n(in map[string]AdminI18nDTO) (map[string]sfmodel.StorefrontProductI18n, error) {
	items := make(map[string]sfmodel.StorefrontProductI18n, len(in))
	for loc, it := range in {
		loc = strings.ToLower(strings.TrimSpace(loc))
		if loc == "" {
			continue
		}
		name := strings.TrimSpace(it.Name)
		if name == "" {
			return nil, errors.New("语言「" + loc + "」的商品名不能为空")
		}
		items[loc] = sfmodel.StorefrontProductI18n{
			Locale:      loc,
			Name:        name,
			Summary:     strings.TrimSpace(it.Summary),
			Description: it.Description,
		}
	}
	return items, nil
}

// createProduct 新增上架位:先硬删软删的同 slug/product_id 旧行(唯一索引陷阱)再建。
func (s *ProductService) createProduct(ctx context.Context, req *AdminUpsertRequest, slug string, price *decimal.Decimal, hasPrice bool, items map[string]sfmodel.StorefrontProductI18n) (uint, error) {
	if req.ProductID == 0 {
		return 0, errors.New("product_id 不能为空")
	}
	if slug == "" {
		return 0, errors.New("slug 不能为空")
	}
	if len(items) == 0 {
		return 0, errors.New("至少填写一个语言的商品名")
	}
	status := int8(sfmodel.ProductStatusOn)
	if req.Status != nil {
		status = *req.Status
	}
	if status != sfmodel.ProductStatusOn && status != sfmodel.ProductStatusOff {
		return 0, errors.New("status 只能为 1(上架)或 2(下架)")
	}
	currency := strings.ToUpper(strings.TrimSpace(req.Currency))
	if currency == "" {
		currency = "USD"
	}
	if !hasPrice {
		price = nil
	}
	sp := &sfmodel.StorefrontProduct{
		ProductID: req.ProductID,
		Slug:      slug,
		Status:    status,
		Sort:      derefInt(req.Sort),
		Price:     price,
		Currency:  currency,
		Featured:  derefBool(req.Featured),
	}
	err := repository.Transaction(ctx, func(ctx context.Context) error {
		// slug 唯一索引 + 软删:同键软删旧行不硬删,新建必撞唯一键
		if err := repository.DBFrom(ctx).Unscoped().
			Where("deleted_at IS NOT NULL AND (slug = ? OR product_id = ?)", slug, req.ProductID).
			Delete(&sfmodel.StorefrontProduct{}).Error; err != nil {
			return err
		}
		if dup, err := s.sfRepo.Exists(ctx, &repository.QueryOptions{Where: map[string]any{"slug": slug}}); err != nil {
			return err
		} else if dup {
			return errors.New("slug 已被占用:" + slug)
		}
		if err := s.sfRepo.Create(ctx, sp); err != nil {
			return err
		}
		return s.upsertI18n(ctx, sp.ID, items)
	})
	if err != nil {
		return 0, err
	}
	return sp.ID, nil
}

// derefInt 指针缺省取 0(新增场景)。
func derefInt(p *int) int {
	if p == nil {
		return 0
	}
	return *p
}

// derefBool 指针缺省取 false(新增场景)。
func derefBool(p *bool) bool {
	if p == nil {
		return false
	}
	return *p
}

// updateProduct 部分字段更新上架位(白名单逐字段判断缺省)+ 翻译按 locale 整组覆盖。
func (s *ProductService) updateProduct(ctx context.Context, req *AdminUpsertRequest, slug string, price *decimal.Decimal, hasPrice bool, items map[string]sfmodel.StorefrontProductI18n) (uint, error) {
	sp, err := s.sfRepo.GetByID(ctx, req.ID)
	if err != nil {
		return 0, repository.NotFoundOr(err, "商品不存在")
	}
	if req.Status != nil && *req.Status != sfmodel.ProductStatusOn && *req.Status != sfmodel.ProductStatusOff {
		return 0, errors.New("status 只能为 1(上架)或 2(下架)")
	}
	// 逐字段收集变更(缺省不动);price 由 RawMessage 区分缺省/null/数值
	slugChanged := slug != "" && slug != sp.Slug
	fields := make([]string, 0, 7)
	if req.ProductID > 0 && req.ProductID != sp.ProductID {
		sp.ProductID = req.ProductID
		fields = append(fields, "product_id")
	}
	if slugChanged {
		sp.Slug = slug
		fields = append(fields, "slug")
	}
	if req.Status != nil && *req.Status != sp.Status {
		sp.Status = *req.Status
		fields = append(fields, "status")
	}
	if req.Sort != nil && *req.Sort != sp.Sort {
		sp.Sort = *req.Sort
		fields = append(fields, "sort")
	}
	if hasPrice && !priceEqual(sp.Price, price) {
		sp.Price = price
		fields = append(fields, "price")
	}
	if currency := strings.ToUpper(strings.TrimSpace(req.Currency)); currency != "" && currency != sp.Currency {
		sp.Currency = currency
		fields = append(fields, "currency")
	}
	if req.Featured != nil && *req.Featured != sp.Featured {
		sp.Featured = *req.Featured
		fields = append(fields, "featured")
	}

	err = repository.Transaction(ctx, func(ctx context.Context) error {
		// slug 变更:同键软删旧行先硬删,再查活行占用
		if slugChanged {
			if err := repository.DBFrom(ctx).Unscoped().
				Where("deleted_at IS NOT NULL AND slug = ?", slug).
				Delete(&sfmodel.StorefrontProduct{}).Error; err != nil {
				return err
			}
			if dup, err := s.sfRepo.Exists(ctx, &repository.QueryOptions{
				Where: map[string]any{"slug": slug},
				Conds: []repository.Cond{{Query: "id <> ?", Args: []any{sp.ID}}},
			}); err != nil {
				return err
			} else if dup {
				return errors.New("slug 已被占用:" + slug)
			}
		}
		if len(fields) > 0 {
			// 白名单更新:显式 Select 才能把 price=NULL 这类零值写进去
			if err := s.sfRepo.Update(ctx, sp, fields...); err != nil {
				return err
			}
		}
		return s.upsertI18n(ctx, sp.ID, items)
	})
	if err != nil {
		return 0, err
	}
	return sp.ID, nil
}

// priceEqual 比较直标价(nil 视为相等)。
func priceEqual(a, b *decimal.Decimal) bool {
	switch {
	case a == nil && b == nil:
		return true
	case a == nil || b == nil:
		return false
	}
	return a.Equal(*b)
}

// upsertI18n 翻译按 locale 整组覆盖:已有行更新三字段,没有则插入;未出现的 locale 不动。
func (s *ProductService) upsertI18n(ctx context.Context, sfProductID uint, items map[string]sfmodel.StorefrontProductI18n) error {
	for loc, item := range items {
		item.StorefrontProductID = sfProductID
		existing, err := s.i18nRepo.GetOne(ctx, &repository.QueryOptions{
			Where: map[string]any{"storefront_product_id": sfProductID, "locale": loc},
		})
		if err == nil {
			existing.Name = item.Name
			existing.Summary = item.Summary
			existing.Description = item.Description
			if err := s.i18nRepo.Update(ctx, existing, "name", "summary", "description"); err != nil {
				return err
			}
			continue
		}
		if !repository.IsNotFound(err) {
			return err
		}
		if err := s.i18nRepo.Create(ctx, &item); err != nil {
			return err
		}
	}
	return nil
}

// buildAdminDTOs 组装管理端 DTO:批量取 CRM 商品与翻译,补 crm_*/status/sort/description/locales_done。
func (s *ProductService) buildAdminDTOs(ctx context.Context, rows []sfmodel.StorefrontProduct, locale string, withI18n bool) ([]AdminProductDTO, error) {
	sfIDs := make([]uint, 0, len(rows))
	productIDs := make([]uint, 0, len(rows))
	for _, sp := range rows {
		sfIDs = append(sfIDs, sp.ID)
		productIDs = append(productIDs, sp.ProductID)
	}
	prods, err := s.prodRepo.List(ctx, &repository.QueryOptions{Where: map[string]any{"id": productIDs}})
	if err != nil {
		return nil, err
	}
	crmByID := make(map[uint]crmmodel.CrmProduct, len(prods))
	for _, p := range prods {
		crmByID[p.ID] = p
	}
	var i18ns []sfmodel.StorefrontProductI18n
	if err := repository.DBFrom(ctx).
		Where("storefront_product_id IN ?", sfIDs).
		Find(&i18ns).Error; err != nil {
		return nil, err
	}
	trBySf := make(map[uint][]sfmodel.StorefrontProductI18n, len(sfIDs))
	for _, t := range i18ns {
		trBySf[t.StorefrontProductID] = append(trBySf[t.StorefrontProductID], t)
	}
	rates := loadRates(ctx)
	out := make([]AdminProductDTO, 0, len(rows))
	for _, sp := range rows {
		crm := crmByID[sp.ProductID]
		trs := trBySf[sp.ID]
		trMap := make(map[string]sfmodel.StorefrontProductI18n, len(trs))
		localesDone := make([]string, 0, len(trs))
		for _, t := range trs {
			trMap[t.Locale] = t
			localesDone = append(localesDone, t.Locale)
		}
		name, summary := pickI18n(trMap, locale, crm.Name)
		price, source, currency := resolvePrice(sp, crm.StandardPrice, rates)
		dto := AdminProductDTO{
			PublicProductDTO: PublicProductDTO{
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
				LocalesDone:         localesDone,
			},
			CrmName:     crm.Name,
			CrmPrice:    crm.StandardPrice,
			CrmStatus:   crm.Status,
			Status:      sp.Status,
			DirectPrice: sp.Price,
			Sort:        sp.Sort,
			Description: pickDescription(trMap, locale),
		}
		if withI18n {
			dto.I18n = make(map[string]AdminI18nDTO, len(trs))
			for _, t := range trs {
				dto.I18n[t.Locale] = AdminI18nDTO{
					Name: t.Name, Summary: t.Summary, Description: t.Description,
				}
			}
		}
		out = append(out, dto)
	}
	return out, nil
}

// pickDescription 详情描述回落:请求语言 → 主语言(en) → 空。
func pickDescription(tr map[string]sfmodel.StorefrontProductI18n, locale string) string {
	if t, ok := tr[locale]; ok && t.Description != "" {
		return t.Description
	}
	if t, ok := tr["en"]; ok {
		return t.Description
	}
	return ""
}
