#!/usr/bin/env python3
"""
STATISTICS 模块 API 测试
自动生成于: 2026-02-04T09:59:12.988041
"""

import requests
from typing import Dict, List, Any
import sys
import os

# 添加父目录到路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

from test_base import TestBase


class StatisticsTest(TestBase):
    """statistics 模块测试类"""

    def __init__(self, base_url: str = "http://localhost:7890"):
        super().__init__(base_url)
        self.module = "statistics"


    def test_get_0(self):
        """测试: 获取首页仪表板数据"""
        self.test_endpoint(
            "GET", "/statistics/dashboard",
            "获取首页仪表板数据",
            expect_status=200,
            require_auth=true
        )

    def test_get_1(self):
        """测试: 获取客户增长趋势"""
        self.test_endpoint(
            "GET", "/statistics/customer-growth",
            "获取客户增长趋势",
            expect_status=200,
            require_auth=true
        )

    def test_get_2(self):
        """测试: 获取合同续约率统计"""
        self.test_endpoint(
            "GET", "/statistics/contract-renewal",
            "获取合同续约率统计",
            expect_status=200,
            require_auth=true
        )

    def test_get_3(self):
        """测试: 获取开票金额分析"""
        self.test_endpoint(
            "GET", "/statistics/invoice-analysis",
            "获取开票金额分析",
            expect_status=200,
            require_auth=true
        )

    def test_get_4(self):
        """测试: 获取销售业绩排行"""
        self.test_endpoint(
            "GET", "/statistics/sales-performance",
            "获取销售业绩排行",
            expect_status=200,
            require_auth=true
        )

    def test_get_5(self):
        """测试: 获取产品销售统计"""
        self.test_endpoint(
            "GET", "/statistics/product-sales",
            "获取产品销售统计",
            expect_status=200,
            require_auth=true
        )

    def test_get_6(self):
        """测试: 导出数据"""
        self.test_endpoint(
            "GET", "/statistics/export",
            "导出数据",
            expect_status=200,
            require_auth=true
        )


    def run_all_tests(self):
        """运行所有测试"""
        print("\n" + "="*60)
        print(f"Statistics 模块测试")
        print("="*60 + "\n")

        self.test_get_0()
        self.test_get_1()
        self.test_get_2()
        self.test_get_3()
        self.test_get_4()
        self.test_get_5()
        self.test_get_6()

        self.print_summary()
