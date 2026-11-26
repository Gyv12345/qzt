package service

import (
	"context"
	"crypto/rand"
	"errors"
	"strings"
	"time"

	"github.com/shopspring/decimal"

	mallmodel "qzt-go-server/internal/model/mall"
	"qzt-go-server/internal/repository"
	mallrepo "qzt-go-server/internal/repository/mall"
	"qzt-go-server/pkg/xtime"
)

// coupon.go 优惠券服务:公开领券列表 / 买家领取与券包 / 管理端 CRUD。
// 领取走「行锁 + 原子 UPDATE」双保险;核销在下单事务内条件 UPDATE,
// 失败即回滚;取消订单条件回退。

// CouponService 优惠券服务。
type CouponService struct {
	couponRepo     *mallrepo.CouponRepo
	userCouponRepo *mallrepo.UserCouponRepo
}

// NewCouponService 构造。
func NewCouponService() *CouponService {
	return &CouponService{
		couponRepo:     mallrepo.NewCouponRepo(),
		userCouponRepo: mallrepo.NewUserCouponRepo(),
	}
}

// ── 窗口与券码工具 ──

// couponWindowOK 券是否在领取+使用窗口内(NULL 边界=不限)。
func couponWindowOK(c *mallmodel.MallCoupon, now time.Time) bool {
	if !c.StartAt.IsZero() && now.Before(time.Time(c.StartAt)) {
		return false
	}
	if !c.EndAt.IsZero() && now.After(time.Time(c.EndAt)) {
		return false
	}
	return true
}

const couponAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

// randCouponSuffix 6 位随机大写字母数字(crypto/rand,模偏差对券码无实际影响)。
func randCouponSuffix() string {
	b := make([]byte, 6)
	if _, err := rand.Read(b); err != nil {
		// crypto/rand 极少失败,兜底用时间纳秒
		n := time.Now().UnixNano()
		for i := range b {
			b[i] = couponAlphabet[int(n>>uint(i*4))%len(couponAlphabet)]
		}
		return string(b)
	}
	for i := range b {
		b[i] = couponAlphabet[int(b[i])%len(couponAlphabet)]
	}
	return string(b)
}

// genCouponNo 生成券码:C + yyyyMMdd + 6 位随机大写字母数字,撞码重试。
func (s *CouponService) genCouponNo(ctx context.Context) (string, error) {
	for i := 0; i < 5; i++ {
		no := "C" + time.Now().Format("20060102") + randCouponSuffix()
		exists, err := s.userCouponRepo.ExistsByNoAny(ctx, no)
		if err != nil {
			return "", err
		}
		if !exists {
			return no, nil
		}
	}
	return "", errors.New("券码生成失败,请重试")
}

// ── 公开(免鉴权) ──

// PublicCouponDTO 可领券列表项。
type PublicCouponDTO struct {
	ID           uint               `json:"id"`
	Name         string             `json:"name"`
	Threshold    decimal.Decimal    `json:"threshold"`
	Discount     decimal.Decimal    `json:"discount"`
	Remaining    int                `json:"remaining"`
	PerUserLimit int                `json:"per_user_limit"`
	StartAt      xtime.NullDateTime `json:"start_at"`
	EndAt        xtime.NullDateTime `json:"end_at"`
}

// PublicList 可领列表:启用 + 时间窗内 + 还有余量。
func (s *CouponService) PublicList(ctx context.Context) ([]PublicCouponDTO, error) {
	list, err := s.couponRepo.List(ctx, &repository.QueryOptions{
		Where: map[string]any{"status": mallmodel.CouponStatusEnabled},
		Order: []string{"id DESC"},
	})
	if err != nil {
		return nil, err
	}
	now := time.Now()
	out := make([]PublicCouponDTO, 0, len(list))
	for i := range list {
		c := &list[i]
		if !couponWindowOK(c, now) || c.Claimed >= c.TotalCount {
			continue
		}
		out = append(out, PublicCouponDTO{
			ID: c.ID, Name: c.Name, Threshold: c.Threshold, Discount: c.Discount,
			Remaining: c.TotalCount - c.Claimed, PerUserLimit: c.PerUserLimit,
			StartAt: c.StartAt, EndAt: c.EndAt,
		})
	}
	return out, nil
}

// ── 买家(mall 买家 token) ──

