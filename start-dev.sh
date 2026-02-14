#!/bin/bash

# 启动开发环境脚本

# 设置字符集为 UTF-8
export LANG=zh_CN.UTF-8
export LC_ALL=zh_CN.UTF-8

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 检查进程是否运行
is_running() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        return 0
    else
        return 1
    fi
}

# 获取端口对应的 PID
get_pid_by_port() {
    lsof -ti :$1 2>/dev/null
}

# 停止服务
stop_service() {
    local SERVICE_NAME=$1
    local PORT=$2

    if is_running $PORT; then
        local PID=$(get_pid_by_port $PORT)
        echo -e "${YELLOW}⚠ 停止 ${SERVICE_NAME} (PID: ${PID}, 端口: ${PORT})${NC}"
        kill -TERM $PID 2>/dev/null

        # 等待进程结束（最多10秒）
        for i in {1..10}; do
            if ! is_running $PORT; then
                echo -e "${GREEN}✓ ${SERVICE_NAME} 已停止${NC}"
                return 0
            fi
            sleep 1
        done

        # 如果还没停止，强制杀死
        if is_running $PORT; then
            echo -e "${RED}⚠ 强制停止 ${SERVICE_NAME}${NC}"
            kill -9 $PID 2>/dev/null
            sleep 1
        fi
    else
        echo -e "${CYAN}ℹ ${SERVICE_NAME} 未运行${NC}"
    fi
}

# 显示使用说明
show_usage() {
    echo -e "${CYAN}================================${NC}"
    echo -e "${CYAN}   开发环境管理脚本${NC}"
    echo -e "${CYAN}================================${NC}"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  start     启动开发环境（默认）"
    echo "  stop      停止开发环境"
    echo "  restart   重启开发环境"
    echo "  status    查看运行状态"
    echo "  logs      查看日志"
    echo "  help      显示此帮助信息"
    echo ""
    echo "端口配置:"
    echo "  后端: 7890"
    echo "  前端: 3456"
    echo ""
}

# 查看运行状态
show_status() {
    echo -e "${CYAN}================================${NC}"
    echo -e "${CYAN}   运行状态${NC}"
    echo -e "${CYAN}================================${NC}"
    echo ""

    # 检查后端
    BACKEND_PORT=7890
    if is_running $BACKEND_PORT; then
        BACKEND_PID=$(get_pid_by_port $BACKEND_PORT)
        echo -e "${GREEN}✓ 后端运行中${NC}"
        echo "  端口: $BACKEND_PORT"
        echo "  PID:  $BACKEND_PID"
        echo "  URL:  http://localhost:$BACKEND_PORT"
    else
        echo -e "${RED}✗ 后端未运行${NC}"
        echo "  端口: $BACKEND_PORT"
    fi
    echo ""

    # 检查前端
    FRONTEND_PORT=3456
    if is_running $FRONTEND_PORT; then
        FRONTEND_PID=$(get_pid_by_port $FRONTEND_PORT)
        echo -e "${GREEN}✓ 前端运行中${NC}"
        echo "  端口: $FRONTEND_PORT"
        echo "  PID:  $FRONTEND_PID"
        echo "  URL: http://localhost:$FRONTEND_PORT"
    else
        echo -e "${RED}✗ 前端未运行${NC}"
        echo "  端口: $FRONTEND_PORT"
    fi
    echo ""
}

# 查看日志
show_logs() {
    local LOG_DIR="$ROOT_DIR/logs"

    if [ ! -d "$LOG_DIR" ] || [ -z "$(ls -A $LOG_DIR 2>/dev/null)" ]; then
        echo -e "${YELLOW}⚠ 未找到日志文件${NC}"
        return 1
    fi

    echo -e "${CYAN}================================${NC}"
    echo -e "${CYAN}   可用日志文件${NC}"
    echo -e "${CYAN}================================${NC}"
    echo ""

    ls -lht "$LOG_DIR" | head -20
    echo ""
    echo "实时查看日志:"
    echo "  后端: tail -f $LOG_DIR/backend_latest.log"
    echo "  前端: tail -f $LOG_DIR/frontend_latest.log"
}

# 项目根目录
ROOT_DIR="/Users/shichenyang/WebstormProjects/qzt"
cd "$ROOT_DIR" || exit 1

