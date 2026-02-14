---
name: db-query
description: 数据库只读查询技能。执行安全的 SELECT 查询，禁止写操作。使用场景：(1) 查询数据库数据 (2) 调试数据问题 (3) 验证业务逻辑。首次使用需配置 assets/db-config.yaml。
---

# 数据库只读查询技能

## 快速开始

```bash
cd /path/to/skill
python3 scripts/query.py "SELECT * FROM users LIMIT 5"
python3 scripts/query.py --tables    # 列出所有表
python3 scripts/query.py --schema users  # 查看表结构
```

## 配置

首次使用需编辑 `assets/db-config.yaml`：

```yaml
database:
  type: sqlite  # sqlite | mysql
  path: /path/to/your/dev.db  # SQLite 路径
  # mysql:
  #   host: localhost
  #   port: 3306
  #   database: mydb
  #   user: root
  #   password: secret
```

## 安全限制

- ✅ 允许：SELECT, SHOW, DESCRIBE, EXPLAIN
- ❌ 禁止：INSERT, UPDATE, DELETE, DROP, CREATE, ALTER, TRUNCATE, REPLACE

## 命令说明

| 命令 | 说明 |
|------|------|
| `--tables`, `-t` | 列出所有表 |
| `--schema <表名>` | 查看表结构 |
| `--config` | 显示当前配置 |
| `<SQL语句>` | 执行 SELECT 查询 |

## 示例

```bash
# 查询用户
python3 scripts/query.py "SELECT id, username, name FROM users WHERE status='ACTIVE'"

# 关联查询
python3 scripts/query.py "SELECT c.name, COUNT(ct.id) as contact_count FROM customers c LEFT JOIN customer_contacts ct ON c.id = ct.customerId GROUP BY c.id"
```
