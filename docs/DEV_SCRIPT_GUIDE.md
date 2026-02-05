# 开发环境脚本使用指南

## 功能特性

✅ **字符集支持**：自动设置 UTF-8 编码，避免中文乱码
✅ **服务管理**：启动、停止、重启开发环境
✅ **状态监控**：实时查看服务运行状态
✅ **日志管理**：自动生成带时间戳的日志文件
✅ **智能检测**：避免重复启动，端口冲突检测

## 使用方法

### 1. 启动开发环境
```bash
./start-dev.sh
# 或
./start-dev.sh start
```

### 2. 停止开发环境
```bash
./start-dev.sh stop
```

### 3. 重启开发环境
```bash
./start-dev.sh restart
```

### 4. 查看运行状态
```bash
./start-dev.sh status
```

### 5. 查看日志列表
```bash
./start-dev.sh logs
```

### 6. 显示帮助
```bash
./start-dev.sh help
```

## 日志管理

### 日志文件位置
```
logs/
├── backend_20250205_143022.log    # 带时间戳的历史日志
├── frontend_20250205_143022.log
├── backend_latest.log             # 最新日志（软链接）
└── frontend_latest.log
```

### 实时查看日志
```bash
# 查看后端日志
tail -f logs/backend_latest.log

# 查看前端日志
tail -f logs/frontend_latest.log
```

## 端口配置

| 服务 | 默认端口 | 协议 | 用途 |
|------|---------|------|------|
| 后端 | 7890 | HTTP | NestJS API |
| 前端 | 3456 | HTTP | Vite Dev Server |

## 技术细节

### 字符集处理
```bash
export LANG=zh_CN.UTF-8      # 设置语言为中文
export LC_ALL=zh_CN.UTF-8    # 设置所有本地化为 UTF-8
```

### 进程检测
```bash
# 检查端口是否被占用
lsof -Pi :$PORT -sTCP:LISTEN -t

# 获取端口对应的 PID
lsof -ti :$PORT
```

### 优雅停止
```bash
# 发送 TERM 信号（允许进程清理资源）
kill -TERM $PID

# 等待 10 秒后强制停止
kill -9 $PID
```
