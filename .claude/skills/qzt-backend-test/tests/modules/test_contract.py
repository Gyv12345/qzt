#!/usr/bin/env python3
"""
CONTRACT 模块 API 测试
自动生成于: 2026-02-04T09:59:12.987770
"""

import requests
from typing import Dict, List, Any
import sys
import os

# 添加父目录到路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

from test_base import TestBase


class ContractTest(TestBase):
    """contract 模块测试类"""

    def __init__(self, base_url: str = "http://localhost:7890"):
        super().__init__(base_url)
        self.module = "contract"


    def test_post_0(self):
        """测试: 创建合同"""
        self.test_endpoint(
            "POST", "/contracts",
            "创建合同",
            expect_status=200,
            require_auth=true
        )

    def test_get_1(self):
        """测试: 获取合同列表"""
        self.test_endpoint(
            "GET", "/contracts",
            "获取合同列表",
            expect_status=200,
            require_auth=true
        )

    def test_get_2(self):
        """测试: 获取合同详情"""
        self.test_endpoint(
            "GET", "/contracts/test-id",
            "获取合同详情",
            expect_status=200,
            require_auth=true
        )

    def test_patch_3(self):
        """测试: 更新合同"""
        self.test_endpoint(
            "PATCH", "/contracts/test-id",
            "更新合同",
            expect_status=200,
            require_auth=true
        )

    def test_delete_4(self):
        """测试: 删除合同"""
        self.test_endpoint(
            "DELETE", "/contracts/test-id",
            "删除合同",
            expect_status=200,
            require_auth=true
        )

    def test_post_5(self):
        """测试: 更新合同收款状态"""
        self.test_endpoint(
            "POST", "/contracts/test-id/update-payment-status",
            "更新合同收款状态",
            expect_status=200,
            require_auth=true
        )

    def test_get_6(self):
        """测试: 获取所有合同模板"""
        self.test_endpoint(
            "GET", "/contract-templates",
            "获取所有合同模板",
            expect_status=200,
            require_auth=true
        )

    def test_post_7(self):
        """测试: 创建合同模板"""
        self.test_endpoint(
            "POST", "/contract-templates",
            "创建合同模板",
            expect_status=200,
            require_auth=true
        )

    def test_get_8(self):
        """测试: 获取模板详情"""
        self.test_endpoint(
            "GET", "/contract-templates/test-id",
            "获取模板详情",
            expect_status=200,
            require_auth=true
        )

    def test_put_9(self):
        """测试: 更新合同模板"""
        self.test_endpoint(
            "PUT", "/contract-templates/test-id",
            "更新合同模板",
            expect_status=200,
            require_auth=true
        )

    def test_delete_10(self):
        """测试: 删除合同模板"""
        self.test_endpoint(
            "DELETE", "/contract-templates/test-id",
            "删除合同模板",
            expect_status=200,
            require_auth=true
        )

    def test_get_11(self):
        """测试: 获取模板变量定义"""
        self.test_endpoint(
            "GET", "/contract-templates/test-id/variables",
            "获取模板变量定义",
            expect_status=200,
            require_auth=true
        )

    def test_post_12(self):
        """测试: 预览合同（替换变量）"""
        self.test_endpoint(
            "POST", "/contract-templates/test-id/preview",
            "预览合同（替换变量）",
            expect_status=200,
            require_auth=true
        )


    def run_all_tests(self):
        """运行所有测试"""
        print("\n" + "="*60)
        print(f"Contract 模块测试")
        print("="*60 + "\n")

        self.test_post_0()
        self.test_get_1()
        self.test_get_2()
        self.test_patch_3()
        self.test_delete_4()
        self.test_post_5()
        self.test_get_6()
        self.test_post_7()
        self.test_get_8()
        self.test_put_9()
        self.test_delete_10()
        self.test_get_11()
        self.test_post_12()

        self.print_summary()
