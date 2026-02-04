#!/usr/bin/env python3
"""运行 CRUD 测试"""

import sys
import os

# 添加 tests 目录到路径
tests_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, tests_dir)

from modules.test_customer_crud import CustomerCrudTest

def main():
    tester = CustomerCrudTest()

    if not tester.check_server():
        print("❌ 后端服务未运行")
        return False

    if not tester.login():
        print("❌ 登录失败")
        return False

    # 运行 CRUD 测试
    success = tester.run_crud_tests()

    return success

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
