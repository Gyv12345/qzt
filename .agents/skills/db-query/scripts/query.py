#!/usr/bin/env python3
"""
数据库只读查询脚本

安全限制：
- 仅允许 SELECT, SHOW, DESCRIBE, EXPLAIN
- 禁止 INSERT, UPDATE, DELETE, DROP, CREATE, ALTER, TRUNCATE, REPLACE

使用方式：
    python3 query.py "SELECT * FROM users LIMIT 5"
    python3 query.py --tables          # 列出所有表
    python3 query.py --schema users    # 查看表结构
    python3 query.py --config          # 显示配置
"""

import os
import re
import sys
import yaml
import sqlite3
from pathlib import Path

# 技能目录
SKILL_DIR = Path(__file__).parent.parent
CONFIG_PATH = SKILL_DIR / "assets" / "db-config.yaml"

# 禁止的 SQL 关键词（写操作）
FORBIDDEN_KEYWORDS = [
    r'\bINSERT\b', r'\bUPDATE\b', r'\bDELETE\b', r'\bDROP\b',
    r'\bCREATE\b', r'\bALTER\b', r'\bTRUNCATE\b', r'\bREPLACE\b',
    r'\bMERGE\b', r'\bGRANT\b', r'\bREVOKE\b', r'\bEXEC\b'
]

# 允许的开头
ALLOWED_PREFIXES = ['SELECT', 'SHOW', 'DESCRIBE', 'DESC', 'EXPLAIN', 'PRAGMA']


def load_config():
    """加载配置文件"""
    if not CONFIG_PATH.exists():
        print(f"❌ 配置文件不存在: {CONFIG_PATH}")
        print("\n请创建配置文件 assets/db-config.yaml:")
        print("""
database:
  type: sqlite
  sqlite:
    path: /path/to/your/dev.db
""")
        sys.exit(1)

    with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
        return yaml.safe_load(f)


def validate_query(sql: str) -> tuple:
    """验证 SQL 是否为安全的只读查询"""
    sql_upper = sql.upper().strip()

    # 检查是否以允许的前缀开头
    is_allowed = any(sql_upper.startswith(prefix) for prefix in ALLOWED_PREFIXES)
    if not is_allowed:
        return False, "仅允许 SELECT, SHOW, DESCRIBE, EXPLAIN 查询"

    # 检查禁止的关键词
    for pattern in FORBIDDEN_KEYWORDS:
        if re.search(pattern, sql_upper):
            return False, "检测到禁止的写操作关键词"

    return True, None


def get_sqlite_connection(config):
    """获取 SQLite 连接"""
    db_path = Path(config['database']['sqlite']['path'])
    if not db_path.exists():
        raise FileNotFoundError(f"数据库文件不存在: {db_path}")

    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    return conn


def get_mysql_connection(config):
    """获取 MySQL 连接"""
    try:
        import mysql.connector
    except ImportError:
        print("❌ 缺少 mysql-connector-python，请安装: pip install mysql-connector-python")
        sys.exit(1)

    mysql_config = config['database']['mysql']
    return mysql.connector.connect(
        host=mysql_config['host'],
        port=mysql_config.get('port', 3306),
        database=mysql_config['database'],
        user=mysql_config['user'],
        password=mysql_config['password']
    )


def get_connection(config):
    """获取数据库连接"""
    db_type = config['database']['type']

    if db_type == 'sqlite':
        return get_sqlite_connection(config)
    elif db_type == 'mysql':
        return get_mysql_connection(config)
    else:
        raise ValueError(f"不支持的数据库类型: {db_type}")


def show_config(config):
    """显示当前配置"""
    print("📋 当前配置:")
    print("-" * 40)
    print(f"  类型: {config['database']['type']}")

    if config['database']['type'] == 'sqlite':
        path = config['database']['sqlite']['path']
        exists = "✅" if Path(path).exists() else "❌"
        print(f"  路径: {path} {exists}")
    elif config['database']['type'] == 'mysql':
        mysql = config['database'].get('mysql', {})
        print(f"  主机: {mysql.get('host', 'N/A')}")
        print(f"  端口: {mysql.get('port', 3306)}")
        print(f"  数据库: {mysql.get('database', 'N/A')}")


def list_tables(config):
    """列出所有表"""
    conn = get_connection(config)
    cursor = conn.cursor()
    db_type = config['database']['type']

    if db_type == 'sqlite':
        cursor.execute("""
            SELECT name FROM sqlite_master
            WHERE type='table' AND name NOT LIKE 'sqlite_%'
            ORDER BY name
        """)
    else:
        cursor.execute("SHOW TABLES")

    tables = [row[0] for row in cursor.fetchall()]
    conn.close()

    print(f"📊 数据库表 ({len(tables)} 个):")
    print("-" * 40)
    for table in tables:
        print(f"  - {table}")


def show_schema(config, table_name):
    """显示表结构"""
    conn = get_connection(config)
    cursor = conn.cursor()
    db_type = config['database']['type']

    if db_type == 'sqlite':
        cursor.execute(f"PRAGMA table_info({table_name})")
        columns = cursor.fetchall()
        print(f"📋 表结构: {table_name}")
        print("-" * 60)
        print(f"{'字段':<20} {'类型':<15} {'非空':<6} {'默认值':<10}")
        print("-" * 60)
        for col in columns:
            name = col[1]
            dtype = col[2]
            notnull = "是" if col[3] else "否"
            default = str(col[4]) if col[4] else "NULL"
            print(f"{name:<20} {dtype:<15} {notnull:<6} {default:<10}")
    else:
        cursor.execute(f"DESCRIBE {table_name}")
        columns = cursor.fetchall()
        print(f"📋 表结构: {table_name}")
        print("-" * 70)
        print(f"{'字段':<20} {'类型':<20} {'允许空':<8} {'键':<10}")
        print("-" * 70)
        for col in columns:
            print(f"{col[0]:<20} {col[1]:<20} {col[2]:<8} {col[3] or '':<10}")

    conn.close()


def execute_query(config, sql: str):
    """执行只读查询"""
    # 验证查询安全性
    is_valid, error = validate_query(sql)
    if not is_valid:
        print(f"❌ 安全限制: {error}")
        print("仅允许执行 SELECT, SHOW, DESCRIBE, EXPLAIN 查询")
        sys.exit(1)

    conn = get_connection(config)
    cursor = conn.cursor()

    try:
        cursor.execute(sql)

        # 获取列名
        columns = [description[0] for description in cursor.description]

        # 获取结果
        rows = cursor.fetchall()

        # 输出结果
        if rows:
            # 表头
            header = " | ".join(columns)
            print(header)
            print("-" * len(header))

            # 数据行
            for row in rows:
                values = []
                for i, col in enumerate(columns):
                    val = row[i] if hasattr(row, '__getitem__') else getattr(row, col, row[i])
                    values.append(str(val) if val is not None else "NULL")
                print(" | ".join(values))

            print(f"\n✅ 共 {len(rows)} 条记录")
        else:
            print("📭 查询结果为空")

    except Exception as e:
        print(f"❌ SQL 执行错误: {e}")
        sys.exit(1)
    finally:
        conn.close()


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(0)

    config = load_config()
    arg = sys.argv[1]

    if arg == "--config" or arg == "-c":
        show_config(config)
    elif arg == "--tables" or arg == "-t":
        list_tables(config)
    elif arg == "--schema" or arg == "-s":
        if len(sys.argv) < 3:
            print("用法: python3 query.py --schema <表名>")
            sys.exit(1)
        show_schema(config, sys.argv[2])
    else:
        execute_query(config, arg)


if __name__ == "__main__":
    main()
