package app

import (
	"fmt"

	"qzt-go-server/internal/model"
)

// AutoMigrate 同步所有 model 的表结构到数据库。
// 生产环境建议改用 docs/sql 下的版本化迁移脚本以保证可重复与可审计；
// AutoMigrate 仅用于开发与首次初始化的便捷建表。
// 远程 RDS 可能因网络抖动导致连接超时(invalid connection / i/o timeout),
// AutoMigrate 本身幂等,失败时重试最多 3 次——database/sql 会自动剔除坏连接,
// 重试时用新连接完成剩余表的迁移。
func AutoMigrate() error {
	if DB == nil {
		return fmt.Errorf("database not initialized")
	}
	var lastErr error
	for attempt := 1; attempt <= 3; attempt++ {
		if err := model.AutoMigrate(DB); err != nil {
			lastErr = err
			Log.Warnf("auto migrate 第 %d 次尝试失败(连接可能超时,将重试): %v", attempt, err)
			continue
		}
		return nil
	}
	return fmt.Errorf("auto migrate failed after 3 retries: %w", lastErr)
}

// SeedData 写入初始数据（超级管理员角色、超管用户、默认菜单与字典等）。
// 幂等：若关键数据已存在则跳过，可安全重复执行。
func SeedData() error {
	if DB == nil {
		return fmt.Errorf("database not initialized")
	}
	if err := model.SeedData(DB); err != nil {
		return fmt.Errorf("seed data failed: %w", err)
	}
	return nil
}