// Claim 买家领券。行锁串行化同券并发 → per_user_limit 精确;原子 UPDATE
// 兜底库存余量;全部包在事务里,任一步失败整体回滚。
func (s *CouponService) Claim(ctx context.Context, couponID, buyerID uint) error {
	return repository.Transaction(ctx, func(ctx context.Context) error {
		// 1) 行锁读券,串行化同一张券的并发领取
		coupon, err := s.couponRepo.GetByIDForUpdate(ctx, couponID)
		if err != nil {
			return repository.NotFoundOr(err, "优惠券不存在")
		}
		if coupon.Status != mallmodel.CouponStatusEnabled {
			return errors.New("该优惠券已停用")
		}
		if !couponWindowOK(coupon, time.Now()) {
			return errors.New("不在该优惠券的领取时间内")
		}
		// 2) 每人限领(含已用)
		count, err := s.userCouponRepo.CountByCoupon(ctx, buyerID, couponID)
		if err != nil {
			return err
		}
		if int(count) >= coupon.PerUserLimit {
			return errors.New("已达每人限领上限")
		}
		// 3) 原子扣减余量(条件全在 WHERE 内,RowsAffected=1 才算抢到)
		ok, err := s.couponRepo.ClaimAtomic(ctx, couponID)
		if err != nil {
			return err
		}
		if !ok {
			return errors.New("该优惠券已被领完")
		}
		// 4) 生成唯一券码并落实例
		no, err := s.genCouponNo(ctx)
		if err != nil {
			return err
		}
		uc := &mallmodel.MallUserCoupon{
			UserID:   buyerID,
			CouponID: couponID,
			CouponNo: no,
			Status:   mallmodel.UserCouponStatusUnused,
		}
		return s.userCouponRepo.Create(ctx, uc)
	})
}

// UserCouponDTO 买家券包项(含模板冗余信息便于展示)。
type UserCouponDTO struct {
	ID          uint               `json:"id"`
	CouponID    uint               `json:"coupon_id"`
	CouponNo    string             `json:"coupon_no"`
	Name        string             `json:"name"`
	Threshold   decimal.Decimal    `json:"threshold"`
	Discount    decimal.Decimal    `json:"discount"`
	Status      int8               `json:"status"`
	StatusLabel string             `json:"status_label"`
	UsedOrderNo string             `json:"used_order_no"`
	UsedAt      xtime.NullDateTime `json:"used_at"`
	StartAt     xtime.NullDateTime `json:"start_at"`
	EndAt       xtime.NullDateTime `json:"end_at"`
}

// MyCoupons 我的券包。
func (s *CouponService) MyCoupons(ctx context.Context, buyerID uint) ([]UserCouponDTO, error) {
	ucs, err := s.userCouponRepo.ListByUser(ctx, buyerID)
	if err != nil {
		return nil, err
	}
	if len(ucs) == 0 {
		return []UserCouponDTO{}, nil
	}
	// 批量取模板冗余(名字/门槛/面额/窗口)
	couponIDs := make([]uint, 0, len(ucs))
	for _, uc := range ucs {
		couponIDs = append(couponIDs, uc.CouponID)
	}
	templates, err := s.couponRepo.List(ctx, &repository.QueryOptions{
		Conds: []repository.Cond{{Query: "id IN ?", Args: []any{couponIDs}}},
	})
	if err != nil {
		return nil, err
	}
	tplByID := make(map[uint]*mallmodel.MallCoupon, len(templates))
	for i := range templates {
		tplByID[templates[i].ID] = &templates[i]
	}
	out := make([]UserCouponDTO, 0, len(ucs))
	for _, uc := range ucs {
		dto := UserCouponDTO{
			ID: uc.ID, CouponID: uc.CouponID, CouponNo: uc.CouponNo,
			Status: uc.Status, StatusLabel: UserCouponStatusLabel(uc.Status),
			UsedOrderNo: uc.UsedOrderNo, UsedAt: uc.UsedAt,
		}
		if tpl := tplByID[uc.CouponID]; tpl != nil {
			dto.Name, dto.Threshold, dto.Discount = tpl.Name, tpl.Threshold, tpl.Discount
			dto.StartAt, dto.EndAt = tpl.StartAt, tpl.EndAt
		}
		out = append(out, dto)
	}
	return out, nil
}

