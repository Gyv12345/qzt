#!/usr/bin/env python3
"""CUSTOMERS 模块测试"""

import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "utils"))

from test_base import TestBase

class CustomersTest(TestBase):
    """customers 测试类"""
    
    def __init__(self, base_url="http://localhost:7890"):
        super().__init__(base_url)
        self.module = "customers"
    
    def test_0(self):
        """为公司添加联系人（不存在则创建）"""
        self.test_endpoint("POST", "/customers/{customerId}/contacts", "为公司添加联系人（不存在则创建）")
    
    def test_1(self):
        """获取公司的所有联系人"""
        self.test_endpoint("GET", "/customers/{customerId}/contacts", "获取公司的所有联系人")
    
    def test_2(self):
        """关联已有联系人"""
        self.test_endpoint("POST", "/customers/{customerId}/contacts/link", "关联已有联系人")
    
    def test_3(self):
        """更新联系人角色"""
        self.test_endpoint("PUT", "/customers/{customerId}/contacts/{contactId}", "更新联系人角色")
    
    def test_4(self):
        """取消关联（标记为离职）"""
        self.test_endpoint("DELETE", "/customers/{customerId}/contacts/{contactId}", "取消关联（标记为离职）")
    
    def test_5(self):
        """创建客户"""
        self.test_endpoint("POST", "/customers", "创建客户")
    
    def test_6(self):
        """获取客户列表"""
        self.test_endpoint("GET", "/customers", "获取客户列表")
    
    def test_7(self):
        """获取客户详情"""
        self.test_endpoint("GET", "/customers/test-id", "获取客户详情")
    
    def test_8(self):
        """更新客户"""
        self.test_endpoint("PATCH", "/customers/test-id", "更新客户")
    
    def test_9(self):
        """删除客户"""
        self.test_endpoint("DELETE", "/customers/test-id", "删除客户")
    
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
