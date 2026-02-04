#!/usr/bin/env python3
"""
SYSTEM 模块 API 测试
自动生成于: 2026-02-04T09:59:12.988304
"""

import requests
from typing import Dict, List, Any
import sys
import os

# 添加父目录到路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

from test_base import TestBase


class SystemTest(TestBase):
    """system 模块测试类"""

    def __init__(self, base_url: str = "http://localhost:7890"):
        super().__init__(base_url)
        self.module = "system"


    def test_get_0(self):
        """测试: 获取常用语列表"""
        self.test_endpoint(
            "GET", "/system/common-phrases",
            "获取常用语列表",
            expect_status=200,
            require_auth=true
        )

    def test_post_1(self):
        """测试: 创建常用语"""
        self.test_endpoint(
            "POST", "/system/common-phrases",
            "创建常用语",
            expect_status=200,
            require_auth=true
        )

    def test_patch_2(self):
        """测试: 更新常用语"""
        self.test_endpoint(
            "PATCH", "/system/common-phrases/test-id",
            "更新常用语",
            expect_status=200,
            require_auth=true
        )

    def test_delete_3(self):
        """测试: 删除常用语"""
        self.test_endpoint(
            "DELETE", "/system/common-phrases/test-id",
            "删除常用语",
            expect_status=200,
            require_auth=true
        )

    def test_get_4(self):
        """测试: 搜索常用语"""
        self.test_endpoint(
            "GET", "/system/common-phrases/search",
            "搜索常用语",
            expect_status=200,
            require_auth=true
        )

    def test_post_5(self):
        """测试: 增加常用语使用次数"""
        self.test_endpoint(
            "POST", "/system/common-phrases/test-id/use",
            "增加常用语使用次数",
            expect_status=200,
            require_auth=true
        )

    def test_get_6(self):
        """测试: 获取收款账号列表"""
        self.test_endpoint(
            "GET", "/system/payment-accounts",
            "获取收款账号列表",
            expect_status=200,
            require_auth=true
        )

    def test_post_7(self):
        """测试: 创建收款账号"""
        self.test_endpoint(
            "POST", "/system/payment-accounts",
            "创建收款账号",
            expect_status=200,
            require_auth=true
        )

    def test_get_8(self):
        """测试: 获取默认收款账号"""
        self.test_endpoint(
            "GET", "/system/payment-accounts/default",
            "获取默认收款账号",
            expect_status=200,
            require_auth=true
        )

    def test_patch_9(self):
        """测试: 更新收款账号"""
        self.test_endpoint(
            "PATCH", "/system/payment-accounts/test-id",
            "更新收款账号",
            expect_status=200,
            require_auth=true
        )

    def test_delete_10(self):
        """测试: 删除收款账号"""
        self.test_endpoint(
            "DELETE", "/system/payment-accounts/test-id",
            "删除收款账号",
            expect_status=200,
            require_auth=true
        )

    def test_patch_11(self):
        """测试: 设置默认账号"""
        self.test_endpoint(
            "PATCH", "/system/payment-accounts/test-id/default",
            "设置默认账号",
            expect_status=200,
            require_auth=true
        )

    def test_get_12(self):
        """测试: 获取所有系统配置"""
        self.test_endpoint(
            "GET", "/system/config",
            "获取所有系统配置",
            expect_status=200,
            require_auth=true
        )

    def test_get_13(self):
        """测试: 获取公开配置（无需认证）"""
        self.test_endpoint(
            "GET", "/system/config/public",
            "获取公开配置（无需认证）",
            expect_status=200,
            require_auth=true
        )

    def test_get_14(self):
        """测试: 获取基础配置（系统名称、Logo等）"""
        self.test_endpoint(
            "GET", "/system/config/basic",
            "获取基础配置（系统名称、Logo等）",
            expect_status=200,
            require_auth=true
        )

    def test_get_15(self):
        """测试: 获取单个配置"""
        self.test_endpoint(
            "GET", "/system/config/test-id",
            "获取单个配置",
            expect_status=200,
            require_auth=true
        )

    def test_put_16(self):
        """测试: 创建或更新配置"""
        self.test_endpoint(
            "PUT", "/system/config/test-id",
            "创建或更新配置",
            expect_status=200,
            require_auth=true
        )

    def test_delete_17(self):
        """测试: 删除配置"""
        self.test_endpoint(
            "DELETE", "/system/config/test-id",
            "删除配置",
            expect_status=200,
            require_auth=true
        )

    def test_post_18(self):
        """测试: 批量更新配置"""
        self.test_endpoint(
            "POST", "/system/config/batch",
            "批量更新配置",
            expect_status=200,
            require_auth=true
        )


    def run_all_tests(self):
        """运行所有测试"""
        print("\n" + "="*60)
        print(f"System 模块测试")
        print("="*60 + "\n")

        self.test_get_0()
        self.test_post_1()
        self.test_patch_2()
        self.test_delete_3()
        self.test_get_4()
        self.test_post_5()
        self.test_get_6()
        self.test_post_7()
        self.test_get_8()
        self.test_patch_9()
        self.test_delete_10()
        self.test_patch_11()
        self.test_get_12()
        self.test_get_13()
        self.test_get_14()
        self.test_get_15()
        self.test_put_16()
        self.test_delete_17()
        self.test_post_18()

        self.print_summary()
