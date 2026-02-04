#!/usr/bin/env python3
"""HEALTH 模块测试"""

import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "utils"))

from test_base import TestBase

class HealthTest(TestBase):
    """health 测试类"""
    
    def __init__(self, base_url="http://localhost:7890"):
        super().__init__(base_url)
        self.module = "health"
    
    def test_0(self):
        """GET /health"""
        self.test_endpoint("GET", "/health", "GET /health")
    
    def run_all_tests(self):
        """运行所有测试"""
        print(f"\\n{'='*60}")
        print(f"{self.module.upper()} 模块测试")
        print(f"{'='*60}\\n")
        self.test_0()
        self.print_summary()
