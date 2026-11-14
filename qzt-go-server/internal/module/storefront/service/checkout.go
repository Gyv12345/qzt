package service

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/shopspring/decimal"

	"qzt-go-server/config"
	crmmodel "qzt-go-server/internal/model/crm"
	sfmodel "qzt-go-server/internal/model/storefront"
	psisvc "qzt-go-server/internal/module/psi/service"
	"qzt-go-server/internal/pkg/cache"
	"qzt-go-server/internal/pkg/notify"
	"qzt-go-server/internal/pkg/numbergen"
	"qzt-go-server/internal/pkg/stripe"
	"qzt-go-server/internal/repository"
	crmrepo "qzt-go-server/internal/repository/crm"
	psirepo "qzt-go-server/internal/repository/psi"
	sfrepo "qzt-go-server/internal/repository/storefront"
	"qzt-go-server/pkg/xlogger"
)

// checkout.go 独立站下单 + Stripe webhook(P28-B 支付闭环,Test Mode 先行)。
// 流程:公开 checkout(IP 频控)→ 校验商品可购 + 价格解析并统一折算到结算币种
// → 订单落库(价格快照)→ Stripe Checkout Session → 回填 session id;
// webhook 验签 → completed 幂等置已支付(回填买家/PI/paid_at,通知+邮件+best-effort PSI 销售单)
// / expired 置已过期。支付回调前 PSI 未生成,失败只记日志不回滚支付状态。
// prepareOrder 供 Stripe 与 PayPal(P28-C 第二支付通道)两个下单入口共用。

// checkoutLimitPerMinute 每 IP 每分钟最大 checkout 请求数(同 inquiry 频控模式)。
const checkoutLimitPerMinute = 5

// CheckoutService 独立站下单服务。
type CheckoutService struct {
	orderRepo *sfrepo.OrderRepo
	itemRepo  *sfrepo.ItemRepo
	sfRepo    *sfrepo.ProductRepo
	prodRepo  *crmrepo.ProductRepo
	custRepo  *crmrepo.CustomerRepo
	whRepo    *psirepo.WarehouseRepo
	salesSvc  *psisvc.SalesService
}

// NewCheckoutService 构造。
func NewCheckoutService() *CheckoutService {
	return &CheckoutService{
		orderRepo: sfrepo.NewOrderRepo(),
		itemRepo:  sfrepo.NewItemRepo(),
		sfRepo:    sfrepo.NewProductRepo(),
		prodRepo:  crmrepo.NewProductRepo(),
		custRepo:  crmrepo.NewCustomerRepo(),
		whRepo:    psirepo.NewWarehouseRepo(),
		salesSvc:  psisvc.NewSalesService(),
	}
}

// ── 公开 checkout ──

// CheckoutItemRequest 下单明细项(独立站不选规格,仅商品+数量)。
type CheckoutItemRequest struct {
	// CRM 商品ID
	ProductID uint `json:"product_id" binding:"required"`
	// 数量(1-999)
	Quantity int `json:"quantity" binding:"required,min=1,max=999"`
}

// CheckoutRequest 公开下单请求。
type CheckoutRequest struct {
	// Items 明细(1-20 行)
	Items []CheckoutItemRequest `json:"items" binding:"required,min=1,max=20,dive"`
	// 站点语言(en/zh,空默认 en)
	Locale string `json:"locale" binding:"max=8"`
	// 结算币种(ISO 4217,空默认 USD;必须存在于汇率表,P28-C 多币种结算)
	Currency string `json:"currency" binding:"max=8"`
}

// CheckoutResult 下单结果:Stripe 收银台地址 + 订单号。
type CheckoutResult struct {
	CheckoutURL string `json:"checkout_url"`
	OrderNo     string `json:"order_no"`
}

