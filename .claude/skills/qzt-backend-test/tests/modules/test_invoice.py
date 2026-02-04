#!/usr/bin/env python3
"""
INVOICE 模块 API 测试
自动生成于: 2026-02-04T09:59:12.987957
"""

import requests
from typing import Dict, List, Any
import sys
import os

# 添加父目录到路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

from test_base import TestBase


class InvoiceTest(TestBase):
    """invoice 模块测试类"""

    def __init__(self, base_url: str = "http://localhost:7890"):
        super().__init__(base_url)
        self.module = "invoice"


    def test_post_0(self):
        """测试: 创建开票记录"""
        self.test_endpoint(
            "POST", "/invoices",
            "创建开票记录",
            expect_status=200,
            require_auth=true
        )

    def test_get_1(self):
        """测试: 获取开票记录列表"""
        self.test_endpoint(
            "GET", "/invoices",
            "获取开票记录列表",
            expect_status=200,
            require_auth=true
        )

    def test_get_2(self):
        """测试: 获取客户开票汇总"""
        self.test_endpoint(
            "GET", "/invoices/customer/test-id/summary",
            "获取客户开票汇总",
            expect_status=200,
            require_auth=true
        )

    def test_get_3(self):
        """测试: 获取开票记录详情"""
        self.test_endpoint(
            "GET", "/invoices/test-id",
            "获取开票记录详情",
            expect_status=200,
            require_auth=true
        )

    def test_patch_4(self):
        """测试: 更新开票记录"""
        self.test_endpoint(
            "PATCH", "/invoices/test-id",
            "更新开票记录",
            expect_status=200,
            require_auth=true
        )

    def test_delete_5(self):
        """测试: 删除开票记录"""
        self.test_endpoint(
            "DELETE", "/invoices/test-id",
            "删除开票记录",
            expect_status=200,
            require_auth=true
        )


    def run_all_tests(self):
        """运行所有测试"""
        print("\n" + "="*60)
        print(f"Invoice 模块测试")
        print("="*60 + "\n")

        self.test_post_0()
        self.test_get_1()
        self.test_get_2()
        self.test_get_3()
        self.test_patch_4()
        self.test_delete_5()

        self.print_summary()
