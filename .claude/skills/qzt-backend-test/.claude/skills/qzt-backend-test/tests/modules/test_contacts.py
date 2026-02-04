#!/usr/bin/env python3
"""CONTACTS 模块测试"""

import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "utils"))

from test_base import TestBase

class ContactsTest(TestBase):
    """contacts 测试类"""
    
    def __init__(self, base_url="http://localhost:7890"):
        super().__init__(base_url)
        self.module = "contacts"
    
    def test_0(self):
        """创建联系人"""
        self.test_endpoint("POST", "/contacts", "创建联系人")
    
    def test_1(self):
        """查询联系人列表"""
        self.test_endpoint("GET", "/contacts", "查询联系人列表")
    
    def test_2(self):
        """获取联系人详情"""
        self.test_endpoint("GET", "/contacts/test-id", "获取联系人详情")
    
    def test_3(self):
        """更新联系人"""
        self.test_endpoint("PUT", "/contacts/test-id", "更新联系人")
    
    def test_4(self):
        """删除联系人"""
        self.test_endpoint("DELETE", "/contacts/test-id", "删除联系人")
    
    def test_5(self):
        """通过手机号查找联系人"""
        self.test_endpoint("GET", "/contacts/phone/{phone}", "通过手机号查找联系人")
    
    def test_6(self):
        """关联公司"""
        self.test_endpoint("POST", "/contacts/test-id/companies", "关联公司")
    
    def test_7(self):
        """取消关联公司"""
        self.test_endpoint("DELETE", "/contacts/test-id/companies/{customerId}", "取消关联公司")
    
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
        self.print_summary()
