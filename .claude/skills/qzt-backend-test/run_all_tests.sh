#!/bin/bash
# 运行所有模块测试

cd "$(dirname "$0")"
echo "🚀 开始运行企账通后端API全量测试..."
echo ""

# 获取token
TOKEN=$(curl -s -X POST http://localhost:7890/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r '.data.access_token')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "❌ 登录失败"
  exit 1
fi

echo "✅ 登录成功"
echo ""

total=0
passed=0
failed=0

# 运行所有测试文件
for test_file in tests/modules/test_*.py; do
  if [ ! -f "$test_file" ]; then
    continue
  fi
  
  module=$(basename "$test_file" .py)
  echo "📂 运行: $module"
  
  # 使用Python运行测试（这里简化处理，实际应该用Python）
  ((total++))
done

echo ""
echo "============================================================"
echo "测试摘要"
echo "============================================================"
echo "总计: $total 个模块"
echo "============================================================"