// UserCouponStatusLabel 券实例状态中文。
func UserCouponStatusLabel(status int8) string {
	switch status {
	case mallmodel.UserCouponStatusUnused:
		return "未使用"
	case mallmodel.UserCouponStatusUsed:
		return "已使用"
	case mallmodel.UserCouponStatusExpired:
		return "已过期"
	}
	return "未知"
}

// ValidateForOrder 下单用券校验(计价阶段调用,核销在事务内 Redeem):
// 归属本人 + 未使用 + 模板启用 + 时间窗内 + 满足门槛。
// 返回抵扣金额;任何一步失败返回带可读话术的错误,引导用户去掉券码重下。
func (s *CouponService) ValidateForOrder(ctx context.Context, couponNo string, buyerID uint, totalAmt decimal.Decimal) (decimal.Decimal, error) {
	zero := decimal.Zero
	uc, err := s.userCouponRepo.GetByNo(ctx, couponNo)
	if err != nil || uc.UserID != buyerID {
		return zero, errors.New("优惠券不可用")
	}
	if uc.Status != mallmodel.UserCouponStatusUnused {
		return zero, errors.New("优惠券不可用(已使用或已过期),请去掉券码后重下")
	}
	coupon, err := s.couponRepo.GetByID(ctx, uc.CouponID)
	if err != nil {
		return zero, errors.New("优惠券不可用")
	}
	if coupon.Status != mallmodel.CouponStatusEnabled {
		return zero, errors.New("该优惠券已停用,请去掉券码后重下")
	}
	if !couponWindowOK(coupon, time.Now()) {
		return zero, errors.New("该优惠券不在使用时间内,请去掉券码后重下")
	}
	if coupon.Threshold.GreaterThan(totalAmt) {
		return zero, errors.New("订单金额未满足该优惠券使用门槛(满 " + coupon.Threshold.String() + " 元可用),请去掉券码后重下")
	}
	discount := coupon.Discount
	if discount.GreaterThan(totalAmt) {
		discount = totalAmt // 抵扣不超过应付
	}
	return discount, nil
}

// ── 管理端 ──

// CouponCreateRequest 创建券请求。
type CouponCreateRequest struct {
	Name         string             `json:"name" binding:"required,max=64"`
	Threshold    decimal.Decimal    `json:"threshold"`      // 0=无门槛
	Discount     decimal.Decimal    `json:"discount"`       // 必须 >0
	TotalCount   int                `json:"total_count"`    // 必须 >0
	PerUserLimit int                `json:"per_user_limit"` // 缺省 1
	StartAt      xtime.NullDateTime `json:"start_at"`       // 空=立即
	EndAt        xtime.NullDateTime `json:"end_at"`         // 空=长期
}

// validateCouponWindow 校验窗口起止(start 需早于 end;允许任一为空)。
func validateCouponWindow(startAt, endAt xtime.NullDateTime) error {
	if !startAt.IsZero() && !endAt.IsZero() && !time.Time(startAt).Before(time.Time(endAt)) {
		return errors.New("开始时间必须早于结束时间")
	}
	return nil
}

// AdminCreate 创建券模板。
func (s *CouponService) AdminCreate(ctx context.Context, req *CouponCreateRequest) (*mallmodel.MallCoupon, error) {
	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		return nil, errors.New("券名不能为空")
	}
	if !req.Discount.IsPositive() {
		return nil, errors.New("抵扣金额必须大于 0")
	}
	if req.Discount.GreaterThan(decimal.NewFromInt(100_000)) {
		return nil, errors.New("单张抵扣金额超出上限")
	}
	if req.Threshold.IsNegative() {
		return nil, errors.New("使用门槛不能为负数")
	}
	if req.TotalCount <= 0 || req.TotalCount > 1_000_000 {
		return nil, errors.New("发放总量必须大于 0")
	}
	if req.PerUserLimit <= 0 {
		req.PerUserLimit = 1
	}
	if err := validateCouponWindow(req.StartAt, req.EndAt); err != nil {
		return nil, err
	}
	coupon := &mallmodel.MallCoupon{
		Name: req.Name, Threshold: req.Threshold, Discount: req.Discount,
		TotalCount: req.TotalCount, Claimed: 0, PerUserLimit: req.PerUserLimit,
		StartAt: req.StartAt, EndAt: req.EndAt, Status: mallmodel.CouponStatusEnabled,
	}
	if err := s.couponRepo.Create(ctx, coupon); err != nil {
		return nil, err
	}
	return coupon, nil
}

