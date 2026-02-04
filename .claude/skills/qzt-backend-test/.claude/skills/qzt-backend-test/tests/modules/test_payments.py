#!/usr/bin/env python3
"""PAYMENTS 模块测试"""

import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "utils"))

from test_base import TestBase

class PaymentsTest(TestBase):
    """payments 测试类"""
    
    def __init__(self, base_url="http://localhost:7890"):
        super().__init__(base_url)
        self.module = "payments"
    
    def test_0(self):
        """创建收款记录"""
        self.test_endpoint("POST", "/payments", "创建收款记录")
    
    def test_1(self):
        """获取收款记录列表"""
        self.test_endpoint("GET", "/payments", "获取收款记录列表")
    
    def test_2(self):
        """获取合同的收款记录"""
        self.test_endpoint("GET", "/payments/contract/{contractId}", "获取合同的收款记录")
    
    def test_3(self):
        """获取收款记录详情"""
        self.test_endpoint("GET", "/payments/test-id", "获取收款记录详情")
    
    def test_4(self):
        """更新收款记录"""
        self.test_endpoint("PATCH", "/payments/test-id", "更新收款记录")
    
    def test_5(self):
        """删除收款记录"""
        self.test_endpoint("DELETE", "/payments/test-id", "删除收款记录")
    
    def test_6(self):
        """确认收款"""
        self.test_endpoint("POST", "/payments/test-id/confirm", "确认收款")
    
    def run_all_tests(self):
        """运行所有测试"""
        print(f"\\n{'='*60}")
        print(f"{self.module.upper()} 模块测试")
        print(f"{'='*60}\\n")
        self.test_0()
        self.test_1()
        self.test_2()
        self.test_3()
        self.test_4()
        self.test_5()
        self.test_6()
        self.print_summary()
