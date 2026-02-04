#!/usr/bin/env python3
"""CONTRACTS 模块测试"""

import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "utils"))

from test_base import TestBase

class ContractsTest(TestBase):
    """contracts 测试类"""
    
    def __init__(self, base_url="http://localhost:7890"):
        super().__init__(base_url)
        self.module = "contracts"
    
    def test_0(self):
        """创建合同"""
        self.test_endpoint("POST", "/contracts", "创建合同")
    
    def test_1(self):
        """获取合同列表"""
        self.test_endpoint("GET", "/contracts", "获取合同列表")
    
    def test_2(self):
        """获取合同详情"""
        self.test_endpoint("GET", "/contracts/test-id", "获取合同详情")
    
    def test_3(self):
        """更新合同"""
        self.test_endpoint("PATCH", "/contracts/test-id", "更新合同")
    
    def test_4(self):
        """删除合同"""
        self.test_endpoint("DELETE", "/contracts/test-id", "删除合同")
    
    def test_5(self):
        """更新合同收款状态"""
        self.test_endpoint("POST", "/contracts/test-id/update-payment-status", "更新合同收款状态")
    
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
