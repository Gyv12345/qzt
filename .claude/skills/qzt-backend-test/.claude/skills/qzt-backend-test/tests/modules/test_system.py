#!/usr/bin/env python3
"""SYSTEM 模块测试"""

import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "utils"))

from test_base import TestBase

class SystemTest(TestBase):
    """system 测试类"""
    
    def __init__(self, base_url="http://localhost:7890"):
        super().__init__(base_url)
        self.module = "system"
    
    def test_0(self):
        """获取常用语列表"""
        self.test_endpoint("GET", "/system/common-phrases", "获取常用语列表")
    
    def test_1(self):
        """创建常用语"""
        self.test_endpoint("POST", "/system/common-phrases", "创建常用语")
    
    def test_2(self):
        """更新常用语"""
        self.test_endpoint("PATCH", "/system/common-phrases/test-id", "更新常用语")
    
    def test_3(self):
        """删除常用语"""
        self.test_endpoint("DELETE", "/system/common-phrases/test-id", "删除常用语")
    
    def test_4(self):
        """搜索常用语"""
        self.test_endpoint("GET", "/system/common-phrases/search", "搜索常用语")
    
    def test_5(self):
        """增加常用语使用次数"""
        self.test_endpoint("POST", "/system/common-phrases/test-id/use", "增加常用语使用次数")
    
    def test_6(self):
        """获取收款账号列表"""
        self.test_endpoint("GET", "/system/payment-accounts", "获取收款账号列表")
    
    def test_7(self):
        """创建收款账号"""
        self.test_endpoint("POST", "/system/payment-accounts", "创建收款账号")
    
    def test_8(self):
        """获取默认收款账号"""
        self.test_endpoint("GET", "/system/payment-accounts/default", "获取默认收款账号")
    
    def test_9(self):
        """更新收款账号"""
        self.test_endpoint("PATCH", "/system/payment-accounts/test-id", "更新收款账号")
    
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