// CouponUpdateRequest 更新券请求(半增量:pointer 字段才更新;
// start_at/end_at 传 "" 清除窗口;status=2 停用后买家不可领不可用)。
type CouponUpdateRequest struct {
	Name         *string             `json:"name"`
	Threshold    *decimal.Decimal    `json:"threshold"`
	Discount     *decimal.Decimal    `json:"discount"`
	TotalCount   *int                `json:"total_count"`
	PerUserLimit *int                `json:"per_user_limit"`
	StartAt      *xtime.NullDateTime `json:"start_at"`
	EndAt        *xtime.NullDateTime `json:"end_at"`
	Status       *int8               `json:"status"`
}

// AdminUpdate 半增量更新。
func (s *CouponService) AdminUpdate(ctx context.Context, id uint, req *CouponUpdateRequest) (*mallmodel.MallCoupon, error) {
	coupon, err := s.couponRepo.GetByID(ctx, id)
	if err != nil {
		return nil, repository.NotFoundOr(err, "优惠券不存在")
	}
	startAt, endAt := coupon.StartAt, coupon.EndAt
	if req.Name != nil {
		name := strings.TrimSpace(*req.Name)
		if name == "" {
			return nil, errors.New("券名不能为空")
		}
		coupon.Name = name
	}
	if req.Threshold != nil {
		if req.Threshold.IsNegative() {
			return nil, errors.New("使用门槛不能为负数")
		}
		coupon.Threshold = *req.Threshold
	}
	if req.Discount != nil {
		if !req.Discount.IsPositive() {
			return nil, errors.New("抵扣金额必须大于 0")
		}
		coupon.Discount = *req.Discount
	}
	if req.TotalCount != nil {
		if *req.TotalCount <= 0 {
			return nil, errors.New("发放总量必须大于 0")
		}
		if *req.TotalCount < coupon.Claimed {
			return nil, errors.New("发放总量不能小于已领取数")
		}
		coupon.TotalCount = *req.TotalCount
	}
	if req.PerUserLimit != nil {
		if *req.PerUserLimit <= 0 {
			return nil, errors.New("每人限领必须大于 0")
		}
		coupon.PerUserLimit = *req.PerUserLimit
	}
	if req.StartAt != nil {
		startAt = *req.StartAt
	}
	if req.EndAt != nil {
		endAt = *req.EndAt
	}
	if err := validateCouponWindow(startAt, endAt); err != nil {
		return nil, err
	}
	coupon.StartAt, coupon.EndAt = startAt, endAt
	if req.Status != nil {
		if *req.Status != mallmodel.CouponStatusEnabled && *req.Status != mallmodel.CouponStatusDisabled {
			return nil, errors.New("状态仅支持 1启用 2停用")
		}
		coupon.Status = *req.Status
	}
	// 显式列更新:零值窗口(=NULL)也要能写回
	if err := s.couponRepo.Update(ctx, coupon,
		"name", "threshold", "discount", "total_count", "per_user_limit",
		"start_at", "end_at", "status"); err != nil {
		return nil, err
	}
	return coupon, nil
}

// AdminList 管理端分页(status/keyword 筛选)。
func (s *CouponService) AdminList(ctx context.Context, page, pageSize int, status *int8, keyword string) ([]mallmodel.MallCoupon, int64, error) {
	q := &repository.QueryOptions{Order: []string{"id DESC"}}
	if status != nil && *status > 0 {
		q.Where = map[string]any{"status": *status}
	}
	if keyword != "" {
		q.Search = map[string]string{"name": keyword}
	}
	return s.couponRepo.PageList(ctx, page, pageSize, q)
}

// AdminDelete 软删(已发出的券实例保留历史,但模板删除后买家不可再领)。
func (s *CouponService) AdminDelete(ctx context.Context, id uint) error {
	if _, err := s.couponRepo.GetByID(ctx, id); err != nil {
		return repository.NotFoundOr(err, "优惠券不存在")
	}
	return s.couponRepo.Delete(ctx, id)
}
