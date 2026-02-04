#!/usr/bin/env python3
"""LOGS 模块测试"""

import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "utils"))

from test_base import TestBase

class LogsTest(TestBase):
    """logs 测试类"""
    
    def __init__(self, base_url="http://localhost:7890"):
        super().__init__(base_url)
        self.module = "logs"
    
    def test_0(self):
        """分页查询操作日志"""
        self.test_endpoint("GET", "/logs/operations", "分页查询操作日志")
    
    def test_1(self):
        """分页查询系统日志"""
        self.test_endpoint("GET", "/logs/system", "分页查询系统日志")
    
    def test_2(self):
        """获取日志详情"""
        self.test_endpoint("GET", "/logs/{type}/test-id", "获取日志详情")
    
    def test_3(self):
        """导出日志为 CSV"""
        self.test_endpoint("POST", "/logs/export", "导出日志为 CSV")
    
    def run_all_tests(self):
        """运行所有测试"""
        print(f"\\n{'='*60}")
        print(f"{self.module.upper()} 模块测试")
        print(f"{'='*60}\\n")
        self.test_0()
        self.test_1()
        self.test_2()
        self.test_3()
        self.print_summary()