# 日志目录
LOG_DIR="$ROOT_DIR/logs"
mkdir -p "$LOG_DIR"

# 日志文件（带时间戳）
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKEND_LOG="$LOG_DIR/backend_${TIMESTAMP}.log"
FRONTEND_LOG="$LOG_DIR/frontend_${TIMESTAMP}.log"

# 最新日志的软链接
BACKEND_LOG_LATEST="$LOG_DIR/backend_latest.log"
FRONTEND_LOG_LATEST="$LOG_DIR/frontend_latest.log"

# 主命令处理
COMMAND=${1:-start}

case "$COMMAND" in
    start)
        echo -e "${CYAN}================================${NC}"
        echo -e "${CYAN}   启动开发环境${NC}"
        echo -e "${CYAN}================================${NC}"
        echo ""

        # 检查后端（默认端口7890）
        BACKEND_PORT=7890
        if is_running $BACKEND_PORT; then
            echo -e "${YELLOW}⚠ 后端已在端口 $BACKEND_PORT 运行，跳过启动${NC}"
        else
            echo -e "${GREEN}▶ 启动后端服务...${NC}"
            cd "$ROOT_DIR/backend"
            # 使用 UTF-8 编码重定向日志
            pnpm run start:dev > "$BACKEND_LOG" 2>&1 &
            BACKEND_PID=$!
            ln -sf "$(basename "$BACKEND_LOG")" "$BACKEND_LOG_LATEST"
            echo "  PID: $BACKEND_PID"
            echo "  日志: $BACKEND_LOG_LATEST"

            # 等待后端启动
            for i in {1..30}; do
                if is_running $BACKEND_PORT; then
                    echo -e "${GREEN}✓ 后端启动成功 (端口 $BACKEND_PORT)${NC}"
                    break
                fi
                sleep 1
            done
        fi

        echo ""

        # 检查前端（默认端口3456）
        FRONTEND_PORT=3456
        if is_running $FRONTEND_PORT; then
            echo -e "${YELLOW}⚠ 前端已在端口 $FRONTEND_PORT 运行，跳过启动${NC}"
        else
            echo -e "${GREEN}▶ 启动前端服务...${NC}"
            cd "$ROOT_DIR/frontend"
            # 使用 UTF-8 编码重定向日志
            pnpm run dev > "$FRONTEND_LOG" 2>&1 &
            FRONTEND_PID=$!
            ln -sf "$(basename "$FRONTEND_LOG")" "$FRONTEND_LOG_LATEST"
            echo "  PID: $FRONTEND_PID"
            echo "  日志: $FRONTEND_LOG_LATEST"

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
        echo -e "${CYAN}================================${NC}"
        echo -e "${GREEN}✓ 开发环境启动完成${NC}"
        echo -e "${CYAN}================================${NC}"
        echo ""
        echo -e "${BLUE}🌐 服务地址:${NC}"
        echo "  后端: http://localhost:$BACKEND_PORT"
        echo "  前端: http://localhost:$FRONTEND_PORT"
        echo ""
        echo -e "${BLUE}📝 查看日志:${NC}"
        echo "  后端: tail -f $BACKEND_LOG_LATEST"
        echo "  前端: tail -f $FRONTEND_LOG_LATEST"
        echo ""
        ;;

    stop)
        echo -e "${CYAN}================================${NC}"
        echo -e "${CYAN}   停止开发环境${NC}"
        echo -e "${CYAN}================================${NC}"
        echo ""

        stop_service "后端" 7890
        echo ""
        stop_service "前端" 3456

        echo ""
        echo -e "${GREEN}✓ 开发环境已停止${NC}"
        echo ""
        ;;

    restart)
        echo -e "${CYAN}================================${NC}"
        echo -e "${CYAN}   重启开发环境${NC}"
        echo -e "${CYAN}================================${NC}"
        echo ""

        stop_service "后端" 7890
        echo ""
        stop_service "前端" 3456

        echo ""
        echo -e "${YELLOW}等待 2 秒后重启...${NC}"
        sleep 2
        echo ""

        # 重新执行启动逻辑
        $0 start
        ;;

    status)
        show_status
        ;;

    logs)
        show_logs
        ;;

    help|--help|-h)
        show_usage
        ;;

    *)
        echo -e "${RED}✗ 未知命令: $COMMAND${NC}"
        echo ""
        show_usage
        exit 1
        ;;
esac
