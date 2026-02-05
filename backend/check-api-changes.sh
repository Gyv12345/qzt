#!/bin/bash
# 后端 API 变更检查脚本
# 修改 API 后运行此脚本，通知前端更新

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== 后端 API 变更通知 ===${NC}\n"

# 1. 检查是否有 Controller 文件被修改
echo -e "${YELLOW}1️⃣  检查修改的 Controller...${NC}"

MODIFIED_CONTROLLERS=$(git diff --name-only HEAD~1 HEAD 2>/dev/null | grep -E "controller\.ts$" || true)
CURRENT_MODIFIED=$(git diff --name-only | grep -E "controller\.ts$" || true)

if [ -z "$MODIFIED_CONTROLLERS" ] && [ -z "$CURRENT_MODIFIED" ]; then
    echo -e "${GREEN}✅ 未检测到 Controller 修改${NC}\n"
else
    echo -e "${YELLOW}📝 以下 Controller 已修改：${NC}"
    echo "$MODIFIED_CONTROLLERS" "$CURRENT_MODIFIED" | sed 's/^/  - /'
    echo ""
fi

# 2. 检查 Swagger 文档
echo -e "${YELLOW}2️⃣  检查 Swagger 文档...${NC}"

if ! curl -s http://localhost:7890/api-docs-json > /dev/null; then
    echo -e "${RED}❌ 后端服务未运行！${NC}"
    echo -e "${YELLOW}请先启动后端服务${NC}\n"
    exit 1
fi

echo -e "${GREEN}✅ Swagger 文档可访问${NC}"
echo -e "   URL: ${BLUE}http://localhost:7890/api-docs-json${NC}\n"

# 3. 提取 API Tags
echo -e "${YELLOW}3️⃣  当前 API 模块：${NC}"

API_TAGS=$(curl -s http://localhost:7890/api-docs-json | jq -r '.tags[]?.name' | sort)

echo -e "${GREEN}$API_TAGS${NC}" | sed 's/^/  - /'
echo ""

# 4. 检查是否使用了中文 Tags
echo -e "${YELLOW}4️⃣  ⚠️  检查 Tag 命名规范...${NC}"

CHINESE_TAGS=$(echo "$API_TAGS" | grep -E '[一-龥]' || true)

if [ -n "$CHINESE_TAGS" ]; then
    echo -e "${RED}❌ 发现中文 Tag！${NC}"
    echo -e "${RED}$CHINESE_TAGS${NC}" | sed 's/^/  - /'
    echo ""
    echo -e "${YELLOW}请修改为英文 Tag：${NC}"
    echo -e "  @ApiTags('客户管理') → ${GREEN}@ApiTags('customers')${NC}"
    echo ""
    exit 1
else
    echo -e "${GREEN}✅ Tag 命名符合规范${NC}\n"
fi

# 5. 前端需要执行的操作
echo -e "${YELLOW}5️⃣  📢 通知前端：${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}前端请执行以下操作：${NC}"
echo ""
echo -e "  1. 进入前端目录：${BLUE}cd frontend${NC}"
echo -e "  2. 生成 API 客户端：${BLUE}pnpm run generate:api${NC}"
echo -e "  3. 检查新生成的类型文件：${BLUE}ls src/models/${NC}"
echo -e "  4. 在 ${YELLOW}src/services/api/index.ts${NC} 中导入新模块"
echo -e "  5. 使用新 API 时查看类型定义"
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# 6. 快速测试
echo -e "${YELLOW}6️⃣  🔍 测试 API：${NC}"
echo -e "  查看 Swagger UI: ${BLUE}http://localhost:7890/api-docs${NC}"
echo -e "  测试特定接口: ${BLUE}curl http://localhost:7890/api/<endpoint>${NC}"
echo ""

echo -e "${GREEN}✅ 检查完成！${NC}\n"
