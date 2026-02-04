#!/bin/bash
#
# 企账通后端API测试生成和运行脚本
#

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 获取脚本所在目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}企账通后端API测试工具${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 检查API文档
API_DOC="/tmp/qzt-api-docs.json"
if [ ! -f "$API_DOC" ]; then
    echo -e "${YELLOW}⚠️  API文档不存在，正在下载...${NC}"
    curl -s http://localhost:7890/api-docs-json -o "$API_DOC"
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ API文档下载成功${NC}"
    else
        echo -e "${RED}❌ 无法下载API文档，请确保后端服务正在运行${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ API文档已存在${NC}"
fi

# 显示菜单
echo ""
echo -e "${BLUE}请选择操作:${NC}"
echo "1) 生成测试文件"
echo "2) 运行所有测试"
echo "3) 运行指定模块测试"
echo "4) 列出所有可用模块"
echo "5) 生成并运行所有测试"
echo "6) 清理生成的测试文件"
echo "0) 退出"
echo ""
read -p "请输入选项 [0-6]: " choice

case $choice in
    1)
        echo -e "${BLUE}正在生成测试文件...${NC}"
        cd utils
        python3 api_parser.py "$API_DOC" ../modules/
        ;;
    2)
        echo -e "${BLUE}正在运行所有测试...${NC}"
        python3 run_all_tests.py
        ;;
    3)
        read -p "请输入模块名称 (如: customer, product): " module
        echo -e "${BLUE}正在运行 ${module} 模块测试...${NC}"
        python3 run_all_tests.py --module "$module"
        ;;
    4)
        python3 run_all_tests.py --list
        ;;
    5)
        echo -e "${BLUE}正在生成测试文件...${NC}"
        cd utils
        python3 api_parser.py "$API_DOC" ../modules/
        cd ..
        echo -e "${BLUE}正在运行所有测试...${NC}"
        python3 run_all_tests.py
        ;;
    6)
        echo -e "${YELLOW}正在清理生成的测试文件...${NC}"
        rm -f modules/*.py
        echo -e "${GREEN}✅ 清理完成${NC}"
        ;;
    0)
        echo "退出"
        exit 0
        ;;
    *)
        echo -e "${RED}❌ 无效的选项${NC}"
        exit 1
        ;;
esac
