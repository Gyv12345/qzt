#!/bin/bash
# 前后端 API 一致性检查脚本
# 开发新模块前运行此脚本，确保前后端契约一致

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== QZT 前后端 API 一致性检查 ===${NC}\n"

# 1. 检查后端是否在运行
echo -e "${YELLOW}1️⃣  检查后端服务...${NC}"
if ! curl -s http://localhost:7890/api-docs-json > /dev/null; then
    echo -e "${RED}❌ 后端服务未运行！${NC}"
    echo -e "${YELLOW}请先启动后端：cd backend && pnpm run start:dev${NC}"
    exit 1
fi
echo -e "${GREEN}✅ 后端服务运行中${NC}\n"

# 2. 生成 API 客户端
echo -e "${YELLOW}2️⃣  生成 API 客户端...${NC}"
pnpm run generate:api > /dev/null 2>&1
echo -e "${GREEN}✅ API 客户端已生成${NC}\n"

# 3. 检查是否有新生成的类型文件
echo -e "${YELLOW}3️⃣  检查类型定义...${NC}"

# 统计 models 文件数量
MODEL_COUNT=$(find src/models -name '*.ts' 2>/dev/null | wc -l)
echo -e "${GREEN}✅ 当前共有 ${MODEL_COUNT} 个类型文件${NC}\n"

# 4. 提示关键检查点
echo -e "${YELLOW}4️⃣  ⚠️  开发前必读：${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}前端开发流程：${NC}"
echo -e "  1. 运行此脚本确保 API 已更新"
echo -e "  2. 查看生成的类型：${YELLOW}src/services/api/<模块>.ts${NC}"
echo -e "  3. 查看类型定义：${YELLOW}src/models/<类型>.ts${NC}"
echo -e "  4. 使用 ${YELLOW}getScrmApi()${NC} 调用接口"
echo -e "  5. 如果类型/字段缺失 → 找后端补充"
echo ""
echo -e "${GREEN}后端开发流程：${NC}"
echo -e "  1. 使用 ${YELLOW}@ApiTags('英文标签')${NC} 定义模块名"
echo -e "  2. 使用 ${YELLOW}@ApiQuery()${NC} 定义查询参数"
echo -e "  3. 确保 Swagger 文档准确（端口 7890）"
echo -e "  4. 运行前端 ${YELLOW}pnpm run generate:api${NC}"
echo -e "  5. 如果前端需要额外字段 → 补充 DTO 定义"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# 5. 常见错误提示
echo -e "${YELLOW}5️⃣  🔍 常见陷阱：${NC}"
echo -e "  ❌ 假设所有 API 都返回 ${RED}items${NC} 字段"
echo -e "  ❌ 传递后端不支持的参数"
echo -e "  ❌ 忘记在 ${YELLOW}src/services/api/index.ts${NC} 中导出新模块"
echo -e "  ❌ 使用 ${RED}require()${NC} 而非 ${GREEN}import${NC}\n"

# 6. 快速验证命令
echo -e "${YELLOW}6️⃣  📝 验证命令：${NC}"
echo -e "  查看后端 Swagger: ${GREEN}curl http://localhost:7890/api-docs-json | jq${NC}"
echo -e "  重新生成 API:   ${GREEN}pnpm run generate:api${NC}"
echo -e "  检查类型定义:   ${GREEN}ls src/models/ | head${NC}"
echo ""

echo -e "${GREEN}✅ 检查完成！可以开始开发了${NC}\n"
