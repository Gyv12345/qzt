#!/usr/bin/env python3
"""AUTH 模块测试"""

import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "utils"))

from test_base import TestBase

class AuthTest(TestBase):
    """auth 测试类"""
    
    def __init__(self, base_url="http://localhost:7890"):
        super().__init__(base_url)
        self.module = "auth"
    
    def test_0(self):
        """用户登录"""
        self.test_endpoint("POST", "/auth/login", "用户登录")
    
    def test_1(self):
        """用户注册"""
        self.test_endpoint("POST", "/auth/register", "用户注册")
    
    def test_2(self):
        """获取当前用户信息"""
        self.test_endpoint("GET", "/auth/me", "获取当前用户信息")
    
    def run_all_tests(self):
        """运行所有测试"""
        print(f"\\n{'='*60}")
        print(f"{self.module.upper()} 模块测试")
        print(f"{'='*60}\\n")
        self.test_0()
        self.test_1()
        self.test_2()
        self.print_summary()
