package model

// migrate.go
// AutoMigrate 和 SeedData 均已移除。
// 所有建表 DDL + 种子数据(菜单/API/字典/超管账号等)一律走 docs/sql/ 下的 SQL 文件,
// 由用户手动执行。Go 代码不再自动建表或写种子(遵循 AGENTS.md 约定)。
