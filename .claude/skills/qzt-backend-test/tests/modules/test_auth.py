#!/usr/bin/env python3
"""
AUTH 模块 API 测试
自动生成于: 2026-02-04T09:59:12.986957
"""

import requests
from typing import Dict, List, Any
import sys
import os

# 添加父目录到路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

from test_base import TestBase


class AuthTest(TestBase):
    """auth 模块测试类"""

    def __init__(self, base_url: str = "http://localhost:7890"):
        super().__init__(base_url)
        self.module = "auth"


    def test_post_0(self):
        """测试: 用户登录"""
        self.test_endpoint(
            "POST", "/auth/login",
            "用户登录",
            expect_status=200,
            require_auth=false
        )

    def test_post_1(self):
        """测试: 用户注册"""
        self.test_endpoint(
            "POST", "/auth/register",
            "用户注册",
            expect_status=200,
            require_auth=true
        )

    def test_get_2(self):
        """测试: 获取当前用户信息"""
        self.test_endpoint(
            "GET", "/auth/me",
            "获取当前用户信息",
            expect_status=200,
            require_auth=true
        )

    def test_post_3(self):
        """测试: 创建用户"""
        self.test_endpoint(
            "POST", "/users",
            "创建用户",
            expect_status=200,
            require_auth=true
        )

    def test_get_4(self):
        """测试: 分页查询用户列表"""
        self.test_endpoint(
            "GET", "/users",
            "分页查询用户列表",
            expect_status=200,
            require_auth=true
        )

    def test_get_5(self):
        """测试: 获取用户详情"""
        self.test_endpoint(
            "GET", "/users/test-id",
            "获取用户详情",
            expect_status=200,
            require_auth=true
        )

    def test_put_6(self):
        """测试: 更新用户"""
        self.test_endpoint(
            "PUT", "/users/test-id",
            "更新用户",
            expect_status=200,
            require_auth=true
        )

    def test_delete_7(self):
        """测试: 删除用户"""
        self.test_endpoint(
            "DELETE", "/users/test-id",
            "删除用户",
            expect_status=200,
            require_auth=true
        )

    def test_post_8(self):
        """测试: 重置用户密码"""
        self.test_endpoint(
            "POST", "/users/test-id/reset-password",
            "重置用户密码",
            expect_status=200,
            require_auth=true
        )


    def run_all_tests(self):
        """运行所有测试"""
        print("\n" + "="*60)
        print(f"Auth 模块测试")
        print("="*60 + "\n")

        self.test_post_0()
        self.test_post_1()
        self.test_get_2()
        self.test_post_3()
        self.test_get_4()
        self.test_get_5()
        self.test_put_6()
        self.test_delete_7()
        self.test_post_8()

        self.print_summary()