// CreateCheckout 公开下单:prepareOrder 落单 → Stripe Session → 失败作废 → 回填 session id。
func (s *CheckoutService) CreateCheckout(ctx context.Context, ip string, req *CheckoutRequest) (*CheckoutResult, error) {
	order, lineItems, err := s.prepareOrder(ctx, ip, req)
	if err != nil {
		return nil, err
	}
	orderNo := order.OrderNo

	// 创建 Stripe Checkout Session(metadata 必带 order_no 供 webhook 回查)
	session, err := s.stripeClient().CreateCheckoutSession(ctx, &stripe.CheckoutSessionParams{
		Items:      lineItems,
		SuccessURL: checkoutRedirectURL(req.Locale, "checkout/success?session_id={CHECKOUT_SESSION_ID}"),
		CancelURL:  checkoutRedirectURL(req.Locale, "cart?canceled=1"),
		Metadata:   map[string]string{"order_no": orderNo},
	})
	if err != nil {
		xlogger.ErrorfCtx(ctx, "独立站 Stripe Session 创建失败 order=%s: %v", orderNo, err)
		// Stripe 侧失败(未配置/网络/拒单):同步作废订单,不留悬挂待支付单污染列表
		order.Status = sfmodel.OrderStatusCancelled
		if uerr := s.orderRepo.Update(ctx, order, "status"); uerr != nil {
			xlogger.ErrorfCtx(ctx, "独立站订单作废失败 order=%s: %v", orderNo, uerr)
		}
		return nil, err
	}
	// 回填 session id(先赋值再 Update:BaseRepo.Update 按 struct 非零值更新,指针字段 nil→跳过)
	sid := session.ID
	order.StripeSessionID = &sid
	if err := s.orderRepo.Update(ctx, order, "stripe_session_id"); err != nil {
		xlogger.ErrorfCtx(ctx, "独立站订单回填 session 失败 order=%s: %v", orderNo, err)
		return nil, errors.New("下单失败,请稍后重试")
	}
	return &CheckoutResult{CheckoutURL: session.URL, OrderNo: orderNo}, nil
}

