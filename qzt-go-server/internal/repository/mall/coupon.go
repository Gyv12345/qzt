package mall

import (
	"context"

	"gorm.io/gorm/clause"

	"qzt-go-server/internal/model/mall"
	"qzt-go-server/internal/repository"
)

// coupon.go 优惠券仓储:券模板 + 买家券实例(原子领取/核销/回退)。

// CouponRepo 券模板仓储。
type CouponRepo struct {
	repository.BaseRepo[mall.MallCoupon]
}

// NewCouponRepo 构造。
func NewCouponRepo() *CouponRepo { return &CouponRepo{} }

// GetByIDForUpdate 事务内行锁读取(领取链路用,串行化同券并发领取,
// 保证 per_user_limit 判断准确)。必须在 repository.Transaction 内调用。
func (r *CouponRepo) GetByIDForUpdate(ctx context.Context, id uint) (*mall.MallCoupon, error) {
	var m mall.MallCoupon
	err := repository.DBFrom(ctx).Clauses(clause.Locking{Strength: "UPDATE"}).First(&m, id).Error
	if err != nil {
		return nil, err
	}
	return &m, nil
}

// ClaimAtomic 原子领取扣减:全部生效条件放进 WHERE,RowsAffected=1 才算抢到名额。
// status=1 且时间窗内且 claimed<total_count;返回 false 表示已被领完/已停用/不在窗口。
func (r *CouponRepo) ClaimAtomic(ctx context.Context, id uint) (bool, error) {
	res := repository.DBFrom(ctx).Exec(
		"UPDATE `mall_coupon` SET `claimed` = `claimed` + 1 "+
			"WHERE `id` = ? AND `status` = ? "+
			"AND (`start_at` IS NULL OR `start_at` <= NOW(3)) "+
			"AND (`end_at` IS NULL OR `end_at` >= NOW(3)) "+
			"AND `claimed` < `total_count`",
		id, mall.CouponStatusEnabled)
	if res.Error != nil {
		return false, res.Error
	}
	return res.RowsAffected == 1, nil
}

// UserCouponRepo 买家券实例仓储。
type UserCouponRepo struct {
	repository.BaseRepo[mall.MallUserCoupon]
}

// NewUserCouponRepo 构造。
func NewUserCouponRepo() *UserCouponRepo { return &UserCouponRepo{} }

// GetByNo 按唯一券码取实例。
func (r *UserCouponRepo) GetByNo(ctx context.Context, couponNo string) (*mall.MallUserCoupon, error) {
	return r.GetOne(ctx, &repository.QueryOptions{Where: map[string]any{"coupon_no": couponNo}})
}

// ListByUser 买家券包(新到旧)。
func (r *UserCouponRepo) ListByUser(ctx context.Context, userID uint) ([]mall.MallUserCoupon, error) {
	return r.List(ctx, &repository.QueryOptions{
		Where: map[string]any{"user_id": userID},
		Order: []string{"id DESC"},
	})
}

// CountByCoupon 用户对某券模板的持有张数(含已用,per_user_limit 口径)。
func (r *UserCouponRepo) CountByCoupon(ctx context.Context, userID, couponID uint) (int64, error) {
	return r.Count(ctx, &repository.QueryOptions{
		Where: map[string]any{"user_id": userID, "coupon_id": couponID},
	})
}

// ExistsByNoAny 券码是否被任何行占用(含软删,uk_user_coupon_no 同口径查重)。
func (r *UserCouponRepo) ExistsByNoAny(ctx context.Context, couponNo string) (bool, error) {
	var n int64
	err := repository.DBFrom(ctx).Unscoped().Model(&mall.MallUserCoupon{}).
		Where("coupon_no = ?", couponNo).
		Count(&n).Error
	return n > 0, err
}

// Redeem 核销:仅「归属本人 + 未使用」时置已用并落订单号,RowsAffected=1 才算命中。
// 必须在下单事务内调用,失败即回滚整个订单。
func (r *UserCouponRepo) Redeem(ctx context.Context, couponNo string, userID uint, orderNo string) (bool, error) {
	res := repository.DBFrom(ctx).Exec(
		"UPDATE `mall_user_coupon` SET `status` = ?, `used_order_no` = ?, `used_at` = NOW(3) "+
			"WHERE `coupon_no` = ? AND `user_id` = ? AND `status` = ?",
		mall.UserCouponStatusUsed, orderNo, couponNo, userID, mall.UserCouponStatusUnused)
	if res.Error != nil {
		return false, res.Error
	}
	return res.RowsAffected == 1, nil
}

// Release 取消订单回退券:仅「已使用 + 核销单号为该单」时回退未使用并清核销痕迹。
func (r *UserCouponRepo) Release(ctx context.Context, couponNo, orderNo string) (bool, error) {
	res := repository.DBFrom(ctx).Exec(
		"UPDATE `mall_user_coupon` SET `status` = ?, `used_order_no` = '', `used_at` = NULL "+
			"WHERE `coupon_no` = ? AND `status` = ? AND `used_order_no` = ?",
		mall.UserCouponStatusUnused, couponNo, mall.UserCouponStatusUsed, orderNo)
	if res.Error != nil {
		return false, res.Error
	}
	return res.RowsAffected == 1, nil
}
