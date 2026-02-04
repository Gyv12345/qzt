#!/usr/bin/env python3
"""PRODUCT_PACKAGES 模块测试"""

import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "utils"))

from test_base import TestBase

class ProductPackagesTest(TestBase):
    """product_packages 测试类"""
    
    def __init__(self, base_url="http://localhost:7890"):
        super().__init__(base_url)
        self.module = "product_packages"
    
    def test_0(self):
        """获取所有产品套餐"""
        self.test_endpoint("GET", "/product-packages", "获取所有产品套餐")
    
    def test_1(self):
        """创建产品套餐"""
        self.test_endpoint("POST", "/product-packages", "创建产品套餐")
    
    def test_2(self):
        """获取套餐详情"""
        self.test_endpoint("GET", "/product-packages/test-id", "获取套餐详情")
    
    def test_3(self):
        """更新产品套餐"""
        self.test_endpoint("PUT", "/product-packages/test-id", "更新产品套餐")
    
    def test_4(self):
        """删除产品套餐"""
        self.test_endpoint("DELETE", "/product-packages/test-id", "删除产品套餐")
    
    def test_5(self):
        """添加产品到套餐"""
        self.test_endpoint("POST", "/product-packages/test-id/products", "添加产品到套餐")
    
    def test_6(self):
        """从套餐中移除产品"""
        self.test_endpoint("DELETE", "/product-packages/test-id/products/{productId}", "从套餐中移除产品")
    
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