// prepareOrder 下单公共前半段(Stripe 与 PayPal 共用):IP 频控 → locale/币种归一
// → 商品去重合并 → 上架位/CRM 商品校验 → 价格解析并统一折算到结算币种
// → 订单+明细事务落库(价格快照)。返回订单与 Stripe 明细;PayPal 忽略后者。
func (s *CheckoutService) prepareOrder(ctx context.Context, ip string, req *CheckoutRequest) (*sfmodel.StorefrontOrder, []stripe.LineItem, error) {
	if !s.rateLimitOK(ctx, ip) {
		return nil, nil, errors.New("操作过于频繁,请稍后再试")
	}
	req.Locale = strings.ToLower(strings.TrimSpace(req.Locale))
	if req.Locale == "" {
		req.Locale = "en"
	}
	// 结算币种归一(ToUpper+TrimSpace,空默认 USD)
	req.Currency = strings.ToUpper(strings.TrimSpace(req.Currency))
	if req.Currency == "" {
		req.Currency = "USD"
	}

	// 商品去重合并(同商品重复行合并数量)
	qtyByProduct := make(map[uint]int, len(req.Items))
	ids := make([]uint, 0, len(req.Items))
	for _, it := range req.Items {
		if _, dup := qtyByProduct[it.ProductID]; !dup {
			ids = append(ids, it.ProductID)
		}
		qtyByProduct[it.ProductID] += it.Quantity
	}

	// 上架位必须全部在架
	sfProducts, err := s.sfRepo.List(ctx, &repository.QueryOptions{
		Where: map[string]any{"status": sfmodel.ProductStatusOn},
		Conds: []repository.Cond{{Query: "id IN ?", Args: []any{ids}}},
	})
	if err != nil {
		return nil, nil, err
	}
	if len(sfProducts) != len(ids) {
		return nil, nil, errors.New("包含已下架或不存在的商品,请刷新后重试")
	}
	sfByID := make(map[uint]sfmodel.StorefrontProduct, len(sfProducts))
	productIDs := make([]uint, 0, len(sfProducts))
	productSeen := make(map[uint]bool, len(sfProducts))
	for _, sp := range sfProducts {
		sfByID[sp.ID] = sp
		if !productSeen[sp.ProductID] {
			productSeen[sp.ProductID] = true
			productIDs = append(productIDs, sp.ProductID)
		}
	}
	// CRM 商品必须正常在售
	crms, err := s.prodRepo.List(ctx, &repository.QueryOptions{
		Where: map[string]any{"status": crmmodel.ProductStatusOn},
		Conds: []repository.Cond{{Query: "id IN ?", Args: []any{productIDs}}},
	})
	if err != nil {
		return nil, nil, err
	}
	if len(crms) != len(productIDs) {
		return nil, nil, errors.New("包含已下架或不存在的商品,请刷新后重试")
	}
	crmByID := make(map[uint]crmmodel.CrmProduct, len(crms))
	for _, p := range crms {
		crmByID[p.ID] = p
	}

	// 价格解析(直标价优先,否则 CRM 标价 CNY ÷ 汇率)并统一折算到结算币种
	rates := loadRates(ctx)
	if _, ok := rates[req.Currency]; !ok {
		return nil, nil, fmt.Errorf("不支持的结算币种: %s", req.Currency)
	}
	currency := req.Currency
	trNames := s.loadI18nNames(ctx, ids, req.Locale)
	var totalAmt decimal.Decimal
	items := make([]sfmodel.StorefrontOrderItem, 0, len(ids))
	lineItems := make([]stripe.LineItem, 0, len(ids))
	for _, sfID := range ids {
		sp := sfByID[sfID]
		crm := crmByID[sp.ProductID]
		price, source, cur := resolvePrice(sp, crm.StandardPrice, rates)
		if source == "none" || !price.IsPositive() {
			return nil, nil, fmt.Errorf("商品「%s」价格未配置,请通过询盘联系我们", trNameOf(trNames, sfID, crm.Name))
		}
		// 统一折算到结算币种(CNY 中枢换算;汇率缺失报错拒绝,不再按币种分开下单)
		conv, cerr := convertCurrency(price, cur, currency, rates)
		if cerr != nil {
			return nil, nil, cerr
		}
		price = conv
		qty := qtyByProduct[sfID]
		amount := price.Mul(decimal.NewFromInt(int64(qty))).Round(2)
		totalAmt = totalAmt.Add(amount)
		name := trNameOf(trNames, sfID, crm.Name)
		items = append(items, sfmodel.StorefrontOrderItem{
			ProductID:   crm.ID,
			ProductName: name,
			Quantity:    qty,
			UnitAmount:  price,
			Amount:      amount,
		})
		lineItems = append(lineItems, stripe.LineItem{
			ProductName: name,
			Currency:    currency,
			UnitAmount:  price.InexactFloat64(),
			Quantity:    int64(qty),
		})
	}

	orderNo, err := numbergen.Generate(ctx, "storefront_order")
	if err != nil {
		return nil, nil, err
	}
	if orderNo == "" {
		orderNo = genSfOrderNo()
	}
	order := &sfmodel.StorefrontOrder{
		OrderNo:     orderNo,
		Status:      sfmodel.OrderStatusPending,
		Currency:    currency,
		TotalAmount: totalAmt,
		Locale:      req.Locale,
		IP:          ip,
	}

	if err := repository.Transaction(ctx, func(ctx context.Context) error {
		if err := s.orderRepo.Create(ctx, order); err != nil {
			return err
		}
		for i := range items {
			items[i].OrderID = order.ID
			if err := s.itemRepo.Create(ctx, &items[i]); err != nil {
				return err
			}
		}
		return nil
	}); err != nil {
		xlogger.ErrorfCtx(ctx, "独立站订单落库失败 order=%s: %v", orderNo, err)
		return nil, nil, errors.New("下单失败,请稍后重试")
	}
	return order, lineItems, nil
}

// stripeClient 按当前配置构造 Stripe 客户端(密钥走 .env 注入)。
func (s *CheckoutService) stripeClient() *stripe.Client {
	return stripe.NewClient(config.Get().Stripe.SecretKey)
}

// checkoutRedirectURL 由站点根 + locale + 相对路径拼 Stripe 跳转地址。
func checkoutRedirectURL(locale, tail string) string {
	site := strings.TrimRight(config.Get().Stripe.StorefrontSiteURL, "/")
	if site == "" {
		site = "http://localhost:5177"
	}
	return fmt.Sprintf("%s/%s/%s", site, locale, tail)
}

