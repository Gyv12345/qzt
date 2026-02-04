#!/usr/bin/env python3
"""STATISTICS 模块测试"""

import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "utils"))

from test_base import TestBase

class StatisticsTest(TestBase):
    """statistics 测试类"""
    
    def __init__(self, base_url="http://localhost:7890"):
        super().__init__(base_url)
        self.module = "statistics"
    
    def test_0(self):
        """获取首页仪表板数据"""
        self.test_endpoint("GET", "/statistics/dashboard", "获取首页仪表板数据")
    
    def test_1(self):
        """获取客户增长趋势"""
        self.test_endpoint("GET", "/statistics/customer-growth", "获取客户增长趋势")
    
    def test_2(self):
        """获取合同续约率统计"""
        self.test_endpoint("GET", "/statistics/contract-renewal", "获取合同续约率统计")
    
    def test_3(self):
        """获取开票金额分析"""
        self.test_endpoint("GET", "/statistics/invoice-analysis", "获取开票金额分析")
    
    def test_4(self):
        """获取销售业绩排行"""
        self.test_endpoint("GET", "/statistics/sales-performance", "获取销售业绩排行")
    
    def test_5(self):
        """获取产品销售统计"""
        self.test_endpoint("GET", "/statistics/product-sales", "获取产品销售统计")
    
    def test_6(self):
        """导出数据"""
        self.test_endpoint("GET", "/statistics/export", "导出数据")
    
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
