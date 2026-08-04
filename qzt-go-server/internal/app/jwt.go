package app

import (
	"fmt"

	jwtpkg "qzt-go-server/pkg/xauth/jwt"

	"qzt-go-server/config"
)

// JwtManager 全局 JWT 管理器，登录/刷新/鉴权共用同一实例与密钥。
var JwtManager *jwtpkg.Manager

// InitJWT 根据 config.Jwt 构建 JWT 管理器。必须在 config 初始化后调用。
func InitJWT() error {
	cfg := config.Get().JWT
	mgr, err := jwtpkg.NewJwtManager(&jwtpkg.Config{
		JwtSecret:             cfg.JwtSecret,
		Issuer:                cfg.Issuer,
		AccessExpirationTime:  cfg.AccessExpirationTime,
		RefreshExpirationTime: cfg.RefreshExpirationTime,
	})
	if err != nil {
		return fmt.Errorf("init jwt manager failed: %w", err)
	}
	JwtManager = mgr
	return nil
}