// loadI18nNames 取各上架位在 locale(缺失回落 en)下的商品名,供 Stripe 明细展示。
func (s *CheckoutService) loadI18nNames(ctx context.Context, sfIDs []uint, locale string) map[uint]string {
	var i18ns []sfmodel.StorefrontProductI18n
	if err := repository.DBFrom(ctx).
		Where("storefront_product_id IN ?", sfIDs).
		Find(&i18ns).Error; err != nil {
		return nil
	}
	bySf := make(map[uint]map[string]string, len(sfIDs))
	for _, row := range i18ns {
		if bySf[row.StorefrontProductID] == nil {
			bySf[row.StorefrontProductID] = map[string]string{}
		}
		if row.Name != "" {
			bySf[row.StorefrontProductID][row.Locale] = row.Name
		}
	}
	out := make(map[uint]string, len(sfIDs))
	for _, id := range sfIDs {
		if n, ok := bySf[id][locale]; ok {
			out[id] = n
		} else if n, ok := bySf[id]["en"]; ok {
			out[id] = n
		}
	}
	return out
}

// trNameOf 取翻译名,缺失回退 CRM 原名。
func trNameOf(names map[uint]string, sfID uint, fallback string) string {
	if n := names[sfID]; n != "" {
		return n
	}
	return fallback
}

// genSfOrderNo 兜底订单号:numbergen 未生成时用 SF+日期+纳秒尾(DB 唯一索引兜底)。
func genSfOrderNo() string {
	now := time.Now()
	return fmt.Sprintf("SF%s%06d", now.Format("20060102"), now.UnixNano()%1000000)
}

// rateLimitOK IP 频控:每分钟 checkoutLimitPerMinute 次(Redis 固定窗口;Redis 异常放行)。
func (s *CheckoutService) rateLimitOK(ctx context.Context, ip string) bool {
	key := "storefront:checkout:rl:" + ip
	n, err := cache.GetStore().Incr(key)
	if err != nil {
		return true
	}
	if n == 1 {
		_ = cache.GetStore().Expire(key, time.Minute)
	}
	return n <= checkoutLimitPerMinute
}

// ── 支付完成推进(Stripe webhook 与 PayPal capture 共用) ──

// markOrderPaid 条件更新置已支付:仅 status=待支付 时生效并写入附加回填列
// (status=paid + updates),天然幂等——Stripe webhook 与 PayPal capture 共用,
// 并发/重复调用只有一方生效。返回是否本次调用实际推进了状态。
func (s *CheckoutService) markOrderPaid(ctx context.Context, orderNo string, updates map[string]any) (bool, error) {
	if updates == nil {
		updates = map[string]any{}
	}
	updates["status"] = sfmodel.OrderStatusPaid
	res := repository.DBFrom(ctx).Model(&sfmodel.StorefrontOrder{}).
		Where("order_no = ? AND status = ?", orderNo, sfmodel.OrderStatusPending).
		Updates(updates)
	if res.Error != nil {
		return false, res.Error
	}
	return res.RowsAffected > 0, nil
}

// finalizePaidOrder 已支付单收尾(Stripe webhook 与 PayPal capture 共用):
// 异步站内/企微通知 + 邮件通知(失败只记日志)+ best-effort PSI 销售单。
func (s *CheckoutService) finalizePaidOrder(ctx context.Context, order *sfmodel.StorefrontOrder) {
	// 通知超管(标题含「独立站订单」,demo 模式下仍走企微,真实订单通道保留)
	go notifyAdminsOrderPaid(order)
	// 邮件通知(通道/收件人未配置则静默跳过;失败只记日志不影响主流程)
	s.emailAdminsOrderPaid(ctx, order)

	// best-effort PSI 销售单:失败只记日志,不影响支付状态
	if psiNo, ok := s.tryGenerateSalesOrder(ctx, order); ok {
		order.PsiOrderNo = psiNo
		if err := s.orderRepo.Update(ctx, order, "psi_order_no"); err != nil {
			xlogger.ErrorfCtx(ctx, "独立站订单回填 PSI 单号失败 order=%s: %v", order.OrderNo, err)
		}
	}
}

// ── Stripe webhook ──

