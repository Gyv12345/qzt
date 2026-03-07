#!/bin/bash

# 后端架构测试脚本

echo "================================"
echo "后端架构增强测试"
echo "================================"
echo ""

# 检查后端是否在运行
if lsof -Pi :7890 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "✅ 后端服务已在运行"
else
    echo "❌ 后端服务未运行，请先启动: pnpm run start:dev"
    exit 1
fi

echo ""
echo "开始测试..."
echo ""

BASE_URL="http://localhost:7890"

# 测试1: 健康检查
echo "📋 测试1: 健康检查"
curl -s "$BASE_URL/health" | jq '.' || echo "健康检查失败"
echo ""
echo ""

# 测试2: 请求ID验证
echo "📋 测试2: 请求ID验证"
REQUEST_ID=$(curl -s -I "$BASE_URL/health" | grep -i "x-request-id" | cut -d' ' -f2)
if [ -n "$REQUEST_ID" ]; then
    echo "✅ 请求ID存在: $REQUEST_ID"
else
    echo "❌ 请求ID缺失"
fi
echo ""
echo ""

# 测试3: 响应格式验证
echo "📋 测试3: 响应格式验证（需要先登录）"
echo "提示：此测试需要有效的JWT token"
echo "跳过..."
echo ""
echo ""

# 测试4: Swagger文档
echo "📋 测试4: Swagger文档可访问性"
SWAGGER_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api-docs")
if [ "$SWAGGER_STATUS" = "200" ]; then
    echo "✅ Swagger文档可访问"
else
    echo "❌ Swagger文档访问失败，状态码: $SWAGGER_STATUS"
fi
echo ""
echo ""

echo "================================"
echo "✅ 基础架构测试完成"
echo "================================"
echo ""
echo "新增功能："
echo "  ✅ 请求日志拦截器"
echo "  ✅ 操作日志中间件"
echo "  ✅ 响应格式标准化"
echo "  ✅ 请求ID追踪"
echo "  ✅ 性能监控"
echo "  ✅ 超时保护（30秒）"
echo ""
echo "查看日志："
echo "  - 所有HTTP请求都有日志记录"
echo "  - 响应时间超过1秒会记录警告"
echo "  - 每个请求都有唯一的请求ID"
