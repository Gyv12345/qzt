#!/usr/bin/env python3
"""
HEALTH 模块 API 测试
自动生成于: 2026-02-04T09:59:12.986574
"""

import requests
from typing import Dict, List, Any
import sys
import os

# 添加父目录到路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

from test_base import TestBase


class HealthTest(TestBase):
    """health 模块测试类"""

    def __init__(self, base_url: str = "http://localhost:7890"):
        super().__init__(base_url)
        self.module = "health"


    def test_get_0(self):
        """测试: """
        self.test_endpoint(
            "GET", "/health",
            "",
            expect_status=200,
            require_auth=false
        )


    def run_all_tests(self):
        """运行所有测试"""
        print("\n" + "="*60)
        print(f"Health 模块测试")
        print("="*60 + "\n")

        self.test_get_0()

        self.print_summary()
