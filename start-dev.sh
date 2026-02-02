#!/bin/bash

# 启动开发环境脚本

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 检查进程是否运行
is_running() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        return 0
    else
        return 1
    fi
}

# 项目根目录
ROOT_DIR="/Users/shichenyang/WebstormProjects/qzt"
cd "$ROOT_DIR" || exit 1

echo "================================"
echo "   启动开发环境"
echo "================================"

# 检查后端（默认端口7890）
BACKEND_PORT=7890
if is_running $BACKEND_PORT; then
    echo -e "${YELLOW}⚠ 后端已在端口 $BACKEND_PORT 运行，跳过启动${NC}"
else
    echo -e "${GREEN}▶ 启动后端服务...${NC}"
    cd "$ROOT_DIR/backend"
    pnpm run start:dev > /tmp/backend.log 2>&1 &
    BACKEND_PID=$!
    echo "后端 PID: $BACKEND_PID"
    echo "日志: tail -f /tmp/backend.log"

    # 等待后端启动
    for i in {1..30}; do
        if is_running $BACKEND_PORT; then
            echo -e "${GREEN}✓ 后端启动成功 (端口 $BACKEND_PORT)${NC}"
            break
        fi
        sleep 1
    done
fi

# 检查前端（默认端口3456）
FRONTEND_PORT=3456
if is_running $FRONTEND_PORT; then
    echo -e "${YELLOW}⚠ 前端已在端口 $FRONTEND_PORT 运行，跳过启动${NC}"
else
    echo -e "${GREEN}▶ 启动前端服务...${NC}"
    cd "$ROOT_DIR/frontend"
    pnpm run dev > /tmp/frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo "前端 PID: $FRONTEND_PID"
    echo "日志: tail -f /tmp/frontend.log"

    # 等待前端启动
    for i in {1..30}; do
        if is_running $FRONTEND_PORT; then
            echo -e "${GREEN}✓ 前端启动成功 (端口 $FRONTEND_PORT)${NC}"
            break
        fi
        sleep 1
    done
fi

echo ""
echo "================================"
echo -e "${GREEN}✓ 开发环境启动完成${NC}"
echo "================================"
echo "后端: http://localhost:$BACKEND_PORT"
echo "前端: http://localhost:$FRONTEND_PORT"
echo ""
echo "查看日志:"
echo "  后端: tail -f /tmp/backend.log"
echo "  前端: tail -f /tmp/frontend.log"
