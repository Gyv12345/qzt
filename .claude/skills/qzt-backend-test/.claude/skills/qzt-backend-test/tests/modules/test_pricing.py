#!/usr/bin/env python3
"""PRICING 模块测试"""

import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "utils"))

from test_base import TestBase

class PricingTest(TestBase):
    """pricing 测试类"""
    
    def __init__(self, base_url="http://localhost:7890"):
        super().__init__(base_url)
        self.module = "pricing"
    
    def test_0(self):
        """创建定价规则"""
        self.test_endpoint("POST", "/pricing/rules", "创建定价规则")
    
    def test_1(self):
        """查询所有定价规则"""
        self.test_endpoint("GET", "/pricing/rules", "查询所有定价规则")
    
    def test_2(self):
        """查询单个定价规则"""
        self.test_endpoint("GET", "/pricing/rules/test-id", "查询单个定价规则")
    
    def test_3(self):
        """更新定价规则"""
        self.test_endpoint("PATCH", "/pricing/rules/test-id", "更新定价规则")
    
    def test_4(self):
        """删除定价规则"""
        self.test_endpoint("DELETE", "/pricing/rules/test-id", "删除定价规则")
    
    def test_5(self):
        """查询产品的定价规则"""
        self.test_endpoint("GET", "/pricing/products/{productId}/rules", "查询产品的定价规则")
    
    def test_6(self):
        """计算服务价格"""
        self.test_endpoint("POST", "/pricing/calculate", "计算服务价格")
    
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
