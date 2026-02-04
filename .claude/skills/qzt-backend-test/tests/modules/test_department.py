#!/usr/bin/env python3
"""
DEPARTMENT 模块 API 测试
自动生成于: 2026-02-04T09:59:12.988653
"""

import requests
from typing import Dict, List, Any
import sys
import os

# 添加父目录到路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

from test_base import TestBase


class DepartmentTest(TestBase):
    """department 模块测试类"""

    def __init__(self, base_url: str = "http://localhost:7890"):
        super().__init__(base_url)
        self.module = "department"


    def test_post_0(self):
        """测试: 创建部门"""
        self.test_endpoint(
            "POST", "/departments",
            "创建部门",
            expect_status=200,
            require_auth=true
        )

    def test_get_1(self):
        """测试: 获取部门树形结构"""
        self.test_endpoint(
            "GET", "/departments",
            "获取部门树形结构",
            expect_status=200,
            require_auth=true
        )

    def test_get_2(self):
        """测试: 获取部门详情"""
        self.test_endpoint(
            "GET", "/departments/test-id",
            "获取部门详情",
            expect_status=200,
            require_auth=true
        )

    def test_patch_3(self):
        """测试: 更新部门"""
        self.test_endpoint(
            "PATCH", "/departments/test-id",
            "更新部门",
            expect_status=200,
            require_auth=true
        )

    def test_delete_4(self):
        """测试: 删除部门"""
        self.test_endpoint(
            "DELETE", "/departments/test-id",
            "删除部门",
            expect_status=200,
            require_auth=true
        )

    def test_get_5(self):
        """测试: 获取部门下的用户列表"""
        self.test_endpoint(
            "GET", "/departments/test-id/users",
            "获取部门下的用户列表",
            expect_status=200,
            require_auth=true
        )


    def run_all_tests(self):
        """运行所有测试"""
        print("\n" + "="*60)
        print(f"Department 模块测试")
        print("="*60 + "\n")

        self.test_post_0()
        self.test_get_1()
        self.test_get_2()
        self.test_patch_3()
        self.test_delete_4()
        self.test_get_5()

        self.print_summary()