// HandleStripeWebhook 验签并处理事件。返回 (是否业务处理成功, error);
// 验签失败由 handler 直接 400,业务侧异常也回 400 让 Stripe 重试,未知单回 200 防重放风暴。
func (s *CheckoutService) HandleStripeWebhook(ctx context.Context, payload []byte, sigHeader string) error {
	cfg := config.Get().Stripe
	if err := stripe.VerifyWebhookSignature(payload, sigHeader, cfg.WebhookSecret); err != nil {
		return err
	}
	ev, err := stripe.ParseWebhookEvent(payload)
	if err != nil {
		return err
	}
	switch ev.Type {
	case "checkout.session.completed":
		return s.completeOrder(ctx, ev)
	case "checkout.session.expired":
		return s.expireOrder(ctx, ev)
	default:
		xlogger.InfofCtx(ctx, "独立站 Stripe webhook 未处理事件 type=%s", ev.Type)
		return nil
	}
}

// completeOrder checkout.session.completed:幂等置已支付 + 回填买家信息 + finalizePaidOrder 收尾。
func (s *CheckoutService) completeOrder(ctx context.Context, ev *stripe.WebhookEvent) error {
	orderNo := ev.OrderNo()
	if orderNo == "" {
		xlogger.ErrorfCtx(ctx, "独立站 Stripe webhook completed 缺 metadata.order_no session=%s", ev.Data.Object.ID)
		return nil
	}
	obj := ev.Data.Object

	// 条件更新天然幂等:仅 status=1(待支付)时置 2;重复回调/并发竞态只有一方生效
	ok, err := s.markOrderPaid(ctx, orderNo, map[string]any{
		"customer_email":    obj.CustomerDetails.Email,
		"customer_name":     obj.CustomerDetails.Name,
		"customer_country":  obj.CustomerDetails.Address.Country,
		"payment_intent_id": obj.PaymentIntent,
		"paid_at":           time.Now(),
	})
	if err != nil {
		return err
	}
	if !ok {
		// 已支付/已过期/不存在:幂等跳过(查无单也吞掉,避免 Stripe 无限重试)
		return nil
	}

	order, err := s.orderRepo.GetByOrderNo(ctx, orderNo)
	if err != nil {
		xlogger.ErrorfCtx(ctx, "独立站订单支付后回查失败 order=%s: %v", orderNo, err)
		return nil
	}
	s.finalizePaidOrder(ctx, order)
	return nil
}

// expireOrder checkout.session.expired:仅待支付单置已过期。
func (s *CheckoutService) expireOrder(ctx context.Context, ev *stripe.WebhookEvent) error {
	orderNo := ev.OrderNo()
	if orderNo == "" {
		return nil
	}
	res := repository.DBFrom(ctx).Model(&sfmodel.StorefrontOrder{}).
		Where("order_no = ? AND status = ?", orderNo, sfmodel.OrderStatusPending).
		Update("status", sfmodel.OrderStatusExpired)
	return res.Error
}

// ensureCustomer 独立站散客:按「独立站-<email>」名称复用历史客户,否则创建公海客户。
// 名称嵌 email 兼作去重键与溯源标识(同 mall 按手机号复用的口径)。
func (s *CheckoutService) ensureCustomer(ctx context.Context, email, name string) (uint, error) {
	key := email
	if key == "" {
		key = name
	}
	if key == "" {
		key = "匿名买家"
	}
	custName := "独立站-" + key
	existing, err := s.custRepo.GetOne(ctx, &repository.QueryOptions{
		Where: map[string]any{"name": custName, "source": "STOREFRONT"},
	})
	if err == nil {
		return existing.ID, nil
	}
	if !isRecordNotFound(err) {
		return 0, err
	}
	customer := &crmmodel.CrmCustomer{
		Name:   custName,
		Source: "STOREFRONT",
		Status: crmmodel.CustomerStatusNormal,
		InPool: crmmodel.InPoolPublic,
	}
	if err := s.custRepo.Create(ctx, customer); err != nil {
		return 0, err
	}
	return customer.ID, nil
}

// isRecordNotFound 判 gorm.ErrRecordNotFound(避免 service 直接依赖 gorm 的薄封装)。
func isRecordNotFound(err error) bool {
	return err != nil && strings.Contains(err.Error(), "record not found")
}

