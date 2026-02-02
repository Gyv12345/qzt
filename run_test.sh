#!/bin/bash

echo "🚀 正在启动前端服务器..."

cd frontend
pnpm run dev > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!

echo "✓ 前端服务器已启动 (PID: $FRONTEND_PID)"
echo "⏳ 等待服务器启动..."

# 等待最多 60 秒让服务器启动
for i in {1..60}; do
  if lsof -i :7890 > /dev/null 2>&1; then
    echo "✅ 服务器已在端口 7890 上启动"
    sleep 3  # 额外等待确保应用完全加载
    echo ""
    echo "📋 前端日志 (最后 20 行):"
    tail -20 /tmp/frontend.log
    echo ""
    echo "🧪 开始运行测试..."
    cd ..
    python3 test_login.py
    TEST_EXIT_CODE=$?

    echo ""
    echo "🛑 停止前端服务器..."
    kill $FRONTEND_PID 2>/dev/null
    exit $TEST_EXIT_CODE
  fi
  sleep 1
  echo -n "."
done

echo ""
echo "❌ 服务器启动超时"
echo "📋 错误日志:"
cat /tmp/frontend.log
kill $FRONTEND_PID 2>/dev/null
exit 1
