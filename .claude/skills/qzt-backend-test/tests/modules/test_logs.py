#!/usr/bin/env python3
"""
LOGS 模块 API 测试
自动生成于: 2026-02-04T09:59:12.988727
"""

import requests
from typing import Dict, List, Any
import sys
import os

# 添加父目录到路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

from test_base import TestBase


class LogsTest(TestBase):
    """logs 模块测试类"""

    def __init__(self, base_url: str = "http://localhost:7890"):
        super().__init__(base_url)
        self.module = "logs"


    def test_get_0(self):
        """测试: 分页查询操作日志"""
        self.test_endpoint(
            "GET", "/logs/operations",
            "分页查询操作日志",
            expect_status=200,
            require_auth=true
        )

    def test_get_1(self):
        """测试: 分页查询系统日志"""
        self.test_endpoint(
            "GET", "/logs/system",
            "分页查询系统日志",
            expect_status=200,
            require_auth=true
        )

    def test_get_2(self):
        """测试: 获取日志详情"""
        self.test_endpoint(
            "GET", "/logs/test-id/test-id",
            "获取日志详情",
            expect_status=200,
            require_auth=true
        )

    def test_post_3(self):
        """测试: 导出日志为 CSV"""
        self.test_endpoint(
            "POST", "/logs/export",
            "导出日志为 CSV",
            expect_status=200,
            require_auth=true
        )


    def run_all_tests(self):
        """运行所有测试"""
        print("\n" + "="*60)
        print(f"Logs 模块测试")
        print("="*60 + "\n")

        self.test_get_0()
        self.test_get_1()
        self.test_get_2()
        self.test_post_3()

        self.print_summary()
