package app

import (
	"fmt"
	"path/filepath"

	"github.com/casbin/casbin/v2"
	gormadapter "github.com/casbin/gorm-adapter/v3"
)

// Enforcer 全局 Casbin 鉴权器。策略持久化在 MySQL（通过 gorm-adapter），
// 内存副本在角色/菜单变更后由 service 显式调用 LoadPolicy() 刷新。
var Enforcer *casbin.Enforcer

// InitCasbin 使用 config/rbac_model.conf 与当前 DB 构建 Enforcer，并加载策略。
func InitCasbin(modelPath string) error {
	if modelPath == "" {
		modelPath = filepath.Join("config", "rbac_model.conf")
	}
	adapter, err := gormadapter.NewAdapterByDB(DB)
	if err != nil {
		return fmt.Errorf("create casbin adapter failed: %w", err)
	}
	enforcer, err := casbin.NewEnforcer(modelPath, adapter)
	if err != nil {
		return fmt.Errorf("create casbin enforcer failed: %w", err)
	}
	if err := enforcer.LoadPolicy(); err != nil {
		return fmt.Errorf("load casbin policy failed: %w", err)
	}
	Enforcer = enforcer
	return nil
}
