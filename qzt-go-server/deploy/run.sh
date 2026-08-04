#!/bin/bash
#
# QZT Go Server 启停脚本
# 用法: ./deploy/run.sh {start|stop|restart|status|build|logs}
#
# PID 管理: bin/qzt-server.pid
# 日志:     logs/stdout.log (stdout/stderr 合并)
# 优雅退出: SIGTERM → Go 服务 graceful shutdown(main.go 监听信号)
#

set -euo pipefail

# ── 路径(相对于项目根) ──
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

APP_NAME="qzt-server"
BIN_PATH="$PROJECT_DIR/bin/$APP_NAME"
PID_FILE="$PROJECT_DIR/bin/$APP_NAME.pid"
LOG_DIR="$PROJECT_DIR/logs"
STDOUT_LOG="$LOG_DIR/stdout.log"
CONFIG_DIR="$PROJECT_DIR/config"
ENV_FILE="$PROJECT_DIR/.env"

# ── 颜色 ──
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; }

# ── 加载 .env ──
load_env() {
    if [ -f "$ENV_FILE" ]; then
        set -a
        # shellcheck disable=SC1090
        . "$ENV_FILE"
        set +a
        info "已加载 .env"
    fi
}

# ── 获取运行中的 PID ──
get_pid() {
    if [ -f "$PID_FILE" ]; then
        local pid
        pid=$(cat "$PID_FILE" 2>/dev/null || echo "")
        if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
            echo "$pid"
            return 0
        fi
        # PID 文件存在但进程已死,清理
        rm -f "$PID_FILE"
    fi
    return 1
}

# ── 命令 ──

cmd_build() {
    info "编译 $APP_NAME ..."
    mkdir -p "$(dirname "$BIN_PATH")"
    cd "$PROJECT_DIR"
    go build -o "$BIN_PATH" ./cmd/server
    info "编译完成: $BIN_PATH"
}

cmd_start() {
    # 检查是否已在运行
    if pid=$(get_pid); then
        warn "$APP_NAME 已在运行 (PID: $pid)"
        exit 0
    fi

    # 检查二进制
    if [ ! -f "$BIN_PATH" ]; then
        warn "二进制不存在,先编译..."
        cmd_build
    fi

    load_env
    mkdir -p "$LOG_DIR"

    info "启动 $APP_NAME ..."
    nohup "$BIN_PATH" -config "$CONFIG_DIR" -log "$LOG_DIR" >> "$STDOUT_LOG" 2>&1 &
    local pid=$!
    echo "$pid" > "$PID_FILE"

    # 等待启动(检查进程存活)
    sleep 2
    if kill -0 "$pid" 2>/dev/null; then
        info "$APP_NAME 启动成功 (PID: $pid)"
        info "日志: $STDOUT_LOG"
    else
        error "$APP_NAME 启动失败,请检查日志: $STDOUT_LOG"
        tail -20 "$STDOUT_LOG" 2>/dev/null
        rm -f "$PID_FILE"
        exit 1
    fi
}

cmd_stop() {
    if ! pid=$(get_pid); then
        warn "$APP_NAME 未在运行"
        exit 0
    fi

    info "停止 $APP_NAME (PID: $pid)..."
    kill -SIGTERM "$pid"

    # 等待优雅退出(最多 15 秒)
    local count=0
    while kill -0 "$pid" 2>/dev/null; do
        count=$((count + 1))
        if [ $count -ge 15 ]; then
            warn "优雅退出超时,强制终止..."
            kill -SIGKILL "$pid" 2>/dev/null || true
            sleep 1
            break
        fi
        sleep 1
    done

    rm -f "$PID_FILE"
    info "$APP_NAME 已停止"
}

cmd_restart() {
    cmd_stop
    sleep 1
    cmd_start
}

cmd_status() {
    if pid=$(get_pid); then
        info "$APP_NAME 运行中 (PID: $pid)"
        # 显示进程资源占用
        ps -p "$pid" -o pid,ppid,%cpu,%mem,rss,etime,args --no-headers 2>/dev/null || true
    else
        warn "$APP_NAME 未运行"
        exit 1
    fi
}

cmd_logs() {
    if [ -f "$STDOUT_LOG" ]; then
        info "实时日志 (Ctrl+C 退出):"
        tail -f "$STDOUT_LOG"
    else
        error "日志文件不存在: $STDOUT_LOG"
        exit 1
    fi
}

# ── 主入口 ──
case "${1:-}" in
    start)   cmd_start ;;
    stop)    cmd_stop ;;
    restart) cmd_restart ;;
    status)  cmd_status ;;
    build)   cmd_build ;;
    logs)    cmd_logs ;;
    *)
        echo "用法: $0 {start|stop|restart|status|build|logs}"
        echo ""
        echo "  start    编译(如需)+ 后台启动,写 PID 文件"
        echo "  stop     优雅停止(SIGTERM,15s 超时后 SIGKILL)"
        echo "  restart  stop + start"
        echo "  status   查看运行状态"
        echo "  build    编译到 bin/$APP_NAME"
        echo "  logs     实时查看 stdout 日志"
        exit 1
        ;;
esac
