package buyerauth

import (
	"crypto/sha256"
	"errors"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"

	"qzt-go-server/config"
	mallmodel "qzt-go-server/internal/model/mall"
	mallrepo "qzt-go-server/internal/repository/mall"
	"qzt-go-server/pkg/xresponse"
)

// buyerauth 商城买家令牌签发与鉴权(与员工体系双向隔离)。
// 独立子包:module/mall(router)、module/mall/handler、module/mall/service
// 三方共用且互不成环。
//
// 隔离设计(读 pkg/xauth/jwt 后的决策):
//   员工侧 Manager(pkg/xauth/jwt)用 config.JWT.JwtSecret 原值做 HS256 密钥,
//   Claims.UserId(int32)直接落库查 sys_user。若买家 token 复用同一密钥,
//   伪造 user_id 即可冒充员工——因此买家侧改用「派生密钥」:
//     mallSecret = sha256("mall-buyer|" + JWT_SECRET)
//   两把钥匙不同 → 两种 token 双向签名互验必失败:
//     - 员工中间件(middleware.JWTAuth/Auth → Manager.ParseToken)解析买家 token:
//       签名校验失败 → 401,买家身份永远进不了员工链路;
//     - 本包 parseBuyerToken 解析员工 token:签名校验失败 → 401。
//   另有 sub 双保险:买家 token 的 Subject 固定 "mallu:<id>" 前缀
//   (员工 token 的 Subject 是纯数字 userId),非该前缀一律拒绝。

const (
	// CtxUserIDKey gin context 中买家ID的键(handler 用 buyerauth.GetBuyerID 取)。
	CtxUserIDKey = "mall_user_id"

	buyerSubjectPrefix = "mallu:"
	buyerTokenTTL      = 7 * 24 * time.Hour
	buyerIssuer        = "qzt-mall"
)

// mallSecret 由员工 JWT 密钥派生的买家侧独立 HS256 密钥(32 字节)。
func mallSecret() []byte {
	sum := sha256.Sum256([]byte("mall-buyer|" + config.Get().JWT.JwtSecret))
	return sum[:]
}

// buyerClaims 买家 token 声明。刻意不带员工 Claims 的 user_id/grant_type/
// session_id/token_ver 字段——即使密钥意外互通,员工侧反序列化出的
// UserId 也恒为 0,userRepo.GetByID(0) 必然查无此人。
type buyerClaims struct {
	Phone string `json:"phone"`
	jwt.RegisteredClaims
}

// GenerateBuyerToken 签发买家 token(7 天,HS256,派生密钥,sub=mallu:<id>)。
func GenerateBuyerToken(u *mallmodel.MallUser) (string, time.Time, error) {
	now := time.Now().UTC()
	exp := now.Add(buyerTokenTTL)
	claims := buyerClaims{
		Phone: u.Phone,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(exp),
			Issuer:    buyerIssuer,
			Subject:   buyerSubjectPrefix + strconv.FormatUint(uint64(u.ID), 10),
			IssuedAt:  jwt.NewNumericDate(now),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString(mallSecret())
	return signed, exp, err
}

// parseBuyerToken 解析买家 token:派生密钥签名校验 + sub 前缀双保险。
// 员工 token 在第一道签名校验即失败。
func parseBuyerToken(tokenStr string) (*buyerClaims, error) {
	var claims buyerClaims
	token, err := jwt.ParseWithClaims(tokenStr, &claims, func(t *jwt.Token) (any, error) {
		return mallSecret(), nil
	}, jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}),
		jwt.WithIssuer(buyerIssuer))
	if err != nil {
		return nil, err
	}
	if !token.Valid {
		return nil, errors.New("invalid token")
	}
	if !strings.HasPrefix(claims.Subject, buyerSubjectPrefix) {
		return nil, errors.New("not a buyer token")
	}
	return &claims, nil
}

// buyerIDFromClaims 从声明还原买家ID(sub = mallu:<id>)。
func buyerIDFromClaims(claims *buyerClaims) uint {
	id, _ := strconv.ParseUint(strings.TrimPrefix(claims.Subject, buyerSubjectPrefix), 10, 64)
	return uint(id)
}

// extractBearerToken 取 Authorization: Bearer <token> 中的 token 串。
// 返回 (token, hasToken, badFormat):无头 → ("",false,false);
// 头格式错误 → ("",false,true),由调用方决定处置。
func extractBearerToken(c *gin.Context) (string, bool, bool) {
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		return "", false, false
	}
	parts := strings.SplitN(authHeader, " ", 2)
	if len(parts) != 2 || parts[0] != "Bearer" {
		return "", false, true
	}
	return parts[1], true, false
}

// MallBuyerAuth 买家鉴权中间件(必须登录)。校验通过后把买家ID写入 gin context。
// 只查 mall_user、只写本包 CtxUserIDKey,不触碰员工 context key;
// 员工 token 在签名校验处即被拒绝。
func MallBuyerAuth() gin.HandlerFunc {
	userRepo := mallrepo.NewUserRepo()
	return func(c *gin.Context) {
		tokenStr, hasToken, badFormat := extractBearerToken(c)
		if !hasToken {
			xresponse.Unauthorized(c, "请先登录")
			return
		}
		if badFormat {
			xresponse.Unauthorized(c, "认证格式错误")
			return
		}
		claims, err := parseBuyerToken(tokenStr)
		if err != nil {
			xresponse.Unauthorized(c, "登录已过期,请重新登录")
			return
		}
		user, err := userRepo.GetByID(c.Request.Context(), buyerIDFromClaims(claims))
		if err != nil || user.Status != mallmodel.UserStatusNormal {
			xresponse.Unauthorized(c, "账号不可用,请重新登录")
			return
		}
		c.Set(CtxUserIDKey, user.ID)
		c.Next()
	}
}

// MallBuyerOptional 公开下单路由的宽松中间件:无 Authorization 头匿名放行;
// 有头但无效/账号不可用时 401(避免买家拿着过期 token 静默丢掉用券资格)。
func MallBuyerOptional() gin.HandlerFunc {
	userRepo := mallrepo.NewUserRepo()
	return func(c *gin.Context) {
		tokenStr, hasToken, badFormat := extractBearerToken(c)
		if !hasToken {
			c.Next()
			return
		}
		if badFormat {
			xresponse.Unauthorized(c, "认证格式错误")
			return
		}
		claims, err := parseBuyerToken(tokenStr)
		if err != nil {
			xresponse.Unauthorized(c, "登录已过期,请重新登录")
			return
		}
		user, err := userRepo.GetByID(c.Request.Context(), buyerIDFromClaims(claims))
		if err != nil || user.Status != mallmodel.UserStatusNormal {
			xresponse.Unauthorized(c, "账号不可用,请重新登录")
			return
		}
		c.Set(CtxUserIDKey, user.ID)
		c.Next()
	}
}

// GetBuyerID 从 gin context 取当前买家ID(0=匿名)。
func GetBuyerID(c *gin.Context) uint {
	val, exists := c.Get(CtxUserIDKey)
	if !exists {
		return 0
	}
	id, _ := val.(uint)
	return id
}
