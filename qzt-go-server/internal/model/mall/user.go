package mall

import (
	"qzt-go-server/internal/model/base"
)

// user.go 商城买家账号(mall_user)。独立于 sys_user 员工体系:
// 手机号 + bcrypt 密码注册,token 由 mall 侧独立签发(module/mall/buyerauth.go),
// 与员工 JWT 双向签名互验必失败,买家身份永远无法冒充员工。

// 买家账号状态。
const (
	UserStatusNormal   int8 = 1 // 正常
	UserStatusDisabled int8 = 2 // 禁用
)

// MallUser 商城买家账号。
type MallUser struct {
	ID uint `json:"id" gorm:"primaryKey"`
	// 手机号(登录账号)
	Phone string `json:"phone" gorm:"size:16;not null;uniqueIndex:uk_mall_user_phone;comment:手机号"`
	// 密码(bcrypt 哈希,JSON 永不输出)
	Password string `json:"-" gorm:"size:100;not null;comment:密码(bcrypt)"`
	// 昵称
	Nickname string `json:"nickname" gorm:"size:64;not null;default:'';comment:昵称"`
	// 1正常 2禁用
	Status int8 `json:"status" gorm:"not null;default:1;comment:1正常 2禁用"`
	base.BaseModel
}

func (MallUser) TableName() string { return "mall_user" }
