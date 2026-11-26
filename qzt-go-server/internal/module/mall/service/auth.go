package service

import (
	"context"
	"errors"
	"strings"

	mallmodel "qzt-go-server/internal/model/mall"
	"qzt-go-server/internal/module/mall/buyerauth"
	mallrepo "qzt-go-server/internal/repository/mall"
	"qzt-go-server/pkg/xcryption"
	"qzt-go-server/pkg/xtime"
)

// auth.go 商城买家账号服务(注册/登录/资料)。买家与员工体系完全隔离:
// 密码 bcrypt,token 由 module/mall/buyerauth 子包签发(派生密钥,
// 与员工 JWT 双向不可互认,见该包头注释)。

// AuthService 买家账号服务。
type AuthService struct {
	userRepo *mallrepo.UserRepo
}

// NewAuthService 构造。
func NewAuthService() *AuthService { return &AuthService{userRepo: mallrepo.NewUserRepo()} }

// MallRegisterRequest 注册请求。
type MallRegisterRequest struct {
	Phone    string `json:"phone" binding:"required"`
	Password string `json:"password" binding:"required"`
	Nickname string `json:"nickname"`
}

// MallLoginRequest 登录请求。
type MallLoginRequest struct {
	Phone    string `json:"phone" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// BuyerDTO 买家资料视图(永不输出密码)。
type BuyerDTO struct {
	ID       uint   `json:"id"`
	Phone    string `json:"phone"`
	Nickname string `json:"nickname"`
}

// LoginResult 登录结果。token 为买家侧独立 JWT(7 天),与员工 token 不通用。
type LoginResult struct {
	Token    string   `json:"token"`
	ExpireAt string   `json:"expire_at"`
	User     BuyerDTO `json:"user"`
}

// buyerDTOFrom 模型转视图。
func buyerDTOFrom(u *mallmodel.MallUser) BuyerDTO {
	return BuyerDTO{ID: u.ID, Phone: u.Phone, Nickname: u.Nickname}
}

// Register 注册:手机号格式/密码长度校验 → 查重 → bcrypt 落库。
func (s *AuthService) Register(ctx context.Context, req *MallRegisterRequest) (*BuyerDTO, error) {
	phone := strings.TrimSpace(req.Phone)
	if !phoneRegexp.MatchString(phone) {
		return nil, errors.New("手机号格式不正确")
	}
	// 密码不 trim(首尾空格可能是刻意的一部分),只限长度
	if n := len([]rune(req.Password)); n < 6 || n > 32 {
		return nil, errors.New("密码长度需为 6-32 位")
	}
	// 含软删查重(唯一索引 uk_mall_user_phone 不豁免软删行)
	if exists, err := s.userRepo.ExistsByPhoneAny(ctx, phone); err != nil {
		return nil, err
	} else if exists {
		return nil, errors.New("该手机号已注册,请直接登录")
	}
	hash, err := xcryption.HashPassword(req.Password)
	if err != nil {
		return nil, err
	}
	nickname := strings.TrimSpace(req.Nickname)
	if nickname == "" {
		nickname = "用户" + phone[len(phone)-4:]
	}
	user := &mallmodel.MallUser{
		Phone:    phone,
		Password: hash,
		Nickname: nickname,
		Status:   mallmodel.UserStatusNormal,
	}
	if err := s.userRepo.Create(ctx, user); err != nil {
		// 并发注册撞唯一索引兜底为友好提示
		return nil, friendlyDupPhone(err)
	}
	dto := buyerDTOFrom(user)
	return &dto, nil
}

// Login 登录:查号 → 状态 → bcrypt 校验 → 签发买家 token。
func (s *AuthService) Login(ctx context.Context, req *MallLoginRequest) (*LoginResult, error) {
	phone := strings.TrimSpace(req.Phone)
	user, err := s.userRepo.GetByPhone(ctx, phone)
	if err != nil {
		// 统一话术,不暴露手机号是否注册
		return nil, errors.New("手机号或密码错误")
	}
	if user.Status != mallmodel.UserStatusNormal {
		return nil, errors.New("账号已被禁用,请联系客服")
	}
	if !xcryption.CheckPassword(user.Password, req.Password) {
		return nil, errors.New("手机号或密码错误")
	}
	token, expire, err := buyerauth.GenerateBuyerToken(user)
	if err != nil {
		return nil, err
	}
	return &LoginResult{
		Token:    token,
		ExpireAt: xtime.NewDateTime(expire).String(),
		User:     buyerDTOFrom(user),
	}, nil
}

// Me 当前买家资料。
func (s *AuthService) Me(ctx context.Context, buyerID uint) (*BuyerDTO, error) {
	user, err := s.userRepo.GetByID(ctx, buyerID)
	if err != nil {
		return nil, errors.New("买家账号不存在")
	}
	dto := buyerDTOFrom(user)
	return &dto, nil
}

// friendlyDupPhone 把唯一索引冲突翻译成友好提示(其余原样返回)。
func friendlyDupPhone(err error) error {
	if err != nil && strings.Contains(strings.ToLower(err.Error()), "duplicate") {
		return errors.New("该手机号已注册,请直接登录")
	}
	return err
}
