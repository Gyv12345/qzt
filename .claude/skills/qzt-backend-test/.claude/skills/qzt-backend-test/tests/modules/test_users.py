#!/usr/bin/env python3
"""USERS 模块测试"""

import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "utils"))

from test_base import TestBase

class UsersTest(TestBase):
    """users 测试类"""
    
    def __init__(self, base_url="http://localhost:7890"):
        super().__init__(base_url)
        self.module = "users"
    
    def test_0(self):
        """创建用户"""
        self.test_endpoint("POST", "/users", "创建用户")
    
    def test_1(self):
        """分页查询用户列表"""
        self.test_endpoint("GET", "/users", "分页查询用户列表")
    
    def test_2(self):
        """获取用户详情"""
        self.test_endpoint("GET", "/users/test-id", "获取用户详情")
    
    def test_3(self):
        """更新用户"""
        self.test_endpoint("PUT", "/users/test-id", "更新用户")
    
    def test_4(self):
        """删除用户"""
        self.test_endpoint("DELETE", "/users/test-id", "删除用户")
    
    def test_5(self):
        """重置用户密码"""
        self.test_endpoint("POST", "/users/test-id/reset-password", "重置用户密码")
    
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