// tryGenerateSalesOrder best-effort 生成 PSI 销售单(参考 mall:默认仓库 + 散客公海;
// 服务型商品同样直进销售单草稿,出库时才涉及库存,无需区分)。独立小事务,失败仅记日志。
func (s *CheckoutService) tryGenerateSalesOrder(ctx context.Context, order *sfmodel.StorefrontOrder) (string, bool) {
	wh, err := s.whRepo.GetOne(ctx, &repository.QueryOptions{
		Where: map[string]any{"is_default": 1, "status": 1},
	})
	if err != nil {
		return "", false // 无默认仓库,跳过
	}
	items, err := s.itemRepo.ListByOrder(ctx, order.ID)
	if err != nil || len(items) == 0 {
		return "", false
	}
	customerID, err := s.ensureCustomer(ctx, order.CustomerEmail, order.CustomerName)
	if err != nil {
		xlogger.ErrorfCtx(ctx, "独立站订单建客户失败 order=%s: %v", order.OrderNo, err)
		return "", false
	}

	// PSI 以 CNY 计价:按汇率由订单币种折回 CNY(同 resolvePrice 的镜像换算)
	rates := loadRates(ctx)
	rate := rates[order.Currency]
	salesItems := make([]psisvc.SalesOrderItemRequest, 0, len(items))
	for _, it := range items {
		unitPrice := it.UnitAmount
		if rate > 0 {
			unitPrice = it.UnitAmount.Mul(decimal.NewFromFloat(rate)).Round(2)
		}
		salesItems = append(salesItems, psisvc.SalesOrderItemRequest{
			ProductID: it.ProductID,
			SkuID:     0, // 交由 PSI resolveSkuID 解析默认规格
			Quantity:  decimal.NewFromInt(int64(it.Quantity)),
			UnitPrice: unitPrice,
		})
	}
	salesOrder, err := s.salesSvc.Create(ctx, &psisvc.CreateSalesOrderRequest{
		CustomerID:  customerID,
		WarehouseID: wh.ID,
		OrderDate:   time.Now().Format("2006-01-02"),
		Remark:      fmt.Sprintf("独立站订单 %s(%s, %s %s)", order.OrderNo, order.CustomerEmail, order.Currency, order.TotalAmount.String()),
		Items:       salesItems,
	}, nil)
	if err != nil {
		xlogger.ErrorfCtx(ctx, "独立站订单生成 PSI 销售单失败 order=%s: %v", order.OrderNo, err)
		return "", false
	}
	return salesOrder.OrderNo, true
}

// notifyAdminsOrderPaid 异步通知超管有新独立站订单(独立 Background ctx)。
// 标题含「独立站订单」——notify.isOfficialLeadNotice 豁免 demo 降级,真实订单必达企微。
func notifyAdminsOrderPaid(order *sfmodel.StorefrontOrder) {
	ctx := context.Background()

	var userIDs []uint
	err := repository.DBFrom(ctx).
		Table("sys_user_role AS ur").
		Joins("JOIN sys_role AS r ON r.id = ur.sys_role_id").
		Joins("JOIN sys_user AS u ON u.id = ur.sys_user_id").
		Where("r.code = ? AND u.status = 1 AND u.deleted_at IS NULL", "super_admin").
		Pluck("ur.sys_user_id", &userIDs).Error
	if err != nil || len(userIDs) == 0 {
		return
	}

	title := "🌍 新独立站订单"
	content := fmt.Sprintf("订单 %s 已支付,%s %s;买家 %s(%s)",
		order.OrderNo, order.Currency, order.TotalAmount.String(),
		customerDisplayName(order), order.CustomerEmail)
	for _, uid := range userIDs {
		notify.Dispatch(ctx, uid, title, content, "/storefront/order")
	}
}

// customerDisplayName 买家名(缺省回邮箱再回「未知」)。
func customerDisplayName(order *sfmodel.StorefrontOrder) string {
	if order.CustomerName != "" {
		return order.CustomerName
	}
	if order.CustomerEmail != "" {
		return order.CustomerEmail
	}
	return "未知"
}
