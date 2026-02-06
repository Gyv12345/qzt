#!/bin/bash
set -e

PROJECT_DIR="$CLAUDE_PROJECT_DIR"
ERROR_LOG="$PROJECT_DIR/.claude/lint-errors.log"

# 清空之前的错误日志
> "$ERROR_LOG"

# 解析输入获取文件路径
FILE_PATH=$(jq -r '.tool_input.file_path // .tool_input.filePath // empty' 2>/dev/null || echo "")

# 如果没有文件路径，退出
if [[ -z "$FILE_PATH" ]]; then
    exit 0
fi

# 只处理项目内的文件
if [[ "$FILE_PATH" != "$PROJECT_DIR"* ]]; then
    exit 0
fi

# 判断是前端还是后端文件
if [[ "$FILE_PATH" == *"/frontend/"* ]]; then
    cd "$PROJECT_DIR/frontend"

    # 运行 lint（非阻塞，记录错误）
    pnpm lint 2>&1 | tee -a "$ERROR_LOG" || true

    # 运行 format
    pnpm format 2>&1 || true

elif [[ "$FILE_PATH" == *"/backend/"* ]]; then
    cd "$PROJECT_DIR/backend"

    # 运行 lint（非阻塞，记录错误）
    pnpm lint 2>&1 | tee -a "$ERROR_LOG" || true

    # 运行 format
    pnpm format 2>&1 || true
fi

# 如果有错误，输出到 stderr（会被 hook 系统捕获）
if [ -s "$ERROR_LOG" ]; then
    echo "
## Lint 错误记录

文件: $FILE_PATH

\`\`\`
$(cat "$ERROR_LOG")
\`\`\`
" >&2
    rm "$ERROR_LOG"
fi

exit 0
