#!/usr/bin/env python3
"""PRODUCTS 模块测试"""

import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "utils"))

from test_base import TestBase

class ProductsTest(TestBase):
    """products 测试类"""
    
    def __init__(self, base_url="http://localhost:7890"):
        super().__init__(base_url)
        self.module = "products"
    
    def test_0(self):
        """创建产品"""
        self.test_endpoint("POST", "/products", "创建产品")
    
    def test_1(self):
        """获取产品列表"""
        self.test_endpoint("GET", "/products", "获取产品列表")
    
    def test_2(self):
        """获取产品详情"""
        self.test_endpoint("GET", "/products/test-id", "获取产品详情")
    
    def test_3(self):
        """更新产品"""
        self.test_endpoint("PATCH", "/products/test-id", "更新产品")
    
    def test_4(self):
        """删除产品"""
        self.test_endpoint("DELETE", "/products/test-id", "删除产品")
    
    def test_5(self):
        """创建产品流程"""
        self.test_endpoint("POST", "/products/flows", "创建产品流程")
    
    def test_6(self):
        """获取产品流程列表"""
        self.test_endpoint("GET", "/products/flows", "获取产品流程列表")
    
    def test_7(self):
        """获取产品流程详情"""
        self.test_endpoint("GET", "/products/flows/test-id", "获取产品流程详情")
    
    def test_8(self):
        """更新产品流程"""
        self.test_endpoint("PATCH", "/products/flows/test-id", "更新产品流程")
    
    def test_9(self):
        """删除产品流程"""
        self.test_endpoint("DELETE", "/products/flows/test-id", "删除产品流程")
    
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
        self.test_7()
        self.test_8()
        self.test_9()
        self.print_summary()
