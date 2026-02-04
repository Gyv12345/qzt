#!/usr/bin/env python3
"""INVOICES 模块测试"""

import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "utils"))

from test_base import TestBase

class InvoicesTest(TestBase):
    """invoices 测试类"""
    
    def __init__(self, base_url="http://localhost:7890"):
        super().__init__(base_url)
        self.module = "invoices"
    
    def test_0(self):
        """创建开票记录"""
        self.test_endpoint("POST", "/invoices", "创建开票记录")
    
    def test_1(self):
        """获取开票记录列表"""
        self.test_endpoint("GET", "/invoices", "获取开票记录列表")
    
    def test_2(self):
        """获取客户开票汇总"""
        self.test_endpoint("GET", "/invoices/customer/{customerId}/summary", "获取客户开票汇总")
    
    def test_3(self):
        """获取开票记录详情"""
        self.test_endpoint("GET", "/invoices/test-id", "获取开票记录详情")
    
    def test_4(self):
        """更新开票记录"""
        self.test_endpoint("PATCH", "/invoices/test-id", "更新开票记录")
    
    def test_5(self):
        """删除开票记录"""
        self.test_endpoint("DELETE", "/invoices/test-id", "删除开票记录")
    
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
        self.print_summary()
